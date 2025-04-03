import dotenv from "dotenv";
import { Client } from "../index";

dotenv.config();

const BASE_URL = process.env.BASE_URL || "";
const API_KEY = process.env.API_KEY || "";

let client: Client;

// IMPORTANT TESTING NOTE:
// Some tests rely on documents existing in the DB to work, e.g. getById, deleteById
// If time allows, change tests to create a document instead

beforeAll(() => {
  client = new Client({ apiKey: API_KEY, baseURL: BASE_URL });
});

describe("SDK Client initialization", () => {
  test("should initialize client correctly", () => {
    expect(client).toBeDefined();
  });

  test("should handle invalid API key", async () => {
    const invalidClient = new Client({
      apiKey: "invalid",
      baseURL: BASE_URL,
    });
    const response = await invalidClient.getDocuments();

    expect(response).toMatchObject({
      status: 403,
      ok: false,
      error: "Forbidden",
    });
  });

  test("should return an error for wrong endpoint", async () => {
    const invalidClient = new Client({
      apiKey: API_KEY,
      baseURL: "http://invalid-url",
    });
    const response = await invalidClient.getDocuments();

    expect(response).toMatchObject({
      status: 0,
      ok: false,
      error: expect.any(String),
    });

    if (!response.ok) {
      expect(response.error).toBe("Unknown client error occurred");
    } else {
      throw new Error(
        `Expected a client error response (0) but got ${response.status}`
      );
    }
  });
});

describe("getDocuments", () => {
  test("should fetch all documents when no arguments passed", async () => {
    const response = await client.getDocuments();

    if (response.ok) {
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("documents");
      expect(response.data.limit).toBe(20);
      expect(response.data.offset).toBe(0);
    } else {
      throw new Error(`Expected a 200 response but got ${response.status}`);
    }
  });

  test("should fetch documents with limit and offset", async () => {
    const response = await client.getDocuments({ limit: 1, offset: 1 });

    if (response.ok) {
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("documents");
      expect(response.data.limit).toBe(1);
      expect(response.data.offset).toBe(1);
    } else {
      throw new Error(`Expected a 200 response but got ${response.status}`);
    }
  });

  test("should fetch documents with just limit", async () => {
    const response = await client.getDocuments({ limit: 1 });

    if (response.ok) {
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("documents");
      expect(response.data.limit).toBe(1);
      expect(response.data.offset).toBe(0);
    } else {
      throw new Error(`Expected a 200 response but got ${response.status}`);
    }
  });

  test("should fetch documents with string arguments", async () => {
    const response = await client.getDocuments({ limit: "1", offset: "1" });

    if (response.ok) {
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("documents");
      expect(response.data.limit).toBe(1);
      expect(response.data.offset).toBe(1);
    } else {
      throw new Error(`Expected a 200 response but got ${response.status}`);
    }
  });

  test("should fetch documents even when extra query params are used", async () => {
    const response = await client.getDocuments({
      limit: "1",
      offset: "1",
      xyz: "something",
    });

    if (response.ok) {
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("documents");
      expect(response.data.limit).toBe(1);
      expect(response.data.offset).toBe(1);
    } else {
      throw new Error(`Expected a 200 response but got ${response.status}`);
    }
  });

  test("negative limit/offset are considered invalid", async () => {
    const response = await client.getDocuments({ limit: -1, offset: -1 });

    if (!response.ok) {
      expect(response.status).toBe(400);
      if (typeof response.error !== "string" && "name" in response.error) {
        expect(response.error.name).toBe("ZodError");
      } else {
        throw new Error(`Expected a ZodError but got a server or client error`);
      }
    } else {
      throw new Error(`Expected a 400 response but got ${response.status}`);
    }
  });

  test("non-number inputs are considered invalid", async () => {
    const response = await client.getDocuments({
      limit: false as any as string,
      offset: false as any as string,
    });

    if (!response.ok) {
      expect(response.status).toBe(400);
      if (typeof response.error !== "string" && "name" in response.error) {
        expect(response.error.name).toBe("ZodError");
      } else {
        throw new Error(`Expected a ZodError but got a server or client error`);
      }
    } else {
      throw new Error(`Expected a 400 response but got ${response.status}`);
    }
  });
});

