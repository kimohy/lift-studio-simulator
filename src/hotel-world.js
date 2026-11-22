const between = (v, a, b) => v >= a - 1e-7 && v <= b + 1e-7;
const inside = (x, z, a, b, c, d) => between(x, a, b) && between(z, c, d);

export const MALL_LIFT_X = -26.4;
export const MALL_LIFT_2_X = -29.6;
export const MALL_LIFT_Z = 10.0;
export const MALL_VALID_FLOORS = Object.freeze([0, 1, 2, 3, 4, 5, 7, 9, 11, 13]);
export const MALL_MAX_FLOOR = 13;

export class HotelWorld {
  constructor() {
    this.obstacles = [];
    this.cinemaGateOpen = false;
    this.openRooms = new Set();
  }

  isRoomOpen(roomNumber) {
    return this.openRooms.has(String(roomNumber));
  }

  setRoomOpen(roomNumber, open) {
    const key = String(roomNumber);
    if (open) this.openRooms.add(key);
    else this.openRooms.delete(key);
    return this.openRooms.has(key);
  }

  isWalkInGuestArea(x, z, floor) {
    if (!Number.isInteger(floor) || floor < 6 || floor > 14) return false;
    // Expanded West Wing Executive Club Lounge (2F–10F)
    if (inside(x, z, -9.35, -2.28, 1.5, 7.55)) return true;
    if (floor === 14) return false;
    const prefix = floor - 4;
    if (floor === 7) {
      return this.openRooms.has('302') && inside(x, z, 7.78, 12.82, 3.85, 12.42);
    }
    if (
      this.openRooms.has(`${prefix}01`) &&
      (inside(x, z, -1.78, -0.98, 3.3, 4.1) ||
        inside(x, z, -2.25, -0.18, 3.8, 8.4) ||
        inside(x, z, -9.2, -0.18, 8.35, 14.8))
    ) {
      return true;
    }
    if (
      this.openRooms.has(`${prefix}02`) &&
      (inside(x, z, 0.98, 1.78, 3.3, 4.1) ||
        inside(x, z, 0.18, 2.25, 3.8, 8.8) ||
        inside(x, z, 0.18, 8.6, 8.75, 14.8))
    ) {
      return true;
    }
    return false;
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
    if (!Number.isInteger(floor) || !MALL_VALID_FLOORS.includes(floor)) return false;
    // 1F Glass Connecting Vestibule linking Grand Hotel Lobby and Mall M1F Atrium (z ∈ [14.4, 17.6])
    if (floor === 5 && inside(x, z, -14.6, -11.4, 14.4, 17.6)) return true;
    // Unified Underground Parking connection portals along x = -14 on B5..B1
    if (floor < 5 && (inside(x, z, -14.6, -13.4, 14.6, 17.4) || inside(x, z, -14.6, -13.4, 19.1, 25.3))) {
      return true;
    }
    // M1F Outdoor Mall Entrance Plaza (connects seamlessly to Hotel Entrance Plaza)
    if (floor === 5 && inside(x, z, -49.6, -14.0, 36.3, 47.7)) {
      return true;
    }
    // M1F South Curtain-Wall Automatic Entrance Aperture
    if (floor === 5 && inside(x, z, -33.8, -30.2, 35.2, 36.4)) {
      return true;
    }
    // Exclude Dual Mall Panoramic Elevator Shafts & Landing Thresholds (Car A @ -26.4, Car B @ -29.6, z = 10.0)
    if (
      inside(x, z, MALL_LIFT_2_X - 1.35, MALL_LIFT_X + 1.35, MALL_LIFT_Z - 1.2, MALL_LIFT_Z + 1.45)
    ) {
      return false;
    }
    // B5..B1 Unified Mall Underground Parking (main garage z ∈ [8.2, 35.6] + north lift promenade)
    if (floor < 5) {
      return inside(x, z, -49.6, -14.2, 8.2, 35.6) || inside(x, z, -34.0, -14.2, 4.6, 8.5);
    }
    if (!inside(x, z, -49.6, -14.2, 4.6, 35.4)) return false;
    // M1F (floor 5, 7m ceiling) Full Grand Atrium Floor
    if (floor === 5) return true;
    // M5F (floor 13, 7m ceiling) Top-Floor Grand Cinema & Sky Observatory (twin atrium lightwells north of central escalators)
    if (floor === 13) {
      return !inside(x, z, -34.6, -31.2, 13.2, 16.2) && !inside(x, z, -25.6, -22.2, 13.2, 16.2);
    }
    // M2F (7), M3F (9), M4F (11) Wide Gallery Corridors around Central Atrium Void (x ∈ [-40.0, -22.0], z ∈ [12.8, 27.2])
    const inVoid = inside(x, z, -40.0, -22.0, 12.8, 27.2);
    if (!inVoid) return true;
    // Central Mall Escalator Landings on M2F (7), M3F (9), M4F (11) connecting East/West galleries directly to Escalators
    if (
      (floor === 7 || floor === 9 || floor === 11) &&
      (inside(x, z, -40.0, -37.0, 17.2, 24.6) || inside(x, z, -25.0, -22.0, 17.2, 24.6))
    ) {
      return true;
    }
    return false;
  }

