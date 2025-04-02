import { createRoute } from "@hono/zod-openapi";
import {
  errorResponseSchema,
  apiKeySchema,
  zodErrorResponseSchema,
} from "../sharedSchemas";
import { z } from "@hono/zod-openapi";
import {
  idPathSchema,
  paginationSchema,
  validateDocResultSchema,
  documentReturnSchema,
  documentSchema,
} from "./schema";

export const getDocumentsRoute = createRoute({
  method: "get",
  tags: ["documents"],
  path: "/document",
  description: "Get a paginated list of documents",
  request: {
    headers: z.object({
      "x-api-key": apiKeySchema,
    }),
    query: paginationSchema.describe("Pagination query parameters"),
    description: "Retrieve a paginated list of documents.",
    example: {
      limit: 10,
      offset: 20,
    },
  },
  responses: {
    200: {
      description: "Successful retrieval of documents",
      content: {
        "application/json": {
          schema: z.object({
            documents: z.array(documentReturnSchema),
            limit: z.number(),
            offset: z.number(),
            count: z.number(),
          }),
          example: {
            documents: [
              {
                id: 1,
                url: "https://example.com/cezanne.png",
                description: "An painting of the Mont Sainte-Victoire",
                metadata: {
                  title: "Mont Sainte-Victoire",
                  medium: "oil on canvas",
                  date: "1902-04",
                },
              },
              {
                id: 2,
                url: "https://example.com/pic2.png",
                description: null,
                metadata: null,
              },
            ],
            limit: 2,
            offset: 0,
            count: 2,
          },
        },
      },
    },
    400: {
      description: "Bad Request",
      content: {
        "application/json": {
          schema: zodErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Server Error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
          example: { error: "Internal Server Error." },
        },
      },
    },
  },
});

export const getDocumentByIdRoute = createRoute({
  method: "get",
  path: "/document/{id}",
  tags: ["documents"],
  description: "Find a document by an ID",
  request: {
    headers: z.object({
      "x-api-key": apiKeySchema,
    }),
    params: idPathSchema.describe("A unique identifier for the document."),
    example: "123",
    description:
      "Retrieve a document by its numeric ID. The ID must be a non-negative integer.",
  },
  responses: {
    200: {
      description: "The document was found and returned successfully.",
      content: {
        "application/json": {
          schema: z.object({
            document: documentReturnSchema,
          }),
          example: {
            document: {
              id: 7,
              url: "https://example.com/monkeyselfie.jpeg",
              description: "An image of monkey takign a selfie.",
              metadata: {
                tags: ["monkey", "animal", "selfie"],
              },
            },
          },
        },
      },
    },
    400: {
      description: "Bad Request",
      content: {
        "application/json": {
          schema: zodErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Document Not Found",
      content: {
        "application/json": {
          schema: errorResponseSchema,
          example: { error: "Document Not Found" },
        },
      },
    },
    500: {
      description: "Bad Request",
      content: {
        "application/json": {
          schema: errorResponseSchema,
          example: { error: "Internal Server Error." },
        },
      },
    },
  },
});

export const createDocumentRoute = createRoute({
  method: "post",
  path: "/document",
  tags: ["documents"],
  description: "Add new document(s)",
  request: {
    headers: z.object({
      "x-api-key": apiKeySchema,
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({ documents: z.array(documentSchema) }),
          example: {
            documents: [
              {
                url: "https://example.com/colosseum.jpg",
                description:
                  "A photograph of tourists strolling around the Colosseum on a summer day.",
                metadata: {
                  title: "The Colosseum",
                  photographer: "John Doe",
                  altText: "A photo of the Colosseum in Rome",
                },
              },
              {
                url: "https://example.com/pantheon.jpg",
              },
              {
                description: "An image with no URL, only a description",
              },
            ],
          },
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
          schema: z.array(validateDocResultSchema),
          example: [
            {
              url: "https://example.com/image1.jpg",
              metadata: {
                altText: "A photo of the Colosseum in Rome",
              },
              success: true,
            },
            {
              description: "An image with no URL, only a description",
              metadata: null,
              success: true,
            },
            {
              url: null,
              description: null,
              success: false,
              errors: "At least one of url or description must be provided.",
            },
          ],
        },
      },
    },
    400: {
      description: "Bad Request",
      content: {
        "application/json": {
          schema: zodErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Server Error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
          example: { error: "Internal Server Error." },
        },
      },
    },
  },
});

export const deleteDocumentRoute = createRoute({
  method: "delete",
  path: "/document/{id}",
  tags: ["documents"],
  description: "Deleteing a document",
  request: {
    headers: z.object({
      "x-api-key": apiKeySchema,
    }),
    params: idPathSchema.describe("A unique identifier for the document."),
    example: "123",
    description:
      "Delete a document by its numeric ID. ID must be a non-negative integer.",
  },
  responses: {
    200: {
      description: "Document successfully deleted",
      content: {
        "application/json": {
          schema: z.object({
            document: documentReturnSchema,
          }),
          example: {
            document: {
              id: 42,
              url: "https://example.com/monalisa.jpeg",
              description: "Image of a sitting woman.",
              metadata: {
                title: "Mona Lisa",
                artist: "Leonardo da Vinci",
              },
            },
          },
        },
      },
    },
    400: {
      description: "Bad Request",
      content: {
        "application/json": {
          schema: zodErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Document not found",
      content: {
        "application/json": {
          schema: errorResponseSchema,
          example: { error: "Document Not Found" },
        },
      },
    },
    500: {
      description: "Server Error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
          example: { error: "Internal Server Error." },
        },
      },
    },
  },
});
