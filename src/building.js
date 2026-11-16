const PARKING = Object.freeze({ kind: 'parking', ko: '주차장', en: 'PARKING' });
const LOBBY = Object.freeze({ kind: 'lobby', ko: '로비', en: 'LOBBY' });
const GUEST = Object.freeze({ kind: 'guest', ko: '호텔 객실', en: 'GUEST ROOMS' });

export const floorUsage = (index) => (index < 5 ? PARKING : index === 5 ? LOBBY : GUEST);

const FLOOR_DESCS = {
  14: '루프탑 인피니티 풀, 온수 자쿠지 스파, 스카이 파노라마 전망대 & 바',
  13: '프레지덴셜 스위트 & 이그제큐티브 스위트 객실',
  12: '스카이 뷰 프리미엄 디럭스 객실',
  11: '고층 시티뷰 슈페리어 객실',
  10: '비즈니스 라운지 & 디럭스 객실',
  9: '가든 뷰 슈페리어 객실',
  8: '모던 디럭스 객실',
  7: '체험 객실 301호 & 스탠다드 디럭스 객실',
  6: '스탠다드 객실 & 코인 세탁실',
  5: '호텔 메인 로비, 리셉션 데스크, 그랜드 카페 & 라운지',
  4: '지하 1층 주차장 (B1), 호텔 발레파킹 구역 & 전기차 충전소',
  3: '지하 2층 주차장 (B2), 호텔 투숙객 전용 주차 구역',
  2: '지하 3층 주차장 (B3), 장기 주차 구역 & 차량 정비소',
  1: '지하 4층 주차장 (B4), 일반 및 대형 차량 주차 구역',
  0: '지하 5층 주차장 (B5), 호텔 최하층 주차 구역 & 기계실',
};

export function floorMeta(index, floorName = '') {
  const usage = floorUsage(index);
  const desc = FLOOR_DESCS[index] || `${floorName}층 편의시설`;
  if (index === 14) {
    return {
      ...usage,
      desc,
      badge: '루프탑 풀',
      title: '10층 · 루프탑 인피니티 풀 & 스카이 바',
      signKo: '10F · 루프탑 수영장',
      signEn: 'ROOFTOP POOL & SKY BAR',
      sideKo: '루프탑 수영장',
      sideEn: 'ROOFTOP POOL',
    };
  }
  if (index === 7) {
    return {
      ...usage,
      desc,
      badge: '301호 · 객실',
      title: '3층 · 301호 & 호텔 객실',
      signKo: `${floorName} · ${usage.ko}`,
      signEn: usage.en,
      sideKo: usage.ko,
      sideEn: usage.en,
    };
  }
  return {
    ...usage,
    desc,
    badge: usage.kind === 'guest' ? '객실' : usage.ko,
    title: `${floorName}층 · ${usage.ko}`,
    signKo: `${floorName} · ${usage.ko}`,
    signEn: usage.en,
    sideKo: usage.kind === 'parking' ? `P · ${floorName}` : usage.ko,
    sideEn: usage.en,
  };
}

export const MALL_VALID_FLOORS = Object.freeze([0, 1, 2, 3, 4, 5, 7, 9, 11, 13]);
export const MALL_MAX_FLOOR = 13;

export function normalizeMallFloor(index) {
  const n = Number(index) | 0;
  if (n <= 0) return 0;
  if (n <= 4) return n;
  if (n >= 13) return 13;
  return n % 2 === 0 ? n - 1 : n;
}

const MALL_FLOOR_SPECS = Object.freeze({
  0: { floor: 'B5', mallCode: 'B5', ko: '몰 지하주차장 B5 · EV 존', en: 'MALL PARKING B5 · EV ZONE', zone: 'parking' },
  1: { floor: 'B4', mallCode: 'B4', ko: '몰 지하주차장 B4 · 호텔 직결', en: 'MALL PARKING B4 · HOTEL LINK', zone: 'parking' },
  2: { floor: 'B3', mallCode: 'B3', ko: '몰 지하주차장 B3', en: 'MALL PARKING B3', zone: 'parking' },
  3: { floor: 'B2', mallCode: 'B2', ko: '몰 지하주차장 B2 · 급속충전', en: 'MALL PARKING B2 · SUPERCHARGER', zone: 'parking' },
  4: { floor: 'B1', mallCode: 'B1', ko: '몰 지하주차장 B1 · 발렛 & 픽업', en: 'MALL PARKING B1 · VALET & PICKUP', zone: 'parking' },
  5: { floor: '1', mallCode: 'M1F', ko: 'M1F 그랜드 아트리움 · 럭셔리 부티크', en: 'M1F LUXURY BOUTIQUE · ATRIUM', zone: 'atrium' },
  7: { floor: '3', mallCode: 'M2F', ko: 'M2F 컨템포러리 패션 · 별마당 도서관', en: 'M2F FASHION · STARFIELD LIBRARY', zone: 'retail' },
  9: { floor: '5', mallCode: 'M3F', ko: 'M3F 테크 플래그십 · 스카이브리지', en: 'M3F TECH FLAGSHIP · SKYBRIDGE', zone: 'retail' },
  11: { floor: '7', mallCode: 'M4F', ko: 'M4F 고메 스트리트 · 사운즈 포레스트', en: 'M4F GOURMET · SOUNDS FOREST', zone: 'dining' },
  13: { floor: '9', mallCode: 'M5F', ko: 'M5F 그랜드 시네마 멀티플렉스 (IMAX)', en: 'M5F GRAND CINEMA MULTIPLEX', zone: 'cinema' },
});

export function mallFloorMeta(index, floorName = '') {
  const snapped = normalizeMallFloor(index);
  const entry = MALL_FLOOR_SPECS[snapped];
  return {
    floor: floorName || entry.floor,
    mallCode: entry.mallCode,
    ko: entry.ko,
    en: entry.en,
    zone: entry.zone,
    isParking: snapped < 5,
    isAtrium: snapped >= 5,
  };
}

