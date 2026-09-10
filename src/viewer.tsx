import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { z } from "zod";
import { publicLink } from "./services/social/urls";
import {
  publicConfigured,
  readPublicDocument,
} from "./services/social/publicReader";
import { Artwork, Stars } from "./components/display";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "./styles/app.css";
const image = z.string().refine((v) => !v || v.startsWith("https://"));
const payload = z.object({
  kind: z.enum(["list", "profile", "review"]),
  title: z.string(),
  description: z.string().optional(),
  bio: z.string().optional(),
  username: z.string().optional(),
  avatar: image.optional(),
  ranked: z.boolean().optional(),
  author: z
    .object({ username: z.string(), displayName: z.string() })
    .optional(),
  items: z.array(
    z.object({
      anilistId: z.number(),
      title: z.string(),
      cover: image,
      year: z.number().nullable(),
      rating: z.number().int().min(1).max(10).nullable(),
      liked: z.boolean(),
      thought: z.string().optional(),
    }),
  ),
  lists: z
    .array(z.object({ title: z.string(), publicId: z.string().uuid() }))
    .optional(),
  review: z.string().optional(),
  spoiler: z.boolean().optional(),
});
function Viewer() {
  const [data, setData] = useState<z.infer<typeof payload> | null>(null);
  const [error, setError] = useState("");
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    let active = true;
    const id = new URLSearchParams(location.search).get("id");
    if (!publicConfigured) {
      setError(
        "This viewer is not configured. The owner needs to connect a Supabase project.",
      );
      return;
    }
    if (!id || !z.string().uuid().safeParse(id).success) {
      setError("This share link is incomplete or invalid.");
      return;
    }
    readPublicDocument(id)
      .then((d) => {
        if (!active) return;
        if (!d) {
          setError(
            "This collection is private, unavailable or no longer shared.",
          );
          return;
        }
        setData(payload.parse(d.payload));
      })
      .catch(() => {
        if (active)
          setError(
            "This shared collection could not be loaded. Please try again later.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="public-viewer">
      <header className="viewer-brand">
        <img src="/brand/logo.png" alt="Nexume" />
        <span>NEXUME</span>
      </header>
      {error ? (
        <div className="empty">
          <h1>A quiet corner.</h1>
          <p>{error}</p>
        </div>
      ) : !data ? (
        <div className="empty" role="status">
          Opening a collection…
        </div>
      ) : (
        <>
          <div className="viewer-heading">
            <span className="eyebrow">
              {data.kind === "profile"
                ? "A PORTRAIT IN ANIME"
                : data.kind === "review"
                  ? "IN THEIR WORDS"
                  : "A CURATED COLLECTION"}
            </span>
            <h1>{data.title}</h1>
            <p className="prose">{data.description ?? data.bio}</p>
            <p className="eyebrow">
              @{data.author?.username ?? data.username} · {data.items.length}{" "}
              TITLES
            </p>
          </div>
          <div className="viewer-items">
            {data.items.map((item, i) => (
              <article className="viewer-item" key={item.anilistId}>
                {data.ranked && (
                  <span className="rank">{String(i + 1).padStart(2, "0")}</span>
                )}
                <Artwork src={item.cover} title={item.title} />
                <h2>{item.title}</h2>
                <Stars value={item.rating} />
                {item.thought && <p className="prose">“{item.thought}”</p>}
              </article>
            ))}
          </div>
          {data.review &&
            (data.spoiler && !reveal ? (
              <button className="button" onClick={() => setReveal(true)}>
                This review contains spoilers. Reveal.
              </button>
            ) : (
              <p className="viewer-review">{data.review}</p>
            ))}
          {data.lists?.length ? (
            <section className="home-section">
              <h2>Public lists</h2>
              <div className="profile-lists">
                {data.lists.map((l) => (
                  <p key={l.publicId}>
                    <a href={publicLink(l.publicId)}>{l.title} ↗</a>
                  </p>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
      <footer className="viewer-footer">
        Your anime, remembered. · Shared with Nexume.
      </footer>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Viewer />);