  isExtendedArea(x, z, floor) {
    if (this.isMallArea(x, z, floor)) return true;
    if (this.isWalkInGuestArea(x, z, floor)) return true;
    // Repurposed Hotel West Wing Lounges (formerly escalator wing)
    if (floor <= 5 && inside(x, z, -11.4, -2.28, 1.45, 8.0)) return true;
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
    if (floor === 13) {
      // M5F IMAX Auditorium 1 Acoustic Enclosure (East wall x = -39.6, North wall z = 13.6)
      if (inside(x, z, -39.82, -39.38, 13.4, 35.5)) return false;
      if (
        inside(x, z, -49.8, -39.4, 13.35, 13.85) &&
        !(this.cinemaGateOpen && inside(x, z, -43.0, -40.8, 13.3, 13.9))
      ) {
        return false;
      }
    }
    if (this.isMallArea(x, z, floor)) return true;
    // Vestibule left wall (x = -2.54): only passable through the 1.1m doorway (z ∈ [1.80, 2.90])
    if (inside(x, z, -2.68, -2.4, 1.2, 7.85) && !inside(x, z, -2.72, -2.35, 1.8, 2.9)) {
      return false;
    }
    if (this.isWalkInGuestArea(x, z, floor)) return true;
    // Repurposed Hotel West Wing Lounges
    if (floor <= 5 && inside(x, z, -11.5, -2.28, 7.75, 8.2)) {
      // On 1F & parking, doorway along z = 8.0 is at x ∈ [-7.85, -5.75]
      return inside(x, z, -7.85, -5.75, 7.7, 8.25);
    }
    if (floor <= 5 && inside(x, z, -11.4, -2.28, 1.45, 8.0)) return true;
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
    if (floor > 14) return null;
    const mallHere = this.isMallArea(x, z, floor);
    const guestZoneHere = this.isWalkInGuestArea(x, z, floor);
    if (floor > 5 && !mallHere && !guestZoneHere) return null;
    const maxF = mallHere || x <= -10.0 ? MALL_MAX_FLOOR : floor >= 6 ? 14 : 5;
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
    if (player.zone === 'mallCabin') return '그랜드 몰 듀얼 전망 엘리베이터';
    if (player.x <= -14.0 || (player.x <= -11.5 && player.z >= 14.2 && player.z <= 17.8 && player.floor === 5)) {
      if (player.floor < 5) return '그랜드 몰 · 통합 지하주차장';
      if (player.floor === 5) {
        if (player.z > 36) return '그랜드 몰 · 야외 광장';
        if (player.z > 27) return '그랜드 몰 · M1F 워터폴 가든';
        if (player.x < -40) return '그랜드 몰 · M1F 명품 부티크';
        if (player.x > -14.2) return '호텔 ↔ 몰 1F 연결 베스티뷸';
        return '그랜드 몰 · M1F 럭셔리 아트리움';
      }
      if (player.floor === 7) {
        if (player.x < -40) return '그랜드 몰 · M2F 별마당 도서관';
        return '그랜드 몰 · M2F 패션 & 뷰티 스트리트';
      }
      if (player.floor === 9) {
        if (inside(player.x, player.z, -40.5, -21.5, 17.0, 24.8)) return '그랜드 몰 · M3F 아트리움 스카이브리지';
        return '그랜드 몰 · M3F 테크 플래그십 라운지';
      }
      if (player.floor === 11) {
        if (inside(player.x, player.z, -40.5, -21.5, 17.0, 24.8)) return '그랜드 몰 · M4F 아트리움 스카이워크';
        return '그랜드 몰 · M4F 고메 & 사운즈 포레스트';
      }
      if (player.floor === 13) {
        if (player.x < -39 && player.z > 13) return '그랜드 몰 · M5F IMAX 상영관';
        return '그랜드 몰 · M5F 그랜드 시네마';
      }
      return '그랜드 몰';
    }
    if (player.x < -2.3 && player.z <= 8.0) {
      if (player.floor === 5) return '호텔 · 1F VIP 아트 갤러리 & 샴페인 라운지';
      if (player.floor < 5) return '지하주차장 · VIP 발레 라운지';
      return '웨스트 윙 · 이그제큐티브 클럽 라운지';
    }
    if (player.floor >= 6 && player.floor <= 13 && player.z >= 3.8) {
      if (player.floor === 7 && player.x >= 7.5) return '3층 · 302호 패밀리 트윈 룸';
      if (player.floor !== 7) {
        const prefix = player.floor - 4;
        const roomNum = `${prefix}${player.x < 0 ? '01' : '02'}`;
        if (player.floor === 13) {
          return player.x < 0
            ? `9층 · ${roomNum}호 프레지덴셜 펜트하우스 스위트`
            : `9층 · ${roomNum}호 로열 이그제큐티브 스위트`;
        }
        if (player.floor >= 11) return `${prefix}층 · ${roomNum}호 스카이 프리미어 스위트`;
        if (player.floor >= 9) return `${prefix}층 · ${roomNum}호 주니어 스위트`;
        return `${prefix}층 · ${roomNum}호 ${player.x < 0 ? '디럭스 킹 룸' : '패밀리 트윈 룸'}`;
      }
    }
    if (player.floor < 5) return '주차장';
    if (player.floor > 5) return '호텔 객실';
    if (player.z > 26) return '호텔 진입로';
    if (player.x > 3 && player.z > 10) return '로비 · 카페';
    if (player.x < -2 && player.z > 19) return '로비 · 리셉션';
    return '로비';
  }
}
