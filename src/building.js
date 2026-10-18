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
      title: '10층 · 루프탑 인피니티 풀 & 객실',
      signKo: '10 · 루프탑 수영장 · 객실',
      signEn: 'ROOFTOP POOL & SUITES',
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

