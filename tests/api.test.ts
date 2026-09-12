import { it, expect, vi } from "vitest";
import { AniListMetadataProvider } from "../src/services/anilist/provider";
it("draws across the catalog ID range and paginates candidates with filters", async () => {
  vi.useFakeTimers();
  const response = (media: { id: number }[], hasNextPage = false) =>
    new Response(
      JSON.stringify({ data: { Page: { media, pageInfo: { hasNextPage } } } }),
    );
  try {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response([{ id: 250000 }]))
      .mockResolvedValueOnce(response([{ id: 1 }], true))
      .mockResolvedValueOnce(response([{ id: 200000 }]));
    const request = new AniListMetadataProvider(fetcher).randomCatalog({
      genre: "Drama",
      adult: false,
      minYear: 2000,
      maxEpisodes: 12,
    });
    await vi.runAllTimersAsync();
    expect((await request).map((a) => a.anilistId)).toEqual([1, 200000]);
    const body = JSON.parse(String(fetcher.mock.calls[1][1]?.body));
    expect(body.variables).toMatchObject({
      genre: "Drama",
      adult: false,
      since: 19999999,
      episodes: 13,
      page: 1,
    });
    expect(
      body.variables.ids.every((id: number) => id >= 1 && id <= 250000),
    ).toBe(true);
    expect(
      JSON.parse(String(fetcher.mock.calls[2][1]?.body)).variables.page,
    ).toBe(2);
  } finally {
    vi.useRealTimers();
  }
});
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

it("uses relevance for title searches and retains discovery ordering", async () => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          data: { Page: { media: [], pageInfo: { hasNextPage: false } } },
        }),
      ),
  );
  const provider = new AniListMetadataProvider(fetcher);
  await provider.search({ query: "Cowboy Bebop" });
  expect(
    JSON.parse(String(fetcher.mock.calls[0][1]?.body)).variables.sort,
  ).toBe("SEARCH_MATCH");
  await provider.search({});
  expect(
    JSON.parse(String(fetcher.mock.calls[1][1]?.body)).variables.sort,
  ).toBe("TRENDING_DESC");
});

it("loads complete airing windows and keeps the scheduled episode on each result", async () => {
  vi.useFakeTimers();
  try {
    const response = (episode: number, more: boolean) =>
      new Response(
        JSON.stringify({
          data: {
            Page: {
              pageInfo: { hasNextPage: more },
              airingSchedules: [
                { episode, airingAt: 2000 + episode, media: { id: 1 } },
              ],
            },
          },
        }),
      );
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(1, true))
      .mockResolvedValueOnce(response(2, false));
    const job = new AniListMetadataProvider(fetcher).airing(2000, 3000, [1]);
    await vi.runAllTimersAsync();
    const items = await job;
    expect(items.map((a) => a.nextAiringEpisode?.episode)).toEqual([1, 2]);
    expect(
      JSON.parse(String(fetcher.mock.calls[0][1]?.body)).variables,
    ).toEqual({ start: 1999, end: 3000, ids: [1], page: 1 });
    expect(
      JSON.parse(String(fetcher.mock.calls[1][1]?.body)).variables.page,
    ).toBe(2);
  } finally {
    vi.useRealTimers();
  }
});
