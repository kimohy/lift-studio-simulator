const PARKING = Object.freeze({ kind: 'parking', ko: '주차장', en: 'PARKING' });
const LOBBY = Object.freeze({ kind: 'lobby', ko: '로비', en: 'LOBBY' });
const GUEST = Object.freeze({ kind: 'guest', ko: '호텔 객실', en: 'GUEST ROOMS' });

export const floorUsage = (index) => (index < 5 ? PARKING : index === 5 ? LOBBY : GUEST);

export function floorMeta(index, floorName = '') {
  const usage = floorUsage(index);
  if (index === 14) {
    return {
      ...usage,
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
    badge: usage.kind === 'guest' ? '객실' : usage.ko,
    title: `${floorName}층 · ${usage.ko}`,
    signKo: `${floorName} · ${usage.ko}`,
    signEn: usage.en,
    sideKo: usage.kind === 'parking' ? `P · ${floorName}` : usage.ko,
    sideEn: usage.en,
  };
}

