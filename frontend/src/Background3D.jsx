import { useEffect, useRef } from "react";
import Cube from "./Cube.jsx";

// Animated 3D scene behind the app:
//  - canvas: a rotating network globe (real 3D projection) + depth starfield, reacts to the mouse
//  - CSS: aurora blobs, spinning 3D rings, floating cubes
export default function Background3D() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    const mouse = { x: 0, y: 0 };
    const view = { x: 0, y: 0 };

    // --- Globe points (Fibonacci sphere) and edges between near neighbours ---
    const N = 84;
    const base = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = Math.PI * (3 - Math.sqrt(5)) * i;
      base.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r });
    }
    const edges = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = base[i].x - base[j].x;
        const dy = base[i].y - base[j].y;
        const dz = base[i].z - base[j].z;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.62) edges.push([i, j]);
      }
    }

    // --- Starfield dust ---
    const STAR_COUNT = 130;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random() * 0.95 + 0.05,
      hue: 190 + Math.random() * 100,
    }));

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) draw(0);
    }

    function onPointer(e) {
      mouse.x = (e.clientX / w - 0.5) * 2;
      mouse.y = (e.clientY / h - 0.5) * 2;
    }

    function draw(t) {
      view.x += (mouse.x - view.x) * 0.05;
      view.y += (mouse.y - view.y) * 0.05;
      ctx.clearRect(0, 0, w, h);

      // Stars: move toward the viewer, shifted a little by the mouse (parallax)
      for (const s of stars) {
        if (!reduce) s.z -= 0.0007;
        if (s.z <= 0.04) {
          s.z = 1;
          s.x = Math.random() * 2 - 1;
          s.y = Math.random() * 2 - 1;
        }
        const sx = w / 2 + (s.x / s.z) * w * 0.22 - view.x * 24 * (1 - s.z);
        const sy = h / 2 + (s.y / s.z) * h * 0.22 - view.y * 24 * (1 - s.z);
        if (sx < 0 || sx > w || sy < 0 || sy > h) continue;
        const size = (1 - s.z) * 2.2 + 0.3;
        ctx.fillStyle = `hsla(${s.hue}, 100%, 78%, ${(1 - s.z) * 0.85})`;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Globe
      const R = Math.min(w, h) * 0.46;
      const cx = w * 0.5 + view.x * 30;
      const cy = h * 0.5 + view.y * 20;
      const ay = t * 0.00012 + view.x * 0.5;
      const ax = 0.35 + view.y * 0.35;
      const cY = Math.cos(ay);
      const sY = Math.sin(ay);
      const cX = Math.cos(ax);
      const sX = Math.sin(ax);
      const fov = 3;

      const proj = base.map((p) => {
        const x1 = p.x * cY + p.z * sY;
        const z1 = -p.x * sY + p.z * cY;
        const y2 = p.y * cX - z1 * sX;
        const z2 = p.y * sX + z1 * cX;
        const s = fov / (fov - z2);
        return {
          sx: cx + x1 * R * s * 0.8,
          sy: cy + y2 * R * s * 0.8,
          d: (z2 + 1) / 2,
          s,
        };
      });

      ctx.lineWidth = 1;
      for (const [i, j] of edges) {
        const a = proj[i];
        const b = proj[j];
        const alpha = ((a.d + b.d) / 2) * 0.3 + 0.04;
        ctx.strokeStyle = `rgba(120, 170, 255, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }

      for (const p of proj) {
        const r = (1.1 + p.d * 2.4) * p.s;
        const hue = 200 + (1 - p.d) * 80;
        if (p.d > 0.7) {
          ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.12)`;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `hsla(${hue}, 100%, 72%, ${0.25 + p.d * 0.7})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop(t) {
      draw(t);
      raf = requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer);
    if (!reduce) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return (
    <div className="bg" aria-hidden="true">
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      <canvas ref={canvasRef} />
      <div className="shapes">
        <div className="ring r1" />
        <div className="ring r2" />
        <div className="ring r3" />
        <div className="float f1">
          <Cube size={56} style={{ "--spin": "16s" }} />
        </div>
        <div className="float f2">
          <Cube size={38} style={{ "--spin": "11s" }} />
        </div>
        <div className="float f3">
          <Cube size={30} style={{ "--spin": "9s" }} />
        </div>
      </div>
    </div>
  );
}
