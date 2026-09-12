import { useEffect, useRef } from "react";
import { centeredCrop, type AvatarCrop } from "./avatar";

export function AvatarEditor({
  image,
  crop,
  onChange,
}: {
  image: HTMLImageElement;
  crop: AvatarCrop;
  onChange: (patch: Partial<AvatarCrop>) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const width = image.naturalWidth,
    height = image.naturalHeight;
  const side = Math.min(width, height) / crop.zoom;
  const left = ((width - side) * crop.x) / 100;
  const top = ((height - side) * crop.y) / 100;
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    const scale = Math.min(1, 1200 / Math.max(width, height));
    target.width = Math.round(width * scale);
    target.height = Math.round(height * scale);
    target
      .getContext("2d")
      ?.drawImage(image, 0, 0, target.width, target.height);
    target.closest(".avatar-editor")?.scrollIntoView({ block: "center" });
  }, [image, width, height]);
  return (
    <div className="avatar-crop-controls avatar-editor">
      <p>Frame your photo</p>
      <small id="avatar-drag-help">
        Drag the circle to choose your photo. Use the arrow keys for fine
        adjustments.
      </small>
      <div
        className="avatar-image-stage"
        style={{
          aspectRatio: `${width} / ${height}`,
          width: `min(100%, ${(320 * width) / height}px)`,
        }}
      >
        <canvas ref={canvas} role="img" aria-label="Complete uploaded photo" />
        <button
          type="button"
          className="avatar-crop-circle"
          aria-label="Move photo selection"
          aria-describedby="avatar-drag-help"
          style={{
            left: `${(left / width) * 100}%`,
            top: `${(top / height) * 100}%`,
            width: `${(side / width) * 100}%`,
            height: `${(side / height) * 100}%`,
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.focus();
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, left, top };
          }}
          onPointerMove={(e) => {
            const start = drag.current;
            if (!start) return;
            const bounds =
              e.currentTarget.parentElement!.getBoundingClientRect();
            onChange({
              x:
                width === side
                  ? 50
                  : clamp(
                      ((start.left +
                        ((e.clientX - start.x) * width) / bounds.width) /
                        (width - side)) *
                        100,
                    ),
              y:
                height === side
                  ? 50
                  : clamp(
                      ((start.top +
                        ((e.clientY - start.y) * height) / bounds.height) /
                        (height - side)) *
                        100,
                    ),
            });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
          onKeyDown={(e) => {
            const delta = e.shiftKey ? 10 : 1;
            if (
              !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                e.key,
              )
            )
              return;
            e.preventDefault();
            onChange({
              x: clamp(
                crop.x +
                  (e.key === "ArrowLeft"
                    ? -delta
                    : e.key === "ArrowRight"
                      ? delta
                      : 0),
              ),
              y: clamp(
                crop.y +
                  (e.key === "ArrowUp"
                    ? -delta
                    : e.key === "ArrowDown"
                      ? delta
                      : 0),
              ),
            });
          }}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
      <label className="field">
        Zoom
        <input
          aria-label="Zoom"
          type="range"
          min="1"
          max="3"
          step="0.05"
          value={crop.zoom}
          onChange={(e) => onChange({ zoom: Number(e.target.value) })}
        />
        <output>{crop.zoom.toFixed(2)}×</output>
      </label>
      <button
        type="button"
        className="text-button"
        onClick={() => onChange(centeredCrop)}
      >
        Center photo
      </button>
    </div>
  );
}
