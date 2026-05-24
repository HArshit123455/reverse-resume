"use client";

import { useEffect, useRef } from "react";

interface MatrixOverlayProps {
  onDone: () => void;
}

const GLYPHS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ0123456789";

export function MatrixOverlay({ onDone }: MatrixOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const t = window.setTimeout(onDone, 50);
      return () => window.clearTimeout(t);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    function resize() {
      if (!canvas || !ctx) return;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    resize();

    const fontSize = 16;
    const cols = Math.floor(window.innerWidth / fontSize);
    const drops = new Array(cols).fill(0).map(() => Math.random() * -50);

    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() ||
      "#34d399";

    let raf = 0;
    const start = performance.now();
    function frame(t: number) {
      if (!ctx || !canvas) return;
      ctx.fillStyle = "rgba(12,13,15,0.18)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.fillStyle = accent;
      ctx.font = `${fontSize}px var(--mono), monospace`;
      for (let i = 0; i < drops.length; i++) {
        const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillText(ch, x, y);
        if (y > window.innerHeight && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      if (t - start < 8000) {
        raf = requestAnimationFrame(frame);
      } else {
        onDone();
      }
    }
    raf = requestAnimationFrame(frame);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[150]"
      style={{ background: "rgba(12,13,15,0.7)" }}
    />
  );
}

export default MatrixOverlay;
