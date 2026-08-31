// Altitude-aware Douglas-Peucker in frame meters. z deviation is weighted 3x
// so altitude changes survive decimation on otherwise-straight legs.

const Z_WEIGHT = 3;

// perpendicular distance of p from segment a-b in z-scaled space
function deviation(p, a, b) {
  const ax = a[0], ay = a[1], az = a[2] * Z_WEIGHT;
  const dx = b[0] - ax, dy = b[1] - ay, dz = b[2] * Z_WEIGHT - az;
  const px = p[0] - ax, py = p[1] - ay, pz = p[2] * Z_WEIGHT - az;
  const len2 = dx * dx + dy * dy + dz * dz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, (px * dx + py * dy + pz * dz) / len2)) : 0;
  const ex = px - t * dx, ey = py - t * dy, ez = pz - t * dz;
  return Math.sqrt(ex * ex + ey * ey + ez * ez);
}

/** Boolean keep-mask for Douglas-Peucker at tolerance eps (meters). */
export function dpMask(points, eps) {
  const n = points.length;
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    if (j - i < 2) continue;
    let maxD = -1, maxK = -1;
    for (let k = i + 1; k < j; k++) {
      const d = deviation(points[k], points[i], points[j]);
      if (d > maxD) { maxD = d; maxK = k; }
    }
    if (maxD > eps) {
      keep[maxK] = 1;
      stack.push([i, maxK], [maxK, j]);
    }
  }
  return keep;
}

/**
 * Decimate points ([x,y,z] frame meters) to at most `target` points by binary
 * searching the DP epsilon (<=20 iterations). Endpoints always survive.
 */
export function decimateToCount(points, target) {
  target = Math.max(2, target);
  if (points.length <= target) return points.slice();

  let lo = 0; // keeps everything
  let hi = 1;
  while (maskCount(dpMask(points, hi)) > target && hi < 1e7) hi *= 4;

  let best = dpMask(points, hi);
  for (let it = 0; it < 20; it++) {
    const mid = (lo + hi) / 2;
    const mask = dpMask(points, mid);
    if (maskCount(mask) > target) lo = mid;
    else { hi = mid; best = mask; }
  }
  const out = [];
  for (let k = 0; k < points.length; k++) if (best[k]) out.push(points[k]);
  return out;
}

function maskCount(mask) {
  let c = 0;
  for (let k = 0; k < mask.length; k++) c += mask[k];
  return c;
}
