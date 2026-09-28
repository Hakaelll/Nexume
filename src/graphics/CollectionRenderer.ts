import * as THREE from "three";
import {
  budgets,
  casePose,
  interpolation,
  visibleRange,
  type Quality,
  ResourceCache,
} from "./layout";
export interface RenderItem {
  id: string;
  title: string;
  cover: string;
}
export interface RendererConfig {
  items: RenderItem[];
  selected: number;
  quality: Quality;
  reducedMotion: boolean;
  resolveImage: (url: string) => Promise<string>;
  onSelect: (index: number) => void;
  onOpen: (index: number) => void;
  onContext?: (index: number, event: MouseEvent) => void;
  onFailure: () => void;
  onMetrics?: (metrics: {
    frameMs: number;
    drawCalls: number;
    textures: number;
    activeCases: number;
    textureMB: number;
    heapMB: number | null;
  }) => void;
}
type Case = {
  group: THREE.Group;
  front: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  placeholder: THREE.CanvasTexture;
  index: number;
  id: string;
  cover: string;
  version: number;
};
export class CollectionRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private parallax = new THREE.Vector2();
  private targetVector = new THREE.Vector3();
  private objects = new Map<string, Case>();
  private textures = new ResourceCache<THREE.Texture>(48);
  private loading = new Map<string, Promise<THREE.Texture | null>>();
  private observer: ResizeObserver;
  private intersection: IntersectionObserver;
  private visible = true;
  private frame = 0;
  private last = 0;
  private lastMetrics = 0;
  private disposed = false;
  private config: RendererConfig;
  private box = new THREE.BoxGeometry(2.14, 3.22, 0.13);
  private plane = new THREE.PlaneGeometry(2.1, 3.18);
  private edge = new THREE.MeshStandardMaterial({
    color: 0x232323,
    roughness: 0.7,
    metalness: 0.15,
  });
  constructor(
    private host: HTMLElement,
    config: RendererConfig,
  ) {
    this.config = config;
    this.renderer = new THREE.WebGLRenderer({
      antialias: config.quality !== "Low",
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0xf6f2ee);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(
      Math.min(
        Math.max(
          window.devicePixelRatio,
          budgets[config.quality].minPixelRatio,
        ),
        budgets[config.quality].pixelRatio,
      ),
    );
    this.camera.position.set(0, 0.05, 8.4);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(-3, 5, 6);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x686b89, 0.6);
    rim.position.set(4, 0, -1);
    this.scene.add(rim);
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.renderer.domElement.addEventListener("click", this.click);
    this.renderer.domElement.addEventListener("dblclick", this.doubleClick);
    this.renderer.domElement.addEventListener("contextmenu", this.contextMenu);
    this.renderer.domElement.addEventListener("pointermove", this.pointerMove);
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(host);
    this.intersection = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.visibility();
    });
    this.intersection.observe(host);
    document.addEventListener("visibilitychange", this.visibility);
    this.update(config);
    this.resize();
    this.schedule();
  }
  private schedule = () => {
    if (!this.frame && !this.disposed && !document.hidden && this.visible)
      this.frame = requestAnimationFrame(this.animate);
  };
  private resize = () => {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.schedule();
  };
  private contextLost = (e: Event) => {
    e.preventDefault();
    this.config.onFailure();
  };
  private visibility = () => {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    if (!document.hidden && !this.disposed) {
      this.last = 0;
      this.schedule();
    }
  };
  private hit(e: MouseEvent) {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - bounds.left) / bounds.width) * 2 - 1,
      (-(e.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(
      [...this.objects.values()].map((o) => o.front),
    );
    return hits[0]?.object.userData.index as number | undefined;
  }
  private click = (e: MouseEvent) => {
    const index = this.hit(e);
    if (index !== undefined) this.config.onSelect(index);
  };
  private doubleClick = (e: MouseEvent) => {
    const index = this.hit(e);
    if (index !== undefined) this.config.onOpen(index);
  };
  private contextMenu = (e: MouseEvent) => {
    const index = this.hit(e);
    if (index !== undefined) {
      e.preventDefault();
      this.config.onSelect(index);
      this.config.onContext?.(index, e);
    }
  };
  private pointerMove = (e: PointerEvent) => {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.parallax.set(
      (e.clientX - r.left) / r.width - 0.5,
      (e.clientY - r.top) / r.height - 0.5,
    );
  };
  private placeholder(title: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, 256, 384);
    ctx.strokeStyle = "#4d4d4d";
    ctx.strokeRect(12, 12, 232, 360);
    ctx.fillStyle = "#999";
    ctx.font = "12px sans-serif";
    ctx.fillText("N E X U M E", 28, 43);
    ctx.fillStyle = "#ddd";
    ctx.font = "23px Georgia";
    const words = title.split(" ");
    let line = "",
      y = 200;
    for (const word of words) {
      if (ctx.measureText(`${line} ${word}`).width > 200) {
        ctx.fillText(line, 28, y);
        line = word;
        y += 30;
      } else line += (line ? " " : "") + word;
    }
    ctx.fillText(line, 28, y);
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#888";

    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  private async texture(url: string, size: number) {
    const key = `${url}|${size}`;
    const existing = this.textures.get(key);
    if (existing) return existing;
    if (this.loading.has(key)) return this.loading.get(key)!;
    const job = (async () => {
      try {
        const resolved = await this.config.resolveImage(url);
        if (this.disposed) return null;
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.crossOrigin = "anonymous";
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = resolved;
        });
        if (this.disposed) return null;
        const canvas = document.createElement("canvas");
        // Keep source detail without allocating enlarged, interpolated textures.
        const scale = Math.min(
          1,
          size / img.naturalWidth,
          (size * 1.5) / img.naturalHeight,
        );
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const context = canvas.getContext("2d")!;
        context.imageSmoothingQuality = "high";
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(
          8,
          this.renderer.capabilities.getMaxAnisotropy(),
        );
        this.textures.set(
          key,
          texture,
          new Set([...this.objects.values()].map((o) => o.cover)),
        );
        return texture;
      } catch {
        return null;
      } finally {
        this.loading.delete(key);
      }
    })();
    this.loading.set(key, job);
    return job;
  }
  update(config: RendererConfig) {
    this.config = config;
    this.schedule();
    const budget = budgets[config.quality];
    this.renderer.setPixelRatio(
      Math.min(
        Math.max(window.devicePixelRatio, budget.minPixelRatio),
        budget.pixelRatio,
      ),
    );
    const range = visibleRange(
      config.selected,
      config.items.length,
      budget.radius,
    );
    const ids = new Set(range.map((i) => config.items[i].id));
    for (const [id, o] of this.objects) {
      if (!ids.has(id)) {
        this.scene.remove(o.group);
        o.front.material.dispose();
        o.placeholder.dispose();
        this.objects.delete(id);
      }
    }
    for (const index of range) {
      const item = config.items[index];
      let o = this.objects.get(item.id);
      if (!o) {
        const group = new THREE.Group();
        group.add(new THREE.Mesh(this.box, this.edge));
        const placeholder = this.placeholder(item.title);
        const front = new THREE.Mesh(
          this.plane,
          new THREE.MeshBasicMaterial({ map: placeholder }),
        );
        front.position.z = 0.072;
        group.add(front);
        const pose = casePose(index - config.selected);
        group.position.set(pose.x, pose.y, pose.z - 0.4);
        group.rotation.y = pose.rotation;
        group.scale.setScalar(pose.scale);
        o = {
          group,
          front,
          placeholder,
          index,
          id: item.id,
          cover: "",
          version: 0,
        };
        this.objects.set(item.id, o);
        this.scene.add(group);
      }
      o.index = index;
      o.front.userData.index = index;
      const size =
        Math.abs(index - config.selected) <= 2
          ? budget.texture
          : budget.peripheralTexture;
      const coverKey = `${item.cover}|${size}`;
      if (item.cover && o.cover !== coverKey) {
        o.cover = coverKey;
        const version = ++o.version;
        const object = o;
        void this.texture(item.cover, size).then((texture) => {
          if (
            texture &&
            !this.disposed &&
            this.objects.get(item.id) === object &&
            object.version === version
          ) {
            object.front.material.map = texture;
            object.front.material.needsUpdate = true;
            this.schedule();
          }
        });
      }
    }
    for (const index of [
      config.selected - budget.radius - 1,
      config.selected + budget.radius + 1,
    ]) {
      const item = config.items[index];
      if (item?.cover) void this.texture(item.cover, 256);
    }
  }
  private animate = (time: number) => {
    this.frame = 0;
    if (this.disposed || document.hidden || !this.visible) return;
    const dt = this.last ? (time - this.last) / 1000 : 1 / 60;
    this.last = time;
    const ease = this.config.reducedMotion ? 1 : interpolation(dt);
    for (const o of this.objects.values()) {
      const offset = o.index - this.config.selected;
      const pose = casePose(offset);
      const float = this.config.reducedMotion
        ? 0
        : Math.sin(time * 0.00035 + o.index) * 0.015;
      o.group.position.lerp(
        this.targetVector.set(pose.x, pose.y + float, pose.z),
        ease,
      );
      o.group.rotation.y = THREE.MathUtils.lerp(
        o.group.rotation.y,
        pose.rotation,
        ease,
      );
      o.group.scale.lerp(
        this.targetVector.set(pose.scale, pose.scale, pose.scale),
        ease,
      );
      const brightness =
        offset === 0 ? 1 : Math.max(0.42, 0.82 - Math.abs(offset) * 0.035);
      o.front.material.color.setRGB(brightness, brightness, brightness);
    }
    this.camera.position.x = THREE.MathUtils.lerp(
      this.camera.position.x,
      this.config.reducedMotion ? 0 : this.parallax.x * 0.12,
      ease,
    );
    this.camera.position.y = THREE.MathUtils.lerp(
      this.camera.position.y,
      this.config.reducedMotion ? 0.05 : 0.05 - this.parallax.y * 0.07,
      ease,
    );
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
    if (this.config.onMetrics && time - this.lastMetrics > 1000) {
      this.config.onMetrics({
        frameMs: dt * 1000,
        drawCalls: this.renderer.info.render.calls,
        textures: this.renderer.info.memory.textures,
        activeCases: this.objects.size,
        textureMB:
          [...this.textures.values()].reduce(
            (bytes, t) =>
              bytes +
              ((t.image?.width ?? 0) * (t.image?.height ?? 0) * 4 * 4) / 3,
            0,
          ) / 1048576,
        heapMB:
          ((
            performance as Performance & { memory?: { usedJSHeapSize: number } }
          ).memory?.usedJSHeapSize ?? 0) / 1048576 || null,
      });
      this.lastMetrics = time;
    }
    if (!this.config.reducedMotion) this.schedule();
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.intersection.disconnect();
    document.removeEventListener("visibilitychange", this.visibility);
    this.renderer.domElement.removeEventListener("click", this.click);
    this.renderer.domElement.removeEventListener("dblclick", this.doubleClick);
    this.renderer.domElement.removeEventListener(
      "contextmenu",
      this.contextMenu,
    );
    this.renderer.domElement.removeEventListener(
      "pointermove",
      this.pointerMove,
    );
    this.renderer.domElement.removeEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.objects.forEach((o) => {
      o.front.material.dispose();
      o.placeholder.dispose();
    });
    this.objects.clear();
    this.textures.clear();
    this.box.dispose();
    this.plane.dispose();
    this.edge.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
