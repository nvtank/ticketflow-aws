'use client';
import { useEffect, useRef } from 'react';
import { Ticket } from 'lucide-react';
import type { Player as SvgaPlayer, Parser as SvgaParser } from 'svga-web';

export function SvgaSeal() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = canvas.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const abort = new AbortController();
    let disposed = false;
    let player: SvgaPlayer | undefined;
    let parser: SvgaParser | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) player?.start();
      else player?.pause();
    });
    const load = async () => {
      const { Parser, Player } = await import('svga-web');
      if (disposed) return;
      parser = new Parser();
      const response = await fetch('/assets/animations/tixflow-ticket.svga', {
        signal: abort.signal,
      });
      if (!response.ok) throw new Error('SVGA asset unavailable');
      const data = await parser.do(await response.arrayBuffer());
      if (disposed) return;
      player = new Player(node);
      player.set({ loop: 0, intersectionObserverRender: true });
      await player.mount(data);
      if (disposed) {
        player.destroy();
        return;
      }
      node.dataset.ready = 'true';
      observer.observe(node);
    };
    void load().catch(() => {
      /* Decorative static ticket remains available. */
    });
    return () => {
      disposed = true;
      abort.abort();
      observer.disconnect();
      player?.destroy();
      parser?.destroy();
    };
  }, []);
  return (
    <span className="ed-seal" aria-hidden="true">
      <Ticket />
      <canvas ref={canvas} width={120} height={120} />
    </span>
  );
}
