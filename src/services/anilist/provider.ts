import { type Anime, metadataSchema, now } from "../../domain/model";
export interface SearchOptions {
  query?: string;
  page?: number;
  sort?: string;
  year?: number;
  season?: string;
  genre?: string;
  format?: string;
  status?: string;
  adult?: boolean;
  minScore?: number;
  maxEpisodes?: number;
}
export interface SearchPage {
  items: Anime[];
  hasNextPage: boolean;
}
export interface AnimeMetadataProvider {
  search(options: SearchOptions, signal?: AbortSignal): Promise<SearchPage>;
  byIds(ids: number[], signal?: AbortSignal): Promise<Anime[]>;
}
export interface AniListDTO {
  id: number;
  title?: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  } | null;
  synonyms?: string[] | null;
  coverImage?: { large?: string | null; extraLarge?: string | null } | null;
  bannerImage?: string | null;
  description?: string | null;
  averageScore?: number | null;
  popularity?: number | null;
  favourites?: number | null;
  episodes?: number | null;
  duration?: number | null;
  format?: string | null;
  status?: string | null;
  season?: string | null;
  seasonYear?: number | null;
  startDate?: {
    year?: number | null;
    month?: number | null;
    day?: number | null;
  } | null;
  endDate?: {
    year?: number | null;
    month?: number | null;
    day?: number | null;
  } | null;
  genres?: string[] | null;
  tags?: ({ name?: string | null } | null)[] | null;
  studios?: { nodes?: ({ name?: string | null } | null)[] | null } | null;
  countryOfOrigin?: string | null;
  trailer?: { id?: string | null; site?: string | null } | null;
  nextAiringEpisode?: { episode: number; airingAt: number } | null;
  isAdult?: boolean | null;
}
export function plainText(raw: string) {
  return raw
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(
      /&(?:amp|lt|gt|quot|apos|#39);/g,
      (s) =>
        ({
          "&amp;": "&",
          "&lt;": "<",
          "&gt;": ">",
          "&quot;": '"',
          "&apos;": "'",
          "&#39;": "'",
        })[s] ?? s,
    )
    .trim();
}
function fuzzyDate(d: AniListDTO["startDate"]) {
  return d?.year
    ? `${d.year}${d.month ? `-${String(d.month).padStart(2, "0")}${d.day ? `-${String(d.day).padStart(2, "0")}` : ""}` : ""}`
    : null;
}
export function mapAnime(d: AniListDTO): Anime {
  return metadataSchema.parse({
    anilistId: d.id,
    romaji: d.title?.romaji || d.title?.english || `Anime ${d.id}`,
    english: d.title?.english ?? null,
    native: d.title?.native ?? null,
    synonyms: d.synonyms ?? [],
    coverImage: d.coverImage?.extraLarge || d.coverImage?.large || "",
    coverLarge: d.coverImage?.extraLarge || d.coverImage?.large || "",
    bannerImage: d.bannerImage ?? "",
    description: plainText(d.description ?? ""),
    averageScore: d.averageScore ?? null,
    popularity: d.popularity ?? null,
    favorites: d.favourites ?? null,
    episodes: d.episodes ?? null,
    duration: d.duration ?? null,
    format: d.format ?? null,
    status: d.status ?? null,
    season: d.season ?? null,
    year: d.seasonYear ?? d.startDate?.year ?? null,
    startDate: fuzzyDate(d.startDate),
    endDate: fuzzyDate(d.endDate),
    genres: d.genres ?? [],
    tags: (d.tags ?? []).flatMap((t) => (t?.name ? [t.name] : [])),
    studios: (d.studios?.nodes ?? []).flatMap((s) => (s?.name ? [s.name] : [])),
    country: d.countryOfOrigin ?? null,
    trailer:
      d.trailer?.id && d.trailer.site
        ? { id: d.trailer.id, site: d.trailer.site }
        : null,
    nextAiringEpisode: d.nextAiringEpisode ?? null,
    isAdult: d.isAdult ?? false,
    fetchedAt: now(),
  });
}
const fields = `id title { romaji english native } synonyms coverImage { large extraLarge } bannerImage description averageScore popularity favourites episodes duration format status season seasonYear startDate { year month day } endDate { year month day } genres tags { name } studios(isMain: true) { nodes { name } } countryOfOrigin trailer { id site } nextAiringEpisode { episode airingAt } isAdult`;
export function retryDelay(
  header: string | null,
  attempt: number,
  time = Date.now(),
) {
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(0, date - time);
  }
  return Math.min(30000, 1500 * 2 ** attempt);
}
const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    signal?.throwIfAborted();
    const done = () => {
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const timer = setTimeout(done, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Cancelled", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
export class AniListMetadataProvider implements AnimeMetadataProvider {
  private cache = new Map<string, { at: number; data: SearchPage }>();
  private nextRequest = 0;
  private gate: Promise<void> = Promise.resolve();
  constructor(private transport: typeof fetch = (...args) => fetch(...args)) {}
  private async request(
    query: string,
    variables: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<SearchPage> {
    const key = JSON.stringify([query, variables]);
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < 15 * 60 * 1000) return cached.data;
    for (let attempt = 0; attempt < 3; attempt++) {
      signal?.throwIfAborted();
      const turn = this.gate.then(async () => {
        await delay(Math.max(0, this.nextRequest - Date.now()), signal);
        this.nextRequest = Date.now() + 2100;
      });
      this.gate = turn.catch(() => {});
      await turn;
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      const timer = setTimeout(abort, 15000);
      try {
        const response = await this.transport("https://graphql.anilist.co", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ query, variables }),
          signal: controller.signal,
        });
        if (response.status === 429 || response.status >= 500) {
          const wait = retryDelay(response.headers.get("Retry-After"), attempt);
          this.nextRequest = Math.max(this.nextRequest, Date.now() + wait);
          if (attempt < 2) {
            await delay(wait, signal);
            continue;
          }
          throw new Error(
            response.status === 429
              ? "AniList is busy. Please try again shortly."
              : "AniList is temporarily unavailable. Your collection is safe.",
          );
        }
        if (!response.ok) {
          let reason = "";
          try {
            const body = (await response.json()) as {
              errors?: { message: string }[];
            };
            reason = body.errors?.map((e) => e.message).join(" ") ?? "";
          } catch {
            /* Non-JSON upstream error. */
          }
          throw new Error(
            reason
              ? `AniList: ${reason}`
              : `AniList returned ${response.status}.`,
          );
        }
        const json = (await response.json()) as {
          data?: {
            Page?: {
              media?: AniListDTO[];
              airingSchedules?: {
                media: AniListDTO;
                episode: number;
                airingAt: number;
              }[];
              pageInfo: { hasNextPage: boolean };
            };
          };
          errors?: { message: string }[];
        };
        if (json.errors?.length)
          throw new Error(json.errors.map((e) => e.message).join(". "));
        if (!json.data?.Page)
          throw new Error("AniList returned an incomplete response.");
        const data = {
          items: json.data.Page.airingSchedules
            ? json.data.Page.airingSchedules.map((a) => ({
                ...mapAnime(a.media),
                nextAiringEpisode: { episode: a.episode, airingAt: a.airingAt },
              }))
            : (json.data.Page.media ?? []).map(mapAnime),
          hasNextPage: json.data.Page.pageInfo.hasNextPage,
        };
        this.cache.set(key, { at: Date.now(), data });
        if (this.cache.size > 60)
          this.cache.delete(this.cache.keys().next().value!);
        return data;
      } catch (e) {
        if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
        if (
          (e instanceof TypeError || controller.signal.aborted) &&
          attempt < 2
        ) {
          await delay(retryDelay(null, attempt), signal);
          continue;
        }
        throw e;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
      }
    }
    throw new Error("AniList could not be reached.");
  }
  search(options: SearchOptions, signal?: AbortSignal) {
    const sorts = [
      "SEARCH_MATCH",
      "TRENDING_DESC",
      "POPULARITY_DESC",
      "SCORE_DESC",
      "START_DATE_DESC",
    ];
    const variables = {
      search: options.query || undefined,
      page: options.page ?? 1,
      sort: sorts.includes(options.sort ?? "")
        ? options.sort
        : options.query?.trim()
          ? "SEARCH_MATCH"
          : "TRENDING_DESC",
      seasonYear: options.year || undefined,
      season: options.season || undefined,
      genre: options.genre || undefined,
      format: options.format || undefined,
      status: options.status || undefined,
      isAdult: options.adult ? undefined : false,
      score: options.minScore ? options.minScore - 1 : undefined,
      episodes: options.maxEpisodes ? options.maxEpisodes + 1 : undefined,
    };
    return this.request(
      `query($search:String,$page:Int,$sort:[MediaSort],$seasonYear:Int,$season:MediaSeason,$genre:String,$format:MediaFormat,$status:MediaStatus,$isAdult:Boolean,$score:Int,$episodes:Int){Page(page:$page,perPage:24){pageInfo{hasNextPage}media(type:ANIME,search:$search,sort:$sort,seasonYear:$seasonYear,season:$season,genre:$genre,format:$format,status:$status,isAdult:$isAdult,averageScore_greater:$score,episodes_lesser:$episodes){${fields}}}}`,
      variables,
      signal,
    );
  }
  async airing(
    start: number,
    end: number,
    ids?: number[],
    signal?: AbortSignal,
  ): Promise<Anime[]> {
    if (ids && !ids.length) return [];
    const batches = ids
      ? Array.from({ length: Math.ceil(ids.length / 50) }, (_, i) =>
          ids.slice(i * 50, i * 50 + 50),
        )
      : [undefined];
    const items: Anime[] = [];
    for (const batch of batches) {
      let page = 1,
        more = true;
      while (more) {
        signal?.throwIfAborted();
        const result = await this.request(
          `query($start:Int,$end:Int,$ids:[Int],$page:Int){Page(page:$page,perPage:50){pageInfo{hasNextPage}airingSchedules(airingAt_greater:$start,airingAt_lesser:$end,mediaId_in:$ids,sort:TIME){episode airingAt media{${fields}}}}}`,
          { start: start - 1, end, ids: batch, page },
          signal,
        );
        items.push(...result.items);
        more = result.hasNextPage;
        page++;
      }
    }
    return items;
  }
  async byIds(ids: number[], signal?: AbortSignal) {
    const result: Anime[] = [];
    for (let i = 0; i < ids.length; i += 50) {
      const page = await this.request(
        `query($ids:[Int]){Page(perPage:50){pageInfo{hasNextPage}media(type:ANIME,id_in:$ids){${fields}}}}`,
        { ids: ids.slice(i, i + 50) },
        signal,
      );
      result.push(...page.items);
    }
    return result;
  }
  async randomCatalog(
    options: SearchOptions & { minYear?: number; maxEpisodes?: number },
    signal?: AbortSignal,
  ) {
    // Sample IDs across the full catalog, including obscure and older titles.
    // Never assume pageInfo.total is an exact catalog size.
    const latest = await this.request(
      `query{Page(perPage:1){pageInfo{hasNextPage}media(type:ANIME,sort:ID_DESC){${fields}}}}`,
      {},
      signal,
    );
    const maxId = latest.items[0]?.anilistId;
    if (!maxId) return [];
    for (let attempt = 0; attempt < 4; attempt++) {
      const ids = [
        ...new Set(
          Array.from(
            { length: 512 },
            () => 1 + Math.floor(Math.random() * maxId),
          ),
        ),
      ];
      const items: Anime[] = [];
      for (let page = 1; ; page++) {
        const result = await this.request(
          `query($ids:[Int],$page:Int,$genre:String,$format:MediaFormat,$adult:Boolean,$since:FuzzyDateInt,$episodes:Int){Page(page:$page,perPage:50){pageInfo{hasNextPage}media(type:ANIME,id_in:$ids,genre:$genre,format:$format,isAdult:$adult,startDate_greater:$since,episodes_lesser:$episodes){${fields}}}}`,
          {
            ids,
            page,
            genre: options.genre || undefined,
            format: options.format || undefined,
            adult: options.adult ? undefined : false,
            since: options.minYear ? options.minYear * 10000 - 1 : undefined,
            episodes: options.maxEpisodes ? options.maxEpisodes + 1 : undefined,
          },
          signal,
        );
        items.push(...result.items);
        if (!result.hasNextPage) break;
      }
      if (items.length) return items;
    }
    throw new Error(
      "No matches in this draw. Try again or broaden your filters.",
    );
  }
}
export const anilist = new AniListMetadataProvider();
export function seasonNow(offset = 0) {
  const d = new Date();
  let quarter = Math.floor(d.getMonth() / 3) + offset;
  const year = d.getFullYear() + Math.floor(quarter / 4);
  quarter = ((quarter % 4) + 4) % 4;
  return { season: ["WINTER", "SPRING", "SUMMER", "FALL"][quarter], year };
}
