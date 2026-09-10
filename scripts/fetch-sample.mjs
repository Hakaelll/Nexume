import { mkdir, writeFile } from "node:fs/promises";
const ids = [
  1, 30, 19, 16498, 101922, 154587, 20, 1535, 110277, 20954, 9253, 21519,
];
const query = `query($ids:[Int]){Page(perPage:50){media(type:ANIME,id_in:$ids){id title { romaji english native } synonyms coverImage { large extraLarge } bannerImage description averageScore popularity favourites episodes duration format status season seasonYear startDate { year month day } endDate { year month day } genres tags { name } studios(isMain: true) { nodes { name } } countryOfOrigin trailer { id site } nextAiringEpisode { episode airingAt } isAdult}}}`;
const fixtureOnly = process.argv.includes("--fixture-from-jikan");
let data;
if (fixtureOnly) {
  const malIds = [
    1, 30, 19, 16498, 38000, 52991, 20, 1535, 40028, 28851, 9253, 32281,
  ];
  const media = [];
  for (let i = 0; i < ids.length; i++) {
    const r = await fetch(`https://api.jikan.moe/v4/anime/${malIds[i]}`);
    if (!r.ok) throw new Error(`Fixture metadata ${r.status}`);
    const { data: m } = await r.json();
    media.push({
      id: ids[i],
      title: {
        romaji: m.title,
        english: m.title_english,
        native: m.title_japanese,
      },
      synonyms: m.title_synonyms,
      coverImage: {
        large: m.images.jpg.large_image_url,
        extraLarge: m.images.jpg.large_image_url,
      },
      bannerImage: null,
      description: m.synopsis,
      averageScore: null,
      popularity: null,
      favourites: null,
      episodes: m.episodes,
      duration: parseInt(m.duration) || null,
      format: m.type === "Movie" ? "MOVIE" : m.type,
      status: m.airing ? "RELEASING" : "FINISHED",
      season: m.season?.toUpperCase(),
      seasonYear: m.year,
      startDate: m.aired.prop.from,
      endDate: m.aired.prop.to,
      genres: m.genres.map((g) => g.name),
      tags: [],
      studios: { nodes: m.studios.map((s) => ({ name: s.name })) },
      countryOfOrigin: "JP",
      trailer: null,
      nextAiringEpisode: null,
      isAdult: false,
    });
    console.log(`Fixture metadata: ${m.title}`);
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  data = { data: { Page: { media } } };
} else {
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { ids } }),
  });
  if (!response.ok)
    throw new Error(`AniList ${response.status}: ${await response.text()}`);
  data = await response.json();
  if (!data.data?.Page?.media) throw new Error(JSON.stringify(data.errors));
}
await mkdir("public/demo", { recursive: true });
await writeFile(
  "public/demo/anime.json",
  JSON.stringify(data.data.Page.media, null, 2),
);
for (const anime of data.data.Page.media) {
  for (const [name, url] of [
    ["cover", anime.coverImage.large],
    ["banner", anime.bannerImage],
  ]) {
    if (!url) continue;
    const r = await fetch(url);
    if (!r.ok) {
      console.warn(`Missing ${name} for ${anime.id}`);
      continue;
    }
    await writeFile(
      `public/demo/${anime.id}-${name}.jpg`,
      Buffer.from(await r.arrayBuffer()),
    );
  }
  console.log(`Cached ${anime.id}: ${anime.title.romaji}`);
}
