import { handle } from "hono/aws-lambda";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  createDocumentSchema,
  validateImageResultSchema,
  errorResponseSchema,
  validateImage,
  documentSearchSchema,
  paginationSchema,
} from "./types";

const app = new OpenAPIHono();

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
    },
  }),
  (c) => {
    const { page, perPage } = c.req.valid("query");
    const documents = [
      { id: "1", title: "Document 1", content: "Content for document 1" },
      { id: "2", title: "Document 2", content: "Content for document 2" },
    ];
    return c.json({
      documents,
      page,
      perPage,
      total: documents.length,
    });
  },
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

      // add to queue

      return c.json(validatedImages, 200);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : String(e) }, 400);
    }
  },
);

app.openapi(
  createRoute({
    method: "delete",
    path: "/document/:id",
    description: "Performs a delete request on provided id in the path.",
    request: {
      params: z.object({
        id: z.string().openapi({ param: { name: "id", in: "path" } }),
      }),
    },
    responses: {
      200: {
        description: "Successful delete request",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean() }),
          },
        },
      },
    },
  }),
  (c) => {
    return c.json({ success: true }, 200);
  },
);

app.openapi(
  createRoute({
    method: "post",
    path: "/search",
    request: {
      body: {
        content: {
          "application/json": {
            schema: documentSearchSchema,
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
    },
  }),
  (c) => {
    return c.json({ results: [] });
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
          url: '/openapi.json', // ensure your OpenAPI spec is available at this endpoint
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

export const handler = handle(app);
