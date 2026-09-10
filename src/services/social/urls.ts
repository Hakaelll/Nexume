export function publicLink(publicId: string) {
  const raw = import.meta.env.VITE_PUBLIC_VIEWER_URL as string | undefined;
  if (!raw)
    throw new Error("Set VITE_PUBLIC_VIEWER_URL to your deployed viewer URL.");
  const url = new URL(raw);
  if (
    url.protocol !== "https:" &&
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1"
  )
    throw new Error("The public viewer must use HTTPS.");
  url.searchParams.set("id", publicId);
  return url.toString();
}
