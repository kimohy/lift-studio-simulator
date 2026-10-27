export const GRAND_CAFE_MENU = [
  '아이스 시그니처 바닐라빈 라떼 ☕',
  '벨기에 다크 초콜릿 크루아상 🥐',
  '얼그레이 베르가못 밀크티 🫖',
  '무화과 & 마스카포네 타르트 🍰',
];

export const VIP_TIERS = [
  { id: 'classic', minPoints: 0, label: 'CLASSIC GUEST', ko: '클래식 게스트', badge: '✨ CLASSIC' },
  { id: 'silver', minPoints: 200, label: 'SILVER VIP', ko: '실버 멤버', badge: '🥈 SILVER' },
  { id: 'gold', minPoints: 450, label: 'GOLD VIP', ko: '골드 VIP', badge: '🥇 GOLD VIP' },
  { id: 'diamond', minPoints: 800, label: 'DIAMOND VIP', ko: '다이아몬드 VIP', badge: '💎 DIAMOND' },
  { id: 'royal', minPoints: 1200, label: 'ROYAL PENTHOUSE', ko: '로열 펜트하우스 VIP', badge: '👑 ROYAL VIP' },
];

export const HOTEL_QUESTS = [
  {
    id: 'quest-checkin',
    title: '웰컴 투 그랜드 호텔',
    desc: '1층 리셉션에서 체크인하고 3층 301호 객실에 입실하세요.',
    rewardPoints: 150,
  },
  {
    id: 'quest-gourmet',
    title: '그랜드 고메 & 티타임',
    desc: '1층 그랜드 카페에서 시그니처 메뉴를 주문하고 테이블이나 소파에서 휴식하세요.',
    rewardPoints: 150,
  },
  {
    id: 'quest-suite',
    title: '스마트 스위트 라이프',
    desc: '301호 객실 내 스마트 편의시설(커피머신·가운·아로마·샤워 등)을 3가지 이상 체험하세요.',
    rewardPoints: 200,
  },
  {
    id: 'quest-deli',
    title: 'AI 딜리버리 다이닝',
    desc: '서빙 로봇 딜리(DELI)에게 룸서비스를 주문하거나 배달된 트레이 식사를 즐기세요.',
    rewardPoints: 200,
  },
  {
    id: 'quest-rooftop',
    title: '스카이 인피니티 힐링',
    desc: '10층 루프탑 인피니티 풀 또는 자쿠지에 입수하고 스카이 바 음료를 주문하세요.',
    rewardPoints: 250,
  },
  {
    id: 'quest-explorer',
    title: '그랜드 컨시어지 마스터',
    desc: '층별 전용 컨시어지 라운지/키오스크를 체험하거나 투숙객과 2회 이상 교류하세요.',
    rewardPoints: 250,
  },
];

