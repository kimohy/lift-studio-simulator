const between = (v, a, b) => v >= a - 1e-7 && v <= b + 1e-7;
const inside = (x, z, a, b, c, d) => between(x, a, b) && between(z, c, d);

export class HotelWorld {
  constructor() {
    this.obstacles = [];
  }

  addObstacle(floor, minX, maxX, minZ, maxZ) {
    this.obstacles.push({ floor, minX, maxX, minZ, maxZ });
  }

  isRamp(x, z, nearY = null) {
    if (!(inside(x, z, 12, 16.6, 10, 34) || inside(x, z, 18, 22.6, 10, 34))) {
      return false;
    }
    if (nearY === null) return true;
    for (let f = 0; f < 5; f++) {
      if (!between(x, f % 2 === 0 ? 12 : 18, f % 2 === 0 ? 16.6 : 22.6)) continue;
      const t = f % 2 === 0 ? (z - 10) / 24 : (34 - z) / 24;
      if (Math.abs((f - 5) * 3.5 + t * 3.5 - nearY) < 0.025) return true;
    }
    return false;
  }

  isExtendedArea(x, z, floor) {
    if (floor > 5) return false;
    return (
      inside(x, z, 7.5, 10.5, 2, 8) ||
      inside(x, z, 2.4, 10.5, 36, 42) ||
      inside(x, z, -2.28, 2.28, 3.42, 8.3) ||
      inside(x, z, -14, 24, 8, 42) ||
      inside(x, z, 10.5, 24, 2, 10) ||
      inside(x, z, -14, 24, 26, 48)
    );
  }

  flatArea(x, z, floor) {
    if (inside(x, z, -2.28, 2.28, 3.42, 8.3)) return true;
    if (floor < 5) {
      const front = floor % 2 === 0;
      return (
        inside(x, z, -13.7, 10.5, 8, 36) ||
        (front
          ? inside(x, z, 7.7, 10.5, 2.3, 8) || inside(x, z, 10.5, 23.7, 2.3, 10)
          : inside(x, z, 2.7, 10.5, 36, 41.7) || inside(x, z, 10.5, 23.7, 34, 41.7))
      );
    }
    if (floor !== 5) return false;
    if (inside(x, z, -11.7, 11.3, 8, 25.75)) return true;
    if (inside(x, z, -1.1, 1.1, 25.75, 26.3)) return true;
    return (
      (inside(x, z, -13.7, 23.7, 26.3, 47.7) && !inside(x, z, 11.8, 16.8, 26.3, 34 - 1e-6)) ||
      inside(x, z, 12, 16.6, 34, 40)
    );
  }

  surfaceAt(x, z, nearY, floor) {
    if (floor > 5) return null;
    const candidates = [];
    for (let f = 0; f <= 5; f++) {
      if (this.flatArea(x, z, f)) candidates.push((f - 5) * 3.5);
    }
    if (this.isRamp(x, z)) {
      for (let f = 0; f < 5; f++) {
        if (!between(x, f % 2 === 0 ? 12 : 18, f % 2 === 0 ? 16.6 : 22.6)) continue;
        const t = f % 2 === 0 ? (z - 10) / 24 : (34 - z) / 24;
        candidates.push((f - 5) * 3.5 + t * 3.5);
      }
    }
    const y = candidates.sort((a, b) => Math.abs(a - nearY) - Math.abs(b - nearY))[0];
    if (y === undefined || Math.abs(y - nearY) > 0.08) return null;
    const level = Math.round(y / 3.5) + 5;
    if (
      this.obstacles.some(
        (o) =>
          o.floor === level &&
          Math.abs(y - (level - 5) * 3.5) < 0.15 &&
          inside(x, z, o.minX - 0.2, o.maxX + 0.2, o.minZ - 0.2, o.maxZ + 0.2)
      )
    ) {
      return null;
    }
    return y;
  }

  location(player) {
    if (player.zone === 'ramp') return '차량 경사로';
    if (player.floor < 5) return '주차장';
    if (player.floor > 5) return '호텔 객실';
    if (player.z > 26) return '호텔 진입로';
    if (player.x > 3 && player.z > 10) return '로비 · 카페';
    if (player.x < -2 && player.z > 19) return '로비 · 리셉션';
    return '로비';
  }
}
