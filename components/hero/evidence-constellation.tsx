"use client";

// Evidence Constellation — a 3D cloud of real repo / project / tech "evidence"
// cards orbiting a central query node. Hand-rolled perspective projection (no
// libraries): auto-rotates, parallax-tilts toward the cursor, and redraws the
// connecting lines every frame by mutating the DOM directly (never React state —
// per-frame setState would be far too slow). All colour comes from --accent /
// theme vars, so dark mode and love-mode "just work".

import { useEffect, useRef, useState } from "react";
import { CONSTELLATION_NODES, CONSTELLATION_EDGES } from "@/lib/constellation-data";

const R = 132; // sphere radius; depth-fade constants below are R and 2R
const PERSP = 760;

// Base 3D positions, computed once: center at origin, evidence on a Fibonacci sphere.
interface BasePoint {
  x: number;
  y: number;
  z: number;
  phase: number;
}
const C_BASE: BasePoint[] = (() => {
  const evid = CONSTELLATION_NODES.length - 1;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pts: BasePoint[] = [];
  let e = 0;
  for (const n of CONSTELLATION_NODES) {
    if (n.center) {
      pts.push({ x: 0, y: 0, z: 0, phase: 0 });
      continue;
    }
    const y = 1 - (e / (evid - 1)) * 2; // 1 → -1
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * e;
    pts.push({
      x: Math.cos(th) * r * R,
      y: y * R * 0.9, // slight vertical squash
      z: Math.sin(th) * r * R,
      phase: e * 1.7,
    });
    e++;
  }
  return pts;
})();

const clamp = (lo: number, hi: number, v: number) => Math.max(lo, Math.min(hi, v));

export function EvidenceConstellation() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);
  const [dims, setDims] = useState({ w: 440, h: 472 });
  // Render only ≥561px — matches the CSS that hides the stage on phones, and
  // crucially keeps the rAF loop from running where nothing is visible.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 561px)");
    const update = () => setVisible(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Keep the SVG sized to the stage.
  useEffect(() => {
    if (!visible) return;
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver((ents) => {
      const r = ents[0].contentRect;
      setDims({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, [visible]);

  // Animation loop.
  useEffect(() => {
    if (!visible) return;
    const stage = stageRef.current;
    if (!stage) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let auto = 0.55;
    let curRX = 0;
    let curRY = 0;
    let tgtRX = 0;
    let tgtRY = 0;

    // Listen on the whole hero so movement over the headline also tilts the cloud.
    const host = (stage.closest("[data-hero]") as HTMLElement | null) ?? stage;
    const onMove = (e: MouseEvent) => {
      const r = stage.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      tgtRY = clamp(-1, 1, nx) * 0.55;
      tgtRX = -clamp(-1, 1, ny) * 0.4;
    };
    const onLeave = () => {
      tgtRY = 0;
      tgtRX = 0;
    };
    host.addEventListener("mousemove", onMove);
    host.addEventListener("mouseleave", onLeave);

    const frame = (t: number) => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      if (!reduce) auto += 0.0015;
      curRX += (tgtRX - curRX) * 0.05;
      curRY += (tgtRY - curRY) * 0.05;
      const ry = auto + curRY;
      const rx = curRX;
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);

      const proj = C_BASE.map((p, i) => {
        const x = p.x;
        let y = p.y;
        const z = p.z;
        if (!reduce && i !== 0) y += Math.sin(t * 0.0009 + p.phase) * 5; // bob
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        const y1 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const s = PERSP / (PERSP - z2);
        return { sx: x1 * s, sy: y1 * s, s, z: z2 };
      });

      proj.forEach((p, i) => {
        const el = nodeRefs.current[i];
        if (!el) return;
        el.style.transform = `translate(-50%,-50%) translate3d(${(cx + p.sx).toFixed(1)}px, ${(
          cy + p.sy
        ).toFixed(1)}px, 0) scale(${p.s.toFixed(3)})`;
        el.style.zIndex = String(1000 + Math.round(p.z));
        const op = 0.34 + ((p.z + R) / (2 * R)) * 0.66;
        el.style.opacity = i === 0 ? "1" : clamp(0.28, 1, op).toFixed(2);
      });

      CONSTELLATION_EDGES.forEach((edge, i) => {
        const ln = lineRefs.current[i];
        if (!ln) return;
        const a = proj[edge[0]];
        const b = proj[edge[1]];
        ln.setAttribute("x1", (cx + a.sx).toFixed(1));
        ln.setAttribute("y1", (cy + a.sy).toFixed(1));
        ln.setAttribute("x2", (cx + b.sx).toFixed(1));
        ln.setAttribute("y2", (cy + b.sy).toFixed(1));
        const avg = (a.z + b.z) / 2;
        ln.style.opacity = (0.07 + ((avg + R) / (2 * R)) * 0.2).toFixed(3);
      });

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener("mousemove", onMove);
      host.removeEventListener("mouseleave", onLeave);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="constellation" ref={stageRef} aria-hidden>
      <svg className="constellation-lines" width={dims.w} height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`}>
        {CONSTELLATION_EDGES.map((e, i) => (
          <line
            key={i}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            className={e[0] === 0 ? "c-line c-line-spoke" : "c-line"}
          />
        ))}
      </svg>
      {CONSTELLATION_NODES.map((n, i) => (
        <div
          key={i}
          ref={(el) => {
            nodeRefs.current[i] = el;
          }}
          className={"cnode" + (n.center ? " cnode-center" : "")}
        >
          {n.center ? (
            <>
              <span className="cnode-q">?</span>
              <span className="cnode-clabel">ask my work</span>
            </>
          ) : (
            <>
              <span className="cnode-dot" />
              <span className="cnode-label">{n.label}</span>
              <span className="cnode-tag">{n.tag}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
