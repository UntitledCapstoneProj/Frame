import { handle } from "hono/aws-lambda";
import {
  invokeSearchLambda,
  uploadImageToS3,
  deleteImageFromS3,
  pgGetDocuments,
} from "./utils";

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import {
  createDocumentSchema,
  validateImageResultSchema,
  errorResponseSchema,
  validateImage,
  searchJSONSchema,
  searchMultipartSchema,
  paginationSchema,
  SearchMessageType,
} from "./types";
import { sendToSQS } from "./utils";

const app = new OpenAPIHono();

app.use(cors({ origin: "*" }));

app.openapi(
  createRoute({
    method: "get",
    path: "/document",
    request: {
      query: paginationSchema.openapi({
        example: { page: "1", perPage: "10" },
      }),
      description: "Retrieves a paginated list of documents",
    },
    responses: {
      200: {
        description: "Successful retrieval of documents",
        content: {
          "application/json": {
            schema: z.object({
              documents: z.array(z.object({})),
              page: z.number(),
              perPage: z.number(),
              total: z.number(),
            }),
          },
        },
      },
      400: {
        description: "Bad Request",
        content: {
          "application/json": {
            schema: errorResponseSchema,
          },
        },
      },
    },
  }),
  async (c) => {
    try {
      const { page, perPage } = c.req.valid("query");
      const documents = await pgGetDocuments(perPage, page);

      return c.json({
        documents,
        page,
        perPage,
        total: documents.length,
      }, 200);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : String(e) }, 400);
    }
  }
);

app.openapi(
  createRoute({
    method: "get",
    path: "/document/:id",
    request: {
      params: z.object({
        id: z.string().openapi({ param: { name: "id", in: "path" } }),
      }),
      description: "Retrieves a specific document by ID",
    },
    responses: {
      200: {
        description: "Successful retrieval of the document",
        content: {
          "application/json": {
            schema: z.object({}),
          },
        },
      },
    },
  }),
  (c) => {
    const { id } = c.req.valid("param");
    const document = {
      id,
      title: `Document ${id}`,
      content: `Content for document ${id}`,
    };
    return c.json(document);
  },
);

app.openapi(
  createRoute({
    method: "post",
    path: "/document",
    request: {
      body: {
        content: {
          "application/json": {
            schema: createDocumentSchema,
          },
        },
        description:
          "Receives images via URL and optional descriptions and queues them for embedding.",
      },
    },
    responses: {
      200: {
        description: "Validation results of images.",
        content: {
          "application/json": {
            schema: z.array(validateImageResultSchema),
          },
        },
      },
      400: {
        description: "Bad Request",
        content: {
          "application/json": {
            schema: errorResponseSchema,
          },
        },
      },
    },
  }),
  async (c) => {
    try {
      const { images } = c.req.valid("json");
      const validatedImages = await Promise.all(images.map(validateImage));
      const sqsResults = await Promise.allSettled(
        validatedImages.map(sendToSQS),
      );

      const messageStatuses = sqsResults.map((result, i) => {
        const currImg = validatedImages[i];

        return {
          url: currImg.url,
          desc: currImg.desc,
          success: result.status === "fulfilled" ? true : false,
          errors: "reason" in result ? result.reason : "",
        };
      });

      return c.json(messageStatuses, 200);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : String(e) }, 400);
    }
  },
);

// Middleware for parsing multipart form data before zod validation.
app.use("/search", async (c, next) => {
  if (c.req.header("Content-Type")?.startsWith("multipart/form-data")) {
    await c.req.parseBody();
    return await next();
  }
  return await next();
});

app.openapi(
  createRoute({
    method: "post",
    path: "/search",
    request: {
      body: {
        content: {
          "application/json": {
            schema: searchJSONSchema,
          },
          "multipart/form-data": {
            schema: searchMultipartSchema,
          },
        },
        description:
          "This route performs a search using a document that can include a URL, a description, or both. The JSON body must have at least one of these fields. It also accepts two optional parameters: threshold (0.0 to 1.0, default 0) and topK (default 10) to fine-tune the search. ",
      },
    },
    responses: {
      200: {
        description: "Successful search results",
        content: {
          "application/json": {
            schema: z.object({
              results: z.array(z.any()),
            }),
          },
        },
      },
      400: {
        description: "Bad Request",
        content: {
          "application/json": {
            schema: errorResponseSchema,
          },
        },
      },
      500: {
        description: "Server Error",
        content: {
          "application/json": {
            schema: errorResponseSchema,
          },
        },
      },
    },
  }),
  async (c) => {
    let imageKey: string | null = null;
    try {
      const contentType = c.req.header("Content-Type") || "";
      let message: SearchMessageType | undefined;

      if (contentType.startsWith("application/json")) {
        const jsonData = c.req.valid("json");
        message = jsonData;
      } else if (contentType.startsWith("multipart/form-data")) {
        const { image, desc, threshold, topK } = c.req.valid("form") as z.infer<
          typeof searchMultipartSchema
        >;

        message = {
          ...(desc && { desc }),
          threshold,
          topK,
        };

        if (image && image.size > 0) {
          const { url, key } = await uploadImageToS3(image);
          imageKey = key;
          message = { ...message, url };
        }
      }

      if (message === undefined) {
        throw new Error("Error message undefined");
      }
      const payloadString = await invokeSearchLambda(message);

      return c.json({ results: payloadString }, 200);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 500);
      } else {
        return c.json({ error: "Internal Server Error" }, 500);
      }
    } finally {
      if (imageKey) {
        await deleteImageFromS3(imageKey);
      }
    }
  },
);

app.get("/doc", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Swagger UI</title>
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
      <script>
        SwaggerUIBundle({
          url: '/openapi.json',
          dom_id: '#swagger-ui'
        });
      </script>
    </body>
    </html>
  `);
});

app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "My API",
  },
});

app.all("*", (c) => {
  return c.text("404 Not Found", 404);
});

export const handler = handle(app);
