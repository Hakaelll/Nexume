export type AvatarCrop = { x: number; y: number; zoom: number };
export const centeredCrop: AvatarCrop = { x: 50, y: 50, zoom: 1 };
export async function loadAvatar(file: File): Promise<HTMLImageElement> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG or WebP image.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose an image smaller than 10 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function cropAvatar(image: HTMLImageElement, crop: AvatarCrop): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing is unavailable.");
  const side = Math.min(image.naturalWidth, image.naturalHeight) / crop.zoom;
  ctx.fillStyle = "#f6f2ee";
  ctx.fillRect(0, 0, 256, 256);
  ctx.drawImage(
    image,
    ((image.naturalWidth - side) * crop.x) / 100,
    ((image.naturalHeight - side) * crop.y) / 100,
    side,
    side,
    0,
    0,
    256,
    256,
  );
  return canvas.toDataURL("image/jpeg", 0.88);
}
