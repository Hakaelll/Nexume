import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Preserve local UI state without leaving inactive controls in the document.
export function RetainedPage({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const scrolls = useRef(new Map<HTMLElement, { top: number; left: number }>());
  const [container] = useState(() => {
    const element = document.createElement("div");
    element.className = "route-content";
    return element;
  });
  useLayoutEffect(() => {
    const remember = (event: Event) => {
      const node = event.target;
      if (node instanceof HTMLElement && node.isConnected)
        scrolls.current.set(node, {
          top: node.scrollTop,
          left: node.scrollLeft,
        });
    };
    container.addEventListener("scroll", remember, true);
    return () => container.removeEventListener("scroll", remember, true);
  }, [container]);
  useLayoutEffect(() => {
    if (active) {
      host.current?.appendChild(container);
      for (const [node, position] of scrolls.current) {
        if (container.contains(node)) {
          node.scrollTop = position.top;
          node.scrollLeft = position.left;
        } else scrolls.current.delete(node);
      }
    }
    return () => container.remove();
  }, [active, container]);
  return (
    <div ref={host} className="route-panel" hidden={!active}>
      {createPortal(children, container)}
    </div>
  );
}
