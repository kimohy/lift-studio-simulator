export const GRAND_CAFE_MENU = [
  '아이스 시그니처 바닐라빈 라떼 ☕',
  '벨기에 다크 초콜릿 크루아상 🥐',
  '얼그레이 베르가못 밀크티 🫖',
  '무화과 & 마스카포네 타르트 🍰',
];

export const FAST_TRAVEL_SPOTS = [
  {
    id: 'lobby-reception',
    label: '1층 · 로비 & 리셉션',
    subtitle: '프런트 데스크 체크인 및 301호 키카드 수령',
    floor: 5,
    zone: 'lobby',
    x: -4.8,
    z: 19.2,
    yaw: 0.1,
    pitch: -0.04,
  },
  {
    id: 'grand-cafe',
    label: '1층 · 그랜드 카페 & 라운지',
    subtitle: '바리스타 커피·디저트 주문 및 테이블 휴식',
    floor: 5,
    zone: 'lobby',
    x: 6.2,
    z: 16.0,
    yaw: -0.35,
    pitch: -0.04,
  },
  {
    id: 'room-301',
    label: '3층 · 301호 객실',
    subtitle: '스마트 TV·전동 커튼·침대·샤워·룸서비스 태블릿',
    floor: 7,
    zone: 'lobby',
    x: -1.38,
    z: 2.85,
    yaw: Math.PI,
    pitch: -0.04,
  },
  {
    id: 'rooftop-pool',
    label: '10층 · 루프탑 인피니티 풀 & 스카이 바',
    subtitle: '온수 수영장·월풀 자쿠지·선베드·칵테일 바',
    floor: 14,
    zone: 'pool',
    x: 0.0,
    z: 13.2,
    yaw: Math.PI,
    pitch: -0.04,
  },
  {
    id: 'parking-b1',
    label: 'B1 · 지하 주차장 & 차량 경사로',
    subtitle: '주차 차량 점검 및 B1~B5 워킹 경사로',
    floor: 4,
    zone: 'lobby',
    x: 0.5,
    z: 11.5,
    yaw: Math.PI,
    pitch: -0.04,
  },
];

export const TOUR_CHECKLIST = [
  { id: 'checkIn', title: '1층 리셉션 체크인 & 301호 키카드 수령' },
  { id: 'cafeLounge', title: '1층 그랜드 카페 주문 또는 라운지 휴식' },
  { id: 'verticalTransit', title: '엘리베이터·계단·에스컬레이터 층간 이동' },
  { id: 'room301', title: '3층 301호 객실 입실 & 편의시설 체험' },
  { id: 'roomService', title: 'AI 서빙 로봇 딜리(DELI) 룸서비스 주문' },
  { id: 'rooftopPool', title: '10층 루프탑 인피니티 풀 & 스카이 바 체험' },
];

export class HotelStay {
  constructor() {
    this.keycard = null;
    this.cafeIndex = 0;
    this.lastCafeItem = null;
    this.completed = new Set();
  }

  canAccess(room) {
    return this.keycard?.room === String(room);
  }

  checkIn(staffId) {
    if (!/^reception-/.test(staffId ?? '')) return null;
    this.keycard ??= { room: '301', floor: '3', hotel: 'GRAND HOTEL' };
    this.completeMilestone('checkIn');
    return this.keycard;
  }

  completeMilestone(id) {
    if (TOUR_CHECKLIST.some((item) => item.id === id)) {
      this.completed.add(id);
    }
  }

  getChecklistStatus() {
    const items = TOUR_CHECKLIST.map((item) => ({
      ...item,
      done: this.completed.has(item.id),
    }));
    const doneCount = items.filter((i) => i.done).length;
    return {
      items,
      doneCount,
      totalCount: items.length,
      percent: Math.round((doneCount / items.length) * 100),
    };
  }

  orderCafe() {
    const item = GRAND_CAFE_MENU[this.cafeIndex % GRAND_CAFE_MENU.length];
    this.cafeIndex++;
    this.lastCafeItem = item;
    this.completeMilestone('cafeLounge');
    return {
      ok: true,
      item,
      message: `☕ 바리스타 서연: "주문하신 [${item}] 준비해 드렸습니다! 카페 테이블이나 로비 소파에 앉아 여유롭게 즐겨 보세요."`,
    };
  }

  sitAtCafe(player, seatX = 5.0, seatZ = 12.1, seatYaw = 0) {
    if (player && player.floor === 5) {
      player.x = seatX;
      player.z = seatZ;
      player.yaw = seatYaw;
      player.pitch = -0.04;
      player.zone = 'lobby';
    }
    this.completeMilestone('cafeLounge');
    const suffix = this.lastCafeItem
      ? `주문한 [${this.lastCafeItem}]의 향긋한 풍미를 즐깁니다.`
      : '은은한 에스프레소 향과 함께 여유로운 티타임을 보냅니다.';
    return {
      ok: true,
      message: `🪑 그랜드 카페 테이블에 착석했습니다. ${suffix}`,
    };
  }

  sitAtLounge(player, seatX = -6.2, seatZ = 13.6, seatYaw = -Math.PI / 2) {
    if (player && player.floor === 5) {
      player.x = seatX;
      player.z = seatZ;
      player.yaw = seatYaw;
      player.pitch = -0.03;
      player.zone = 'lobby';
    }
    this.completeMilestone('cafeLounge');
    return {
      ok: true,
      message: '🛋️ 1층 로비 라운지 소파에 편안히 앉아 화려한 샹들리에와 호텔 로비 풍경을 감상합니다.',
    };
  }

  inspectCar(carData = {}) {
    const label = carData.carName || '호텔 VIP 세단';
    const floorLabel = carData.floorLabel || '지하 주차장';
    return {
      ok: true,
      message: `🚗 [${floorLabel} · ${label}] 스마트키가 반응하며 헤드라이트와 웰컴 라이트가 점등됩니다. 발레파킹 점검 완료 상태입니다.`,
    };
  }
}

