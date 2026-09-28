// Share one observer across poster grids instead of allocating one per image.
const pending = new Map<Element, () => void>();
let observer: IntersectionObserver | null = null;
export function whenNearViewport(element: Element, load: () => void) {
  observer ??= new IntersectionObserver(
    (records) => {
      for (const record of records) {
        if (!record.isIntersecting) continue;
        const callback = pending.get(record.target);
        pending.delete(record.target);
        observer?.unobserve(record.target);
        callback?.();
      }
      if (!pending.size) {
        observer?.disconnect();
        observer = null;
      }
    },
    { rootMargin: "400px" },
  );
  pending.set(element, load);
  observer.observe(element);
  return () => {
    pending.delete(element);
    observer?.unobserve(element);
    if (!pending.size) {
      observer?.disconnect();
      observer = null;
    }
  };
}

const watched = new Map<Element, (near: boolean) => void>();
let visibilityObserver: IntersectionObserver | null = null;
export function watchNearViewport(
  element: Element,
  change: (near: boolean) => void,
) {
  visibilityObserver ??= new IntersectionObserver(
    (records) => {
      for (const record of records) {
        // Retained routes are temporarily detached. Keep their focus/scroll state.
        if (record.target.isConnected)
          watched.get(record.target)?.(record.isIntersecting);
      }
    },
    { rootMargin: "800px" },
  );
  watched.set(element, change);
  visibilityObserver.observe(element);
  return () => {
    watched.delete(element);
    visibilityObserver?.unobserve(element);
    if (!watched.size) {
      visibilityObserver?.disconnect();
      visibilityObserver = null;
    }
  };
}
