const PARKING = Object.freeze({ kind: 'parking', ko: '주차장', en: 'PARKING' });
const LOBBY = Object.freeze({ kind: 'lobby', ko: '로비', en: 'LOBBY' });
const GUEST = Object.freeze({ kind: 'guest', ko: '호텔 객실', en: 'GUEST ROOMS' });

export const floorUsage = (index) => (index < 5 ? PARKING : index === 5 ? LOBBY : GUEST);
