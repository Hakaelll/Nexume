export type Quality = "High" | "Balanced" | "Low";
export const budgets = {
  High: {
    radius: 10,
    pixelRatio: 2,
    minPixelRatio: 1.5,
    texture: 1024,
    peripheralTexture: 512,
  },
  Balanced: {
    radius: 7,
    pixelRatio: 2,
    minPixelRatio: 1.25,
    texture: 768,
    peripheralTexture: 384,
  },
  Low: {
    radius: 4,
    pixelRatio: 1,
    minPixelRatio: 1,
    texture: 256,
    peripheralTexture: 256,
  },
};
export function navigate(index: number, delta: number, count: number) {
  return Math.max(0, Math.min(Math.max(0, count - 1), index + delta));
}
export function visibleRange(index: number, count: number, radius: number) {
  const start = Math.max(0, index - radius);
  return Array.from(
    { length: Math.max(0, Math.min(count, index + radius + 1) - start) },
    (_, i) => i + start,
  );
}
export function casePose(offset: number) {
  return {
    x:
      offset === 0
        ? 0
        : Math.sign(offset) * (2.45 + (Math.abs(offset) - 1) * 1.9),
    y: offset === 0 ? 0 : Math.sin(Math.abs(offset) * 1.2) * 0.32,
    z: offset === 0 ? 1 : -Math.min(6, Math.abs(offset) * 0.95),
    rotation: offset === 0 ? 0 : -Math.sign(offset) * 0.28,
    scale: offset === 0 ? 1.06 : 0.91,
  };
}
export function interpolation(dt: number) {
  return 1 - Math.exp(-Math.min(dt, 0.1) * 10);
}
export class ResourceCache<T extends { dispose: () => void }> {
  private items = new Map<string, T>();
  constructor(readonly capacity: number) {}
  get(key: string) {
    const value = this.items.get(key);
    if (value) {
      this.items.delete(key);
      this.items.set(key, value);
    }
    return value;
  }
  set(key: string, value: T, protectedKeys = new Set<string>()) {
    const previous = this.items.get(key);
    if (previous && previous !== value) previous.dispose();
    this.items.delete(key);
    this.items.set(key, value);
    for (const [candidate, resource] of this.items) {
      if (this.items.size <= this.capacity) break;
      if (protectedKeys.has(candidate)) continue;
      resource.dispose();
      this.items.delete(candidate);
    }
  }
  clear() {
    this.items.forEach((value) => value.dispose());
    this.items.clear();
  }
  get size() {
    return this.items.size;
  }
  values() {
    return this.items.values();
  }
}