export const FLOOR_AMENITY_SPECS = {
  0: {
    name: 'B5 기계실 & 초고속 EV 슈퍼차저',
    badge: 'EV SUPERCHARGER · B5',
    item: '초고속 EV 완충 & 설비 진단 리포트 ⚡',
    message: '⚡ [B5 스마트 EV 슈퍼차저 & 관제 터미널] 초고속 350kW 충전 상태 및 호텔 지열 히트펌프 설비가 정상 가동 중입니다.',
    points: 60,
    energy: 8,
  },
  1: {
    name: 'B4 대형 차량 케어 & 타이어 공기압 키오스크',
    badge: 'SMART GARAGE CARE · B4',
    item: '자동 타이어 공기압 & 배터리 점검 완료 🛞',
    message: '🛞 [B4 스마트 차량 케어 스테이션] 투숙객 차량의 타이어 공기압과 배터리 전압이 최적 상태로 점검되었습니다.',
    points: 60,
    energy: 8,
  },
  2: {
    name: 'B3 디테일링 스팀 세차 & 발레 예약 키오스크',
    badge: 'PREMIUM STEAM CARE · B3',
    item: '프리미엄 에코 스팀 세차 쿠폰 🚿',
    message: '🚿 [B3 프리미엄 디테일링 부스] 친환경 에코 스팀 세차 및 실내 살균 케어 서비스가 차량에 예약되었습니다.',
    points: 60,
    energy: 8,
  },
  3: {
    name: 'B2 투숙객 전용 스마트 파킹 로케이터',
    badge: 'SMART PARKING LOCATOR · B2',
    item: '차량 위치 QR 티켓 & 번호판 인식 완료 📍',
    message: '📍 [B2 스마트 파킹 키오스크] AI 번호판 인식으로 등록 차량의 주차 구역과 최적 출차 경로를 안내합니다.',
    points: 60,
    energy: 8,
  },
  4: {
    name: 'B1 VIP 발레파킹 데스크 & EV 라운지',
    badge: 'VIP VALET DESK · B1',
    item: 'VIP 발레파킹 익스프레스 출차 패스 🚘',
    message: '🚘 [B1 VIP 발레파킹 컨시어지] 체크아웃 시 대기 없이 즉시 출차되도록 VIP 발레 익스프레스 패스가 활성화되었습니다.',
    points: 70,
    energy: 10,
  },
  5: {
    name: '1F 그랜드 디지털 컨시어지 키오스크',
    badge: 'DIGITAL CONCIERGE · 1F',
    item: '그랜드 호텔 시티 투어 VIP 패스 🗺️',
    message: '🗺️ [1F 디지털 컨시어지] 오늘의 호텔 이벤트 일정과 주변 미슐랭 가이드 추천 코스를 스마트 패스에 담았습니다.',
    points: 50,
    energy: 10,
  },
  6: {
    name: '2F 스마트 런드리 & 크리스탈 아이스 디스펜서',
    badge: 'ICE & LAUNDRY LOUNGE · 2F',
    item: '크리스탈 아이스 버킷 & 레몬 스파클링 🧊',
    message: '🧊 [2F 아이스 & 런드리 스테이션] 순수 정수 크리스탈 각얼음과 시원한 레몬 스파클링 워터를 챙겼습니다!',
    points: 70,
    energy: 15,
  },
  7: {
    name: '3F 익스프레스 버틀러 & 베개 메뉴 키오스크',
    badge: 'PILLOW & BUTLER BAR · 3F',
    item: '헝가리 구스다운 & 라벤더 필로우 미스트 🛏️',
    message: '🛏️ [3F 스위트 케어 바] 숙면을 돕는 시그니처 라벤더 필로우 미스트와 구스다운 베개 세트를 수령했습니다.',
    points: 70,
    energy: 15,
  },
  8: {
    name: '4F 보타니컬 산소 테라피 & 허브 티 바',
    badge: 'BOTANICAL TEA BAR · 4F',
    item: '유기농 캐모마일 & 페퍼민트 블렌드 티 🌿',
    message: '🌿 [4F 보타니컬 티 스테이션] 피톤치드 산소 케어와 함께 따뜻한 유기농 캐모마일 허브티를 음미합니다.',
    points: 75,
    energy: 18,
  },
  9: {
    name: '5F 가든 뷰 말차 & 다도 라운지 바',
    badge: 'GARDEN MATCHA BAR · 5F',
    item: '제주 첫물 유기농 우지 말차 & 양갱 세트 🍵',
    message: '🍵 [5F 가든 다도 스테이션] 갓 격불한 부드러운 제주 유기농 말차와 수제 밤양갱으로 깊은 여유를 느낍니다.',
    points: 75,
    energy: 18,
  },
  10: {
    name: '6F 이그제큐티브 비즈니스 라운지 키오스크',
    badge: 'BUSINESS LOUNGE · 6F',
    item: '글로벌 마켓 브리핑 & 라운지 에스프레소 💼',
    message: '💼 [6F 비즈니스 라운지 스테이션] 실시간 글로벌 금융 브리핑을 확인하고 모바일 보딩패스를 출력했습니다.',
    points: 80,
    energy: 15,
  },
  11: {
    name: '7F 아트 갤러리 도슨트 & 샴페인 디스펜서',
    badge: 'ART & CHAMPAGNE BAR · 7F',
    item: '프랑스 상파뉴 로제 샴페인 글라스 🥂',
    message: '🥂 [7F 아트 & 샴페인 라운지] 호텔 프라이빗 현대미술 컬렉션 오디오 도슨트를 들으며 로제 샴페인 한 잔을 즐깁니다.',
    points: 85,
    energy: 20,
  },
  12: {
    name: '8F 스카이 소믈리에 와인 셀러 & 테이스팅 바',
    badge: 'SOMMELIER WINE CELLAR · 8F',
    item: '보르도 그랑 크뤼 빈티지 와인 & 트러플 치즈 🍷',
    message: '🍷 [8F 스카이 와인 셀러] 소믈리에가 엄선한 그랑 크뤼 레드 와인과 아티장 치즈 페어링을 시음합니다.',
    points: 90,
    energy: 20,
  },
  13: {
    name: '9F 프레지덴셜 버틀러 & 프라이빗 스파 데스크',
    badge: 'PRESIDENTIAL SPA DESK · 9F',
    item: '프라이빗 아로마 스파 & 버틀러 패스 👑',
    message: '👑 [9F 프레지덴셜 컨시어지] 전담 수석 버틀러 의전 서비스와 프라이빗 히노끼 스파 스위트 이용권이 발급되었습니다!',
    points: 100,
    energy: 25,
  },
  14: {
    name: '10F 루프탑 타월 & 선케어 컨시어지 캐비닛',
    badge: 'ROOFTOP CABANA CARE · 10F',
    item: '플러시 자카드 풀 타월 & 리조트 선미스트 🏖️',
    message: '🏖️ [10F 루프탑 풀사이드 케어] 보송보송한 호텔 자카드 비치 타월과 쿨링 알로에 선미스트를 준비했습니다.',
    points: 80,
    energy: 18,
  },
};

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
    this.points = 0;
    this.energy = 85;
    this.completedQuests = new Set();
    this.roomActionsUsed = new Set();
    this.rooftopActionsUsed = new Set();
    this.visitedFloorAmenities = new Set();
    this.socialContacts = new Set();
    this.rewardedActions = new Set();
    this.lastAmenityItem = null;
    this.cafeSeated = false;
  }

  get vipTier() {
    let current = VIP_TIERS[0];
    for (const tier of VIP_TIERS) {
      if (this.points >= tier.minPoints) current = tier;
    }
    return current;
  }

  get nextVipTier() {
    for (const tier of VIP_TIERS) {
      if (this.points < tier.minPoints) return tier;
    }
    return null;
  }

  addPoints(amount, actionKey = null) {
    if (actionKey) {
      if (this.rewardedActions.has(actionKey)) {
        return { added: 0, points: this.points, tier: this.vipTier, leveledUp: false };
      }
      this.rewardedActions.add(actionKey);
    }
    const prevTier = this.vipTier;
    this.points = Math.max(0, this.points + Math.max(0, Number(amount) || 0));
    const newTier = this.vipTier;
    return {
      added: amount,
      points: this.points,
      tier: newTier,
      leveledUp: newTier.id !== prevTier.id,
    };
  }

  addEnergy(delta) {
    this.energy = Math.max(20, Math.min(100, Math.round(this.energy + (Number(delta) || 0))));
    return this.energy;
  }

  canAccess(room) {
    return this.keycard?.room === String(room);
  }

  checkIn(staffId) {
    if (!/^reception-/.test(staffId ?? '')) return null;
    this.keycard ??= { room: '301', floor: '3', hotel: 'GRAND HOTEL' };
    this.completeMilestone('checkIn');
    this.addPoints(80, 'checkIn');
    this.addEnergy(5);
    this.evaluateQuests();
    return this.keycard;
  }

  completeMilestone(id) {
    if (TOUR_CHECKLIST.some((item) => item.id === id)) {
      const isNew = !this.completed.has(id);
      this.completed.add(id);
      if (isNew) {
        this.addPoints(40, `milestone:${id}`);
      }
      this.evaluateQuests();
    }
  }

  recordRoomAction(action) {
    if (!action) return [];
    this.roomActionsUsed.add(action);
    this.addPoints(25, `room:${action}`);
    if (['roomBed', 'roomShower', 'roomCoffee', 'roomArmchair', 'roomDiffuser', 'roomFood'].includes(action)) {
      this.addEnergy(8);
    }
    return this.evaluateQuests();
  }

  recordRooftopAction(action) {
    if (!action) return [];
    this.rooftopActionsUsed.add(action);
    this.addPoints(35, `pool:${action}`);
    if (['poolSwim', 'poolJacuzzi', 'poolSunbed', 'poolBar'].includes(action)) {
      this.addEnergy(10);
    }
    return this.evaluateQuests();
  }

  recordSocial(contactId) {
    if (!contactId) return [];
    this.socialContacts.add(contactId);
    this.addPoints(30, `social:${contactId}`);
    this.addEnergy(4);
    return this.evaluateQuests();
  }

  useFloorAmenity(floorIndex) {
    const spec = FLOOR_AMENITY_SPECS[floorIndex] || FLOOR_AMENITY_SPECS[5];
    const firstVisit = !this.visitedFloorAmenities.has(floorIndex);
    this.visitedFloorAmenities.add(floorIndex);
    this.lastAmenityItem = spec.item;
    const reward = this.addPoints(firstVisit ? spec.points : 15, firstVisit ? `amenity:${floorIndex}` : null);
    this.addEnergy(spec.energy);
    const newlyCompletedQuests = this.evaluateQuests();
    const bonusTag = reward.added > 0 ? ` (+${reward.added} VIP PTS · 활력 ${this.energy}%)` : ` (활력 ${this.energy}%)`;
    return {
      ok: true,
      floorIndex,
      spec,
      item: spec.item,
      pointsAdded: reward.added,
      leveledUp: reward.leveledUp,
      tier: reward.tier,
      newlyCompletedQuests,
      message: `${spec.message}${bonusTag}`,
    };
  }

  evaluateQuests() {
    const newlyDone = [];
    const checks = {
      'quest-checkin': this.completed.has('checkIn') && this.completed.has('room301'),
      'quest-gourmet': Boolean(this.lastCafeItem) && this.cafeSeated,
      'quest-suite': this.roomActionsUsed.size >= 3,
      'quest-deli': this.completed.has('roomService'),
      'quest-rooftop':
        (this.rooftopActionsUsed.has('poolSwim') ||
          this.rooftopActionsUsed.has('poolJacuzzi') ||
          this.rooftopActionsUsed.has('poolSunbed')) &&
        (this.rooftopActionsUsed.has('poolBar') || this.completed.has('rooftopPool')),
      'quest-explorer': this.visitedFloorAmenities.size >= 1 || this.socialContacts.size >= 2,
    };

    for (const quest of HOTEL_QUESTS) {
      if (checks[quest.id] && !this.completedQuests.has(quest.id)) {
        this.completedQuests.add(quest.id);
        this.addPoints(quest.rewardPoints, `quest:${quest.id}`);
        newlyDone.push(quest);
      }
    }
    return newlyDone;
  }

  getQuestStatus() {
    const items = HOTEL_QUESTS.map((q) => ({
      ...q,
      done: this.completedQuests.has(q.id),
    }));
    const doneCount = items.filter((i) => i.done).length;
    const activeQuest = items.find((i) => !i.done) || items[items.length - 1];
    return {
      items,
      doneCount,
      totalCount: items.length,
      percent: Math.round((doneCount / items.length) * 100),
      activeQuest,
    };
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
    this.addPoints(45, `cafe:${item}`);
    this.addEnergy(12);
    this.evaluateQuests();
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
    this.cafeSeated = true;
    this.completeMilestone('cafeLounge');
    this.addPoints(35, 'sit:cafe');
    this.addEnergy(10);
    this.evaluateQuests();
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
    this.cafeSeated = true;
    this.completeMilestone('cafeLounge');
    this.addPoints(35, 'sit:lounge');
    this.addEnergy(10);
    this.evaluateQuests();
    return {
      ok: true,
      message: '🛋️ 1층 로비 라운지 소파에 편안히 앉아 화려한 샹들리에와 호텔 로비 풍경을 감상합니다.',
    };
  }

  inspectCar(carData = {}) {
    const label = carData.carName || '호텔 VIP 세단';
    const floorLabel = carData.floorLabel || '지하 주차장';
    this.addPoints(30, `car:${carData.carId || label}`);
    return {
      ok: true,
      message: `🚗 [${floorLabel} · ${label}] 스마트키가 반응하며 헤드라이트와 웰컴 라이트가 점등됩니다. 발레파킹 점검 완료 상태입니다.`,
    };
  }
}

