import { useLayoutEffect, useRef } from "react";

export function NavIndicator({ section }: { section: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const marker = ref.current;
    const nav = marker?.parentElement;
    if (!marker || !nav) return;
    const update = () => {
      const active = nav.querySelector<HTMLElement>(
        'button[aria-current="page"]',
      );
      marker.hidden = !active;
      if (active) {
        marker.style.transform = `translateY(${active.offsetTop}px)`;
        marker.style.height = `${active.offsetHeight}px`;
        marker.style.width = `${active.offsetWidth}px`;
        marker.style.left = `${active.offsetLeft}px`;
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [section]);
  return <span ref={ref} className="nav-indicator" aria-hidden="true" />;
}
