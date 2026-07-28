import { describe, it, expect } from "vitest";
import { apiErrorFrom } from "../api-error";

function jsonResponse(body: unknown, status = 500) {
  return new Response(JSON.stringify(body), { status });
}

describe("apiErrorFrom", () => {
  it("uses a flat { error: string } envelope", async () => {
    const error = await apiErrorFrom(
      jsonResponse({ error: "Backup creation is not available" }, 501),
    );
    expect(error.message).toBe("Backup creation is not available");
  });

  it("uses a nested { error: { message } } envelope", async () => {
    const error = await apiErrorFrom(
      jsonResponse({ error: { message: "Route not found" } }, 404),
    );
    expect(error.message).toBe("Route not found");
  });

  it("falls back to a top-level message field", async () => {
    const error = await apiErrorFrom(jsonResponse({ message: "Nope" }, 400));
    expect(error.message).toBe("Nope");
  });

  it("prefers the server's reason over the caller's fallback", async () => {
    // The whole point: hardcoded strings like "Failed to create backup" were
    // discarding precise server messages such as the 501 explanation.
    const error = await apiErrorFrom(
      jsonResponse({ error: "no backup system configured" }, 501),
      "Failed to create backup",
    );
    expect(error.message).toBe("no backup system configured");
  });

  it("uses the caller's fallback when the body carries no reason", async () => {
    const error = await apiErrorFrom(
      jsonResponse({ unrelated: true }, 500),
      "Failed to create backup",
    );
    expect(error.message).toBe("Failed to create backup");
  });

  it("survives a non-JSON body", async () => {
    const response = new Response("<html>502 Bad Gateway</html>", {
      status: 502,
    });
    const error = await apiErrorFrom(response);
    expect(error.message).toBe("Request failed with status 502");
  });

  it("reports the status when there is no body and no fallback", async () => {
    const error = await apiErrorFrom(jsonResponse({}, 403));
    expect(error.message).toBe("Request failed with status 403");
  });
});
