/** Narrow browser API used by TixFlow; parsed SVGA data stays opaque. */
declare module 'svga-web' {
  export class Parser {
    do(data: ArrayBuffer): Promise<unknown>;
    destroy(): void;
  }
  export class Player {
    constructor(canvas: HTMLCanvasElement);
    set(options: { loop?: number; intersectionObserverRender?: boolean }): void;
    mount(data: unknown): Promise<void>;
    start(): void;
    pause(): void;
    destroy(): void;
  }
}