describe("getDocumentById", () => {
  test("should fetch document with an id that exists in the db", async () => {
    const response = await client.getDocuments();

    if (!response.ok)
      throw new Error(
        `Expected a 200 response fetching all docs but got ${response.status}`
      );

    const document1 = response.data.documents[0];
    const documentResponse = await client.getDocumentById(document1.id);

    if (!documentResponse.ok)
      throw new Error(
        `Expected a 200 response fetching doc by id but got ${response.status}`
      );

    expect(documentResponse.data.document.id).toBe(document1.id);
  });

  test("should fetch document when a string version of number is used", async () => {
    const response = await client.getDocuments();

    if (!response.ok)
      throw new Error(
        `Expected a 200 response fetching all docs but got ${response.status}`
      );

    const document1 = response.data.documents[0];
    const documentResponse = await client.getDocumentById(String(document1.id));

    if (!documentResponse.ok)
      throw new Error(
        `Expected a 200 response fetching doc by id but got ${response.status}`
      );

    expect(documentResponse.data.document.id).toBe(document1.id);
  });

  test("should respond appropriately when doc id doesn't exist in the db", async () => {
    const response = await client.getDocumentById(10000);

    if (!response.ok) {
      expect(response.status).toBe(404);
      expect(response.error).toBe("Document Not Found");
    } else {
      throw new Error(`Expected a 404 response but got ${response.status}`);
    }
  });

  test("negative id inputs are considered invalid", async () => {
    const response = await client.getDocumentById(-1);

    if (!response.ok) {
      expect(response.status).toBe(400);
      if (typeof response.error !== "string" && "name" in response.error) {
        expect(response.error.name).toBe("ZodError");
      } else {
        throw new Error(`Expected a ZodError but got ${response.error}`);
      }
      console.log(response);
    } else {
      throw new Error(`Expected a 400 response but got ${response.status}`);
    }
  });

  test("non-number id inputs are considered invalid", async () => {
    const response = await client.getDocumentById(false as any as number);

    if (!response.ok) {
      expect(response.status).toBe(400);
      if (typeof response.error !== "string" && "name" in response.error) {
        expect(response.error.name).toBe("ZodError");
      } else {
        throw new Error(`Expected a ZodError but got ${response.error}`);
      }
      console.log(response);
    } else {
      throw new Error(`Expected a 400 response but got ${response.status}`);
    }
  });
});

describe("deleteDocumentById", () => {
  test("should delete document with an id that exists in the db", async () => {
    const response = await client.getDocuments();

    if (!response.ok)
      throw new Error(
        `Expected a 200 response fetching all docs but got ${response.status}`
      );

    const document1 = response.data.documents[0];
    const deleteResponse = await client.deleteDocumentById(document1.id);

    if (!deleteResponse.ok)
      throw new Error(
        `Expected a 200 response deleting doc by id but got ${response.status}`
      );

    expect(deleteResponse.data.document.id).toBe(document1.id);
  });

  test("should respond appropriately when doc id doesn't exist in the db", async () => {
    const response = await client.deleteDocumentById(10000);

    if (!response.ok) {
      expect(response.status).toBe(404);
      expect(response.error).toBe("Document Not Found");
    } else {
      throw new Error(`Expected a 404 response but got ${response.status}`);
    }
  });

  test("negative id inputs are considered invalid", async () => {
    const response = await client.deleteDocumentById(-1);

    if (!response.ok) {
      expect(response.status).toBe(400);
      if (typeof response.error !== "string" && "name" in response.error) {
        expect(response.error.name).toBe("ZodError");
      } else {
        throw new Error(`Expected a ZodError but got ${response.error}`);
      }
      console.log(response);
    } else {
      throw new Error(`Expected a 400 response but got ${response.status}`);
    }
  });

  test("non-number id inputs are considered invalid", async () => {
    const response = await client.deleteDocumentById(false as any as number);

    if (!response.ok) {
      expect(response.status).toBe(400);
      if (typeof response.error !== "string" && "name" in response.error) {
        expect(response.error.name).toBe("ZodError");
      } else {
        throw new Error(`Expected a ZodError but got ${response.error}`);
      }
      console.log(response);
    } else {
      throw new Error(`Expected a 400 response but got ${response.status}`);
    }
  });
});
