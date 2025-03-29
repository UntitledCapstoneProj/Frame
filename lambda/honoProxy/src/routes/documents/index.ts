import { createRoute } from "@hono/zod-openapi";
import { errorResponseSchema } from "../sharedSchemas";
import { paginationSchema } from "./schema";
import { z } from "@hono/zod-openapi";
import {
  deleteSchema,
  createDocumentSchema,
  validateImageResultSchema,
} from "./schema";

export const getDocumentsRoute = createRoute({
  method: "get",
  path: "/document",
  request: {
    query: paginationSchema.openapi({
      example: { limit: "1", offset: "10" },
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
            limit: z.number(),
            offset: z.number(),
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
});

export const getDocumentByIdRoute = createRoute({
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
    400: {
      description: "Bad Request",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

export const createDocumentRoute = createRoute({
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
});

export const deleteDocumentRoute = createRoute({
  method: "delete",
  path: "/delete/{id}",
  request: {
    params: deleteSchema,
    description: "Deletes a specific document by ID",
  },
  responses: {
    200: {
      description: "Successful deletion of the document",
      content: {
        "application/json": {
          schema: z.object({
            id: z.number(),
            success: z.boolean(),
            message: z.string(),
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
});
