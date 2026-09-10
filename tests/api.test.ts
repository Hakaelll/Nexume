import { it, expect, vi } from "vitest";
import { AniListMetadataProvider } from "../src/services/anilist/provider";
it("caches whole result pages without a request per card", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        data: {
          Page: {
            pageInfo: { hasNextPage: false },
            media: [{ id: 1 }, { id: 2 }],
          },
        },
      }),
      { status: 200 },
    ),
  );
  const provider = new AniListMetadataProvider(fetcher);
  expect((await provider.search({ query: "test" })).items).toHaveLength(2);
  await provider.search({ query: "test" });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("passes an abort signal and cancels before sending", async () => {
  const fetcher = vi.fn<typeof fetch>();
  const provider = new AniListMetadataProvider(fetcher);
  const c = new AbortController();
  c.abort();
  await expect(provider.search({}, c.signal)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it("exposes the actual upstream outage without empty success", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ errors: [{ message: "API temporarily disabled" }] }),
        { status: 403 },
      ),
    );
  await expect(new AniListMetadataProvider(fetcher).search({})).rejects.toThrow(
    "API temporarily disabled",
  );
});
it("honors 429 then retries the same page", async () => {
  vi.useFakeTimers();
  try {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("{}", { status: 429, headers: { "Retry-After": "3" } }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { Page: { pageInfo: { hasNextPage: false }, media: [] } },
          }),
          { status: 200 },
        ),
      );
    const request = new AniListMetadataProvider(fetcher).search({ page: 2 });
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3100);
    await expect(request).resolves.toEqual({ items: [], hasNextPage: false });
    expect(fetcher).toHaveBeenCalledTimes(2);
  } finally {
    vi.useRealTimers();
  }
});
