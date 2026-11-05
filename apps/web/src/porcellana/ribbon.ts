/**
 * The roads (docs/plan-porcellana.md § 1): a ribbon of accent laid on the ground, its corners
 * rounded, white chevrons running toward where the goods go; on the water, dashes of accent.
 */
import {
  BufferGeometry,
  CurvePath,
  Float32BufferAttribute,
  LineCurve3,
  QuadraticBezierCurve3,
  type Vector3,
} from "three";
import { RIBBON } from "./tokens.js";

/** A path through points, its corners rounded by `radius` (never more than half a leg). */
export function roundedPath(pts: Vector3[], radius: number = RIBBON.corner): CurvePath<Vector3> {
  const path = new CurvePath<Vector3>();
  if (pts.length < 2) return path;
  let cur = (pts[0] as Vector3).clone();
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1] as Vector3;
    const b = pts[i] as Vector3;
    const c = pts[i + 1] as Vector3;
    const d1 = b.clone().sub(a);
    const d2 = c.clone().sub(b);
    const rr = Math.min(radius, d1.length() / 2, d2.length() / 2);
    const p1 = b.clone().sub(d1.normalize().multiplyScalar(rr));
    const p2 = b.clone().add(d2.normalize().multiplyScalar(rr));
    if (cur.distanceTo(p1) > 1e-6) path.add(new LineCurve3(cur, p1));
    path.add(new QuadraticBezierCurve3(p1, b.clone(), p2));
    cur = p2;
  }
  path.add(new LineCurve3(cur, (pts.at(-1) as Vector3).clone()));
  return path;
}

/**
 * The ribbon's strip along a curve: two vertices a sample, u the distance walked in chevron
 * periods (so the texture repeats along it), v across. Indexed by quads, so that drawing a share of
 * it (`setDrawRange`) draws the road from its start.
 */
export function ribbonGeometry(
  curve: CurvePath<Vector3>,
  width: number = RIBBON.width,
): BufferGeometry {
  const N = Math.max(8, Math.ceil(curve.getLength() / 0.12));
  const pts = curve.getSpacedPoints(N);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let dist = 0;
  for (let i = 0; i <= N; i++) {
    const p = pts[i] as Vector3;
    const a = pts[Math.max(0, i - 1)] as Vector3;
    const b = pts[Math.min(N, i + 1)] as Vector3;
    const t = b.clone().sub(a).setY(0).normalize();
    const nx = -t.z * (width / 2);
    const nz = t.x * (width / 2);
    if (i > 0) dist += p.distanceTo(pts[i - 1] as Vector3);
    pos.push(p.x + nx, p.y, p.z + nz, p.x - nx, p.y, p.z - nz);
    uv.push(dist / RIBBON.period, 1, dist / RIBBON.period, 0);
    if (i < N) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** How many indices to draw for a share of the road (whole quads only). */
export function drawnIndices(total: number, share: number): number {
  return Math.floor((total * Math.min(1, Math.max(0, share))) / 6) * 6;
}

/** The chevron tile (128×64) on a 2D context: the accent, one white chevron pointing along u. */
export function drawChevron(ctx: CanvasRenderingContext2D, accent: string): void {
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = `rgba(255,255,255,${RIBBON.chevronAlpha})`;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(52, 18);
  ctx.lineTo(74, 32);
  ctx.lineTo(52, 46);
  ctx.stroke();
}

/** Where the dashes of a sea road lie: points and headings, `RIBBON.seaDash` apart. */
export function seaDashes(curve: CurvePath<Vector3>): { p: Vector3; angle: number }[] {
  const n = Math.floor(curve.getLength() / RIBBON.seaDash);
  const out: { p: Vector3; angle: number }[] = [];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const d = curve.getTangentAt(t);
    out.push({ p: curve.getPointAt(t), angle: Math.atan2(-d.z, d.x) });
  }
  return out;
}
