const between = (v, a, b) => v >= a - 1e-7 && v <= b + 1e-7;
const inside = (x, z, a, b, c, d) => between(x, a, b) && between(z, c, d);

export const MALL_LIFT_X = -28.0;
export const MALL_LIFT_Z = 6.2;
export const MALL_MAX_FLOOR = 10;

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

  isMallArea(x, z, floor) {
    if (!Number.isInteger(floor) || floor < 0 || floor > MALL_MAX_FLOOR) return false;
    // Escalator side connection bridge (x ∈ [-14.5, -10.0], z ∈ [5.25, 7.55]) across B5..6F
    if (inside(x, z, -14.5, -10.0, 5.25, 7.55)) return true;
    // Underground parking connection portals along x = -14 on B5..B1
    if (floor < 5 && (inside(x, z, -14.6, -13.5, 14.7, 17.1) || inside(x, z, -14.6, -13.5, 19.4, 25.2))) {
      return true;
    }
    // 1F Outdoor Mall Entrance Plaza (connects seamlessly to Hotel Entrance Plaza)
    if (floor === 5 && inside(x, z, -49.6, -14.0, 36.3, 47.7)) {
      return true;
    }
    // 1F South Curtain-Wall Automatic Entrance Aperture
    if (floor === 5 && inside(x, z, -33.8, -30.2, 35.2, 36.4)) {
      return true;
    }
    // Exclude Mall Panoramic Elevator Shaft & Landing Threshold (x = -28.0, z = 6.2)
    if (inside(x, z, MALL_LIFT_X - 1.35, MALL_LIFT_X + 1.35, MALL_LIFT_Z - 1.35, MALL_LIFT_Z + 1.6)) {
      return false;
    }
    if (!inside(x, z, -49.6, -14.3, 4.6, 35.4)) return false;
    // B5..B1 Mall Underground Parking & 1F Grand Atrium Floor
    if (floor <= 5) return true;
    // 6F Sounds Forest Rooftop Garden (twin atrium lightwells)
    if (floor === 10) {
      return !inside(x, z, -38.5, -31.5, 16.0, 24.0) && !inside(x, z, -24.5, -18.5, 16.0, 24.0);
    }
    // 2F..5F Ring Gallery around Central Atrium Void (x ∈ [-41, -21], z ∈ [12, 28])
    const inVoid = inside(x, z, -41.0, -21.0, 12.0, 28.0);
    if (!inVoid) return true;
    // Walkable Floating Atrium Skybridges on 3F (floor 7) and 5F (floor 9)
    if ((floor === 7 || floor === 9) && inside(x, z, -41.2, -20.8, 18.65, 21.35)) {
      return true;
    }
    return false;
  }

  isExtendedArea(x, z, floor) {
    if (this.isMallArea(x, z, floor)) return true;
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
    if (this.isMallArea(x, z, floor)) return true;
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
    if (floor > MALL_MAX_FLOOR) return null;
    const mallHere = this.isMallArea(x, z, floor);
    if (floor > 5 && !mallHere) return null;
    const maxF = mallHere || x <= -10.0 ? MALL_MAX_FLOOR : 5;
    const candidates = [];
    for (let f = 0; f <= maxF; f++) {
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

  canOccupy(floor, x, z) {
    const y = (floor - 5) * 3.5;
    return this.surfaceAt(x, z, y, floor) !== null;
  }

  location(player) {
    if (player.zone === 'ramp') return '차량 경사로';
    if (player.zone === 'mallCabin') return '그랜드 몰 엘리베이터';
    if (player.x <= -14.0 || (player.x <= -10.8 && player.z >= 5.2 && player.z <= 7.6)) {
      if (player.floor < 5) return '그랜드 몰 · 지하주차장';
      if (player.floor === 5) {
        if (player.z > 36) return '그랜드 몰 · 야외 광장';
        if (player.z > 27) return '그랜드 몰 · 워터폴 가든';
        if (player.x < -41) return '그랜드 몰 · 별마당 서가';
        return '그랜드 몰 · 1F 중앙 아트리움';
      }
      if (player.floor === 10) return '그랜드 몰 · 6F 사운즈 포레스트';
      if ((player.floor === 7 || player.floor === 9) && inside(player.x, player.z, -41.5, -20.5, 18.4, 21.6)) {
        return `그랜드 몰 · ${player.floor - 4}F 스카이브리지`;
      }
      if (player.x < -41 && player.floor <= 8) return `그랜드 몰 · ${player.floor - 4}F 별마당 서가`;
      return `그랜드 몰 · ${player.floor - 4}F 아트리움 갤러리`;
    }
    if (player.floor < 5) return '주차장';
    if (player.floor > 5) return '호텔 객실';
    if (player.z > 26) return '호텔 진입로';
    if (player.x > 3 && player.z > 10) return '로비 · 카페';
    if (player.x < -2 && player.z > 19) return '로비 · 리셉션';
    return '로비';
  }
}
