import { createRoute } from "@hono/zod-openapi";
import {
  searchJSONSchema,
  searchMultipartSchema,
  searchResultSchema,
} from "./schema";
import { apiKeySchema, errorResponseSchema } from "../sharedSchemas";
import { z } from "@hono/zod-openapi";

export const searchRoute = createRoute({
  method: "post",
  path: "/search",
  description: "Search for documents using an image or description",
  request: {
    headers: z.object({
      "x-api-key": apiKeySchema,
    }),
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
            hits: searchResultSchema,
            count: z.number(),
          }),
        },
      },
    },
    400: {
      description: "Bad Request",
      content: {
        "application/json": {
          schema: errorResponseSchema,
          example: { error: "Bad Request" },
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
