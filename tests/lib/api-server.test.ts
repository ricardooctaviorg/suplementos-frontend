// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => "session=signed-token" }),
}));

const { serverApiFetch } = await import("@/lib/api/server");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("serverApiFetch", () => {
  it("forwards the request cookies to the backend and never caches", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await serverApiFetch("/api/auth/me", { headers: { "X-Test": "1" } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/^https?:\/\/.+\/api\/auth\/me$/);
    expect(init?.cache).toBe("no-store");
    expect(init?.headers).toMatchObject({ Cookie: "session=signed-token", "X-Test": "1" });
  });
});
