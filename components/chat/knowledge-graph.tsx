"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GRAPH, type GraphNode } from "@/lib/graph-data";

// Deterministic 3D layout: self at origin, repos on a ring, leaves pushed outward.
function layout(): Map<string, THREE.Vector3> {
  const pos = new Map<string, THREE.Vector3>();
  const repos = GRAPH.nodes.filter((n) => n.group === "repo");
  pos.set("me", new THREE.Vector3(0, 0, 0));
  repos.forEach((r, i) => {
    const a = (i / repos.length) * Math.PI * 2;
    pos.set(r.id, new THREE.Vector3(Math.cos(a) * 2.2, Math.sin(a) * 2.2, (i % 2 === 0 ? 1 : -1) * 0.8));
  });
  GRAPH.nodes
    .filter((n) => n.group === "leaf")
    .forEach((leaf) => {
      const parent = GRAPH.edges.find((e) => e.to === leaf.id)?.from ?? "me";
      const base = pos.get(parent) ?? new THREE.Vector3();
      pos.set(leaf.id, base.clone().multiplyScalar(1.5).add(new THREE.Vector3(0.4, -0.5, 0.6)));
    });
  return pos;
}

function colorFor(group: GraphNode["group"], accent: THREE.Color): THREE.Color {
  if (group === "self") return accent.clone();
  if (group === "repo") return accent.clone().lerp(new THREE.Color("#ffffff"), 0.25);
  return new THREE.Color("#7a849b");
}

export function KnowledgeGraph({ animate = true }: { animate?: boolean }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 320;
    const height = mount.clientHeight || 360;

    const accent = new THREE.Color(
      getComputedStyle(mount).getPropertyValue("--accent").trim() || "#6ea8fe",
    );

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const pos = layout();

    // Edges
    const edgePoints: number[] = [];
    for (const e of GRAPH.edges) {
      const a = pos.get(e.from)!;
      const b = pos.get(e.to)!;
      edgePoints.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgePoints, 3));
    const edgeMat = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.3 });
    const lines = new THREE.LineSegments(edgeGeo, edgeMat);
    group.add(lines);

    // Nodes
    const sphereGeo = new THREE.SphereGeometry(1, 16, 16);
    const meshes: THREE.Mesh[] = [];
    for (const n of GRAPH.nodes) {
      const p = pos.get(n.id)!;
      const r = n.group === "self" ? 0.32 : n.group === "repo" ? 0.18 : 0.1;
      const mat = new THREE.MeshBasicMaterial({ color: colorFor(n.group, accent) });
      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.scale.setScalar(r);
      mesh.position.copy(p);
      group.add(mesh);
      meshes.push(mesh);
    }

    let raf = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const onPointerMove = (ev: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      targetRotY = ((ev.clientX - rect.left) / rect.width - 0.5) * 0.6;
      targetRotX = ((ev.clientY - rect.top) / rect.height - 0.5) * 0.6;
    };
    mount.addEventListener("pointermove", onPointerMove);

    const renderFrame = () => {
      group.rotation.x += (targetRotX - group.rotation.x) * 0.05;
      group.rotation.y += (targetRotY - group.rotation.y) * 0.05 + (animate ? 0.0025 : 0);
      renderer.render(scene, camera);
      if (animate) raf = requestAnimationFrame(renderFrame);
    };
    renderFrame();

    const onResize = () => {
      const w = mount.clientWidth || width;
      const h = mount.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (!animate) renderer.render(scene, camera);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      mount.removeEventListener("pointermove", onPointerMove);
      edgeGeo.dispose();
      edgeMat.dispose();
      sphereGeo.dispose();
      meshes.forEach((m) => (m.material as THREE.Material).dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [animate]);

  return (
    <div
      ref={mountRef}
      data-knowledge-graph
      aria-hidden
      className="h-[360px] w-full overflow-hidden rounded-[12px]"
    />
  );
}
