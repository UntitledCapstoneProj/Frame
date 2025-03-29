import { RouteHandler } from "@hono/zod-openapi";
import { SearchJSONType, SearchMulitpartType } from "./schema";
import {
  deleteImageFromS3,
  uploadImageToS3,
  invokeSearchLambda,
} from "./services";
import { searchRoute } from ".";

export const searchHandler: RouteHandler<typeof searchRoute> = async (c) => {
  let imageKey: string | null = null;
  try {
    const contentType = c.req.header("Content-Type") || "";
    let message: SearchJSONType | undefined;

    if (contentType.startsWith("application/json")) {
      const jsonData = c.req.valid("json");
      message = jsonData;
    } else if (contentType.startsWith("multipart/form-data")) {
      const { image, desc, threshold, topK } = c.req.valid(
        "form",
      ) as SearchMulitpartType;

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
};
