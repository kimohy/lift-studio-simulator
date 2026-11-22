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
    desc: '1층 리셉션에서 원하는 객실을 선택해 체크인하고 배정 객실에 입실하세요.',
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

export const HOTEL_ROOM_CATEGORIES = [
  { id: 'all', label: '전체 객실 (16)' },
  { id: 'signature', label: '★ 스마트 301' },
  { id: 'deluxe', label: '디럭스 (2F~4F)' },
  { id: 'junior', label: '주니어 스위트 (5F~6F)' },
  { id: 'sky', label: '스카이 스위트 (7F~8F)' },
  { id: 'penthouse', label: '펜트하우스·로열 (9F)' },
];

export const HOTEL_ROOMS = [
  {
    room: '201',
    floorIndex: 6,
    floorLabel: '2',
    floorEn: '2nd Floor',
    doorX: -1.38,
    category: 'deluxe',
    badge: 'DELUXE KING',
    nameKo: '디럭스 킹 룸',
    nameEn: 'Deluxe King Room',
    bed: '킹 베드 1',
    view: '웨스트 가든 시티뷰',
    features: ['오피스 데스크', '미니 라운지 소파', '레인 샤워실'],
    price: '₩360,000',
    featured: false,
  },
  {
    room: '202',
    floorIndex: 6,
    floorLabel: '2',
    floorEn: '2nd Floor',
    doorX: 1.38,
    category: 'deluxe',
    badge: 'FAMILY TWIN',
    nameKo: '패밀리 트윈 룸',
    nameEn: 'Family Twin Room',
    bed: '퀸 + 싱글 트윈',
    view: '이스트 코트뷰',
    features: ['가족형 2베드', '라운지 테이블', '클럽 라운지 인접'],
    price: '₩390,000',
    featured: false,
  },
  {
    room: '301',
    floorIndex: 7,
    floorLabel: '3',
    floorEn: '3rd Floor',
    doorX: -1.38,
    category: 'signature',
    badge: 'SIGNATURE ★',
    nameKo: '시그니처 스마트 스위트',
    nameEn: 'Signature Smart Suite',
    bed: '킹 베드 1',
    view: '파노라마 스카이라인',
    features: ['스마트 TV·조명·커튼', '네스프레소 & 미니바', '레인 샤워 & 가운', 'AI 로봇 룸서비스'],
    price: '₩480,000',
    featured: true,
  },
  {
    room: '302',
    floorIndex: 7,
    floorLabel: '3',
    floorEn: '3rd Floor',
    doorX: 1.38,
    category: 'deluxe',
    badge: 'EAST WING TWIN',
    nameKo: '이스트 윙 패밀리 트윈',
    nameEn: 'East Wing Family Twin',
    bed: '트윈 베드 2',
    view: '이스트 타워 파크뷰',
    features: ['독립 이스트 윙', '워크 데스크', '티 테이블'],
    price: '₩410,000',
    featured: false,
  },
  {
    room: '401',
    floorIndex: 8,
    floorLabel: '4',
    floorEn: '4th Floor',
    doorX: -1.38,
    category: 'deluxe',
    badge: 'DELUXE KING',
    nameKo: '디럭스 킹 (보타닉 플로어)',
    nameEn: 'Deluxe King · Botanical',
    bed: '킹 베드 1',
    view: '웨스트 시티뷰',
    features: ['4F 산소 테라피 라운지', '허브티 바 인접', '워크 데스크'],
    price: '₩420,000',
    featured: false,
  },
  {
    room: '402',
    floorIndex: 8,
    floorLabel: '4',
    floorEn: '4th Floor',
    doorX: 1.38,
    category: 'deluxe',
    badge: 'FAMILY TWIN',
    nameKo: '패밀리 트윈 (보타닉 플로어)',
    nameEn: 'Family Twin · Botanical',
    bed: '트윈 베드 2',
    view: '사우스 스카이라인',
    features: ['가족형 트윈 베드', '피톤치드 라운지', '프라이빗 포이어'],
    price: '₩450,000',
    featured: false,
  },
  {
    room: '501',
    floorIndex: 9,
    floorLabel: '5',
    floorEn: '5th Floor',
    doorX: -1.38,
    category: 'junior',
    badge: 'JUNIOR SUITE',
    nameKo: '주니어 코너 스위트',
    nameEn: 'Junior Corner Suite',
    bed: '프리미엄 킹 1',
    view: '파노라마 미드하이 뷰',
    features: ['거실 응접 세트', '5F 말차 다도 라운지', '대형 옷장 & 데스크'],
    price: '₩680,000',
    featured: false,
  },
  {
    room: '502',
    floorIndex: 9,
    floorLabel: '5',
    floorEn: '5th Floor',
    doorX: 1.38,
    category: 'junior',
    badge: 'JUNIOR SUITE',
    nameKo: '주니어 이그제큐티브 스위트',
    nameEn: 'Junior Executive Suite',
    bed: '트윈 / 더블 스위트',
    view: '이스트 가든뷰',
    features: ['넓은 응접 소파', '다도 라운지 인접', '프라이빗 바'],
    price: '₩710,000',
    featured: false,
  },
  {
    room: '601',
    floorIndex: 10,
    floorLabel: '6',
    floorEn: '6th Floor',
    doorX: -1.38,
    category: 'junior',
    badge: 'JUNIOR SUITE',
    nameKo: '주니어 비즈니스 스위트',
    nameEn: 'Junior Business Suite',
    bed: '프리미엄 킹 1',
    view: '하이라이즈 시티뷰',
    features: ['6F 비즈니스 클럽', '이그제큐티브 데스크', '대형 응접실'],
    price: '₩760,000',
    featured: false,
  },
  {
    room: '602',
    floorIndex: 10,
    floorLabel: '6',
    floorEn: '6th Floor',
    doorX: 1.38,
    category: 'junior',
    badge: 'JUNIOR SUITE',
    nameKo: '주니어 파노라마 스위트',
    nameEn: 'Junior Panorama Suite',
    bed: '트윈 스위트',
    view: '파노라마 선셋뷰',
    features: ['비즈니스 라운지 이용', '라운지 체어 세트', 'VIP 컨시어지'],
    price: '₩790,000',
    featured: false,
  },
  {
    room: '701',
    floorIndex: 11,
    floorLabel: '7',
    floorEn: '7th Floor',
    doorX: -1.38,
    category: 'sky',
    badge: 'SKY SUITE',
    nameKo: '스카이 프리미어 아트 스위트',
    nameEn: 'Sky Premier Art Suite',
    bed: '이탈리안 킹 1',
    view: '하이 스카이라인',
    features: ['벽난로 파이어플레이스 🔥', '샴페인 라운지 인접', '전용 파우더룸'],
    price: '₩1,050,000',
    featured: false,
  },
  {
    room: '702',
    floorIndex: 11,
    floorLabel: '7',
    floorEn: '7th Floor',
    doorX: 1.38,
    category: 'sky',
    badge: 'SKY SUITE',
    nameKo: '스카이 아트 트윈 스위트',
    nameEn: 'Sky Art Twin Suite',
    bed: '시그니처 트윈 2',
    view: '스카이 애비뉴 뷰',
    features: ['벽난로 응접 라운지 🔥', '아트 도슨트 플로어', '프리미엄 응접실'],
    price: '₩1,080,000',
    featured: false,
  },
  {
    room: '801',
    floorIndex: 12,
    floorLabel: '8',
    floorEn: '8th Floor',
    doorX: -1.38,
    category: 'sky',
    badge: 'SKY PREMIER',
    nameKo: '스카이 소믈리에 킹 스위트',
    nameEn: 'Sky Sommelier King Suite',
    bed: '이탈리안 킹 1',
    view: '울트라 스카이라인',
    features: ['8F 소믈리에 와인셀러 🍷', '벽난로 라운지 🔥', '프라이빗 다이닝'],
    price: '₩1,250,000',
    featured: false,
  },
  {
    room: '802',
    floorIndex: 12,
    floorLabel: '8',
    floorEn: '8th Floor',
    doorX: 1.38,
    category: 'sky',
    badge: 'SKY PREMIER',
    nameKo: '스카이 로열 클럽 트윈 스위트',
    nameEn: 'Sky Royal Club Twin Suite',
    bed: '프리미엄 트윈 2',
    view: '글로벌 파노라마 뷰',
    features: ['와인 테이스팅 바 인접', '벽난로 라운지 🔥', '대형 응접 공간'],
    price: '₩1,280,000',
    featured: false,
  },
  {
    room: '901',
    floorIndex: 13,
    floorLabel: '9',
    floorEn: '9th Floor',
    doorX: -1.38,
    category: 'penthouse',
    badge: 'PRESIDENTIAL 👑',
    nameKo: '프레지덴셜 펜트하우스 스위트',
    nameEn: 'Presidential Penthouse Suite',
    bed: '마스터 캘리포니아 킹',
    view: '최상층 270° 스카이라인',
    features: ['그랜드 피아노 🎹', '프라이빗 스파 욕조 🛁', '벽난로 & 풀바 🥂', '전담 버틀러'],
    price: '₩2,400,000',
    featured: true,
  },
  {
    room: '902',
    floorIndex: 13,
    floorLabel: '9',
    floorEn: '9th Floor',
    doorX: 1.38,
    category: 'penthouse',
    badge: 'ROYAL SUITE 👑',
    nameKo: '로열 이그제큐티브 스위트',
    nameEn: 'Royal Executive Suite',
    bed: '로열 스위트 트윈/킹',
    view: '10F 루프탑 & 시티뷰',
    features: ['프라이빗 스파 욕조 🛁', '벽난로 라운지 🔥', '로열 샴페인 바 🥂', '루프탑 풀 인접'],
    price: '₩1,950,000',
    featured: true,
  },
];

export function getHotelRoomSpec(room) {
  return HOTEL_ROOMS.find((r) => r.room === String(room)) ?? null;
}

export const TOUR_CHECKLIST = [
  { id: 'checkIn', title: '1층 리셉션 객실 선택 체크인 & 키카드 수령' },
  { id: 'cafeLounge', title: '1층 그랜드 카페 주문 또는 라운지 휴식' },
  { id: 'verticalTransit', title: '엘리베이터·계단·에스컬레이터 층간 이동' },
  { id: 'room301', title: '3층 301호 객실 입실 & 편의시설 체험' },
  { id: 'roomService', title: 'AI 서빙 로봇 딜리(DELI) 룸서비스 주문' },
  { id: 'rooftopPool', title: '10층 루프탑 인피니티 풀 & 스카이 바 체험' },
];

export const MALL_FAST_TRAVEL_SPOTS = [
  {
    id: 'mall-atrium',
    label: '몰 M1F · 명품관 & 워터폴 가든',
    subtitle: '호텔 1F 로비 직결 · 듀얼 전망 엘리베이터 · 샤넬/에르메스/워터폴',
    floor: 5,
    zone: 'lobby',
    x: -28.0,
    z: 12.6,
    yaw: Math.PI,
    pitch: -0.04,
  },
  {
    id: 'mall-library',
    label: '몰 M2F · 패션 스트리트 & 별마당 도서관',
    subtitle: '14m 별마당 아트리움 서가 · 젠틀몬스터 · 나이키 · 아더에러',
    floor: 7,
    zone: 'lobby',
    x: -42.0,
    z: 20.0,
    yaw: Math.PI / 2,
    pitch: -0.05,
  },
  {
    id: 'mall-skybridge',
    label: '몰 M3F · 테크 플래그십 & 스카이브리지',
    subtitle: '애플스토어 · 삼성 갤럭시 · 플로팅 아트리움 스카이브리지',
    floor: 9,
    zone: 'lobby',
    x: -24.5,
    z: 23.4,
    yaw: Math.PI / 2,
    pitch: -0.06,
  },
  {
    id: 'mall-cinema',
    label: '몰 M5F · 그랜드 시네마 IMAX & 사운즈 포레스트',
    subtitle: '무인 발권 키오스크 · 매점 키오스크 · 스마트 검표 게이트 · IMAX 상영관',
    floor: 13,
    zone: 'lobby',
    x: -41.9,
    z: 11.4,
    yaw: Math.PI * 0.85,
    pitch: -0.05,
  },
];

const MALL_INTERACTION_SPECS = {
  mallWaterfall: {
    points: 60,
    energy: 15,
    item: '워터폴 가든 미스트 & 힐링 패스 💧',
    message: '💧 [14m 워터폴 가든] 2배 층고 아트리움 폭포와 테라스 라운지에서 청량한 휴식을 즐깁니다.',
  },
  mallLibrary: {
    points: 65,
    energy: 12,
    item: '별마당 아트리움 컬처 북 패스 📚',
    message: '📚 [14m 별마당 아트리움 서가] M1F~M2F 복층 원목 서가에서 큐레이션 도서와 중정 뷰를 만끽합니다.',
  },
  mallCafe: {
    points: 45,
    energy: 15,
    item: '더 현대 시그니처 콜드브루 아인슈페너 ☕',
    message: '☕ [그랜드 아트리움 로스터리] 수제 스페셜티 원두의 깊은 아로마가 담긴 시그니처 커피가 제공되었습니다.',
  },
  mallShop: {
    points: 50,
    energy: 8,
    item: 'THE GRAND ATRIUM VIP 룩북 🛍️',
    message: '🛍️ [플래그십 부티크] 글로벌 하이엔드 & 라이프스타일 매장의 VIP 큐레이션을 둘러보았습니다.',
  },
  mallSkybridge: {
    points: 55,
    energy: 10,
    item: '스카이브리지 포토 패스 🌉',
    message: '🌉 [플로팅 아트리움 스카이브리지] 개방형 보이드 위 유리 브리지에서 35m 천창과 중정을 한눈에 조망합니다.',
  },
  mallFood: {
    points: 55,
    energy: 22,
    item: 'M4F 고메 스트리트 테이스팅 코스 🍽️',
    message: '🍽️ [M4F 고메 스트리트] 미쉐린 셀렉션 다이닝과 오마카세 셰프 스페셜을 즐겼습니다. 에너지 +22!',
  },
  mallForest: {
    points: 80,
    energy: 25,
    item: '사운즈 포레스트 아로마 패스 🌿',
    message: '🌿 [사운즈 포레스트] 주홍빛 철골 천창 아래 펼쳐진 도심 속 실내 수목원에서 힐링합니다.',
  },
  mallMediaWall: {
    points: 45,
    energy: 8,
    item: '아나모픽 3D 미디어 파사드 쇼 🎞️',
    message: '🎞️ [아나모픽 3D LED 파사드] 웨이브 핀 파사드와 DMX LED 라이팅 쇼가 동기화되어 재생됩니다.',
  },
  mallParking: {
    points: 40,
    energy: 10,
    item: '초급속 EV 슈퍼차저 & 발레 패스 ⚡',
    message: '⚡ [통합 지하주차장 EV 존] 350kW 초급속 충전기와 호텔 B1~B5 직결 주행 동선이 활성화되었습니다.',
  },
  mallConcierge: {
    points: 50,
    energy: 10,
    item: '그랜드 아트리움 몰 VIP 바우처 ✨',
    message: '💁 [몰 컨시어지] "호텔 1F 연결 로비, 에스컬레이터 측면 브리지, B1~B5 통합 주차장과 몰 전용 승강기로 전 층(M1F~M5F 영화관)을 이용해 보세요!"',
  },
  mallCinemaTicket: {
    points: 60,
    energy: 8,
    item: 'M5F IMAX 4K 레이저 QR 예매권 🎟️',
    message: '🎟️ [무인 발권 키오스크] M5F IMAX LASER HALL 1 모바일 QR 티켓 발권을 완료했습니다!',
  },
  mallCinemaSnack: {
    points: 45,
    energy: 20,
    item: '시네마 키오스크 팝콘 & 음료 콤보 🍿',
    message: '🍿 [매점 셀프 오더 키오스크] 갓 튀긴 팝콘과 음료 콤보를 픽업 바에서 수령했습니다. 에너지 +20!',
  },
  mallCinemaGate: {
    points: 65,
    energy: 10,
    item: 'IMAX 상영관 스마트 검표 통과 🎟️',
    message: '✅ [스마트 티켓 검표 게이트] QR 티켓 인증이 완료되어 IMAX HALL 1 상영관 문이 열렸습니다!',
  },
  mallCinemaScreen: {
    points: 75,
    energy: 15,
    item: 'IMAX LASER 시네마 관람 인증 🎬',
    message: '🎬 [M5F IMAX LASER · HALL 1] 초대형 9.2m 레이저 스크린과 Dolby Atmos 입체 음향으로 블록버스터 영화의 절정을 감상합니다!',
  },
  mallCinemaSeat: {
    points: 55,
    energy: 12,
    item: 'IMAX VIP 4DX 리클라이너 좌석 💺',
    message: '💺 [IMAX VIP 4DX 착석] 스크린 정면 리클라이너 좌석에 편안히 앉아 입체 영화를 감상합니다.',
  },
  mallSpiralSlide: {
    points: 95,
    energy: 15,
    item: '35m 아트리움 스파이럴 슬라이드 탑승권 🛝',
    message: '🛝 [35m 자이언트 투명 슬라이드] 아트리움 상층부에서 1층까지 투명 나선형 튜브를 타고 스릴 있게 활강했습니다!',
  },
  mallKineticShow: {
    points: 70,
    energy: 14,
    item: '인스파이어 오로라 고래 라이트쇼 🐋',
    message: '🐋 [키네틱 고래 & 드론 라이트쇼] 35m 천창 아래 허공에서 발광 키네틱 링과 드론 군집이 환상적인 파동을 그립니다!',
  },
  mallFountainShow: {
    points: 65,
    energy: 15,
    item: '워터폴 뮤지컬 레이저 분수쇼 ⛲',
    message: '⛲ [워터폴 뮤지컬 분수쇼] 14m 폭포수 아래 물줄기와 멀티 컬러 레이저 조명이 음악에 맞춰 춤을 춥니다!',
  },
  mallPiano: {
    points: 55,
    energy: 14,
    item: '아트리움 그랜드 피아노 라이브 🎹',
    message: '🎹 [그랜드 피아노 버스킹] 중정 한가운데 울려 퍼지는 감미로운 피아노 선율에 방문객들이 발걸음을 멈춥니다.',
  },
  mallPhotoBooth: {
    points: 70,
    energy: 10,
    item: 'THE GRAND MALL 인생네컷 포토카드 📸',
    message: '📸 [인생네컷 셀프 포토부스] 셔터와 플래시가 터지며 오늘의 시그니처 네컷 포토카드가 인화되었습니다!',
  },
  mallDjBooth: {
    points: 60,
    energy: 12,
    item: '바이닐 LP DJ 부스 패스 🎧',
    message: '🎧 [LP 바이닐 리스닝 부스] 아날로그 턴테이블 위 바이닐 트랙이 회전하며 몰 사운드가 전환됩니다.',
  },
  mallLibrarySeat: {
    points: 50,
    energy: 16,
    item: '별마당 도서관 시그니처 책갈피 📖',
    message: '📖 [별마당 도서관 열람석] 14m 서가 옆 아늑한 데스크에 앉아 건축·예술 도서를 감상하며 여유를 즐깁니다.',
  },
  mallBowling: {
    points: 85,
    energy: 14,
    item: '네온 미니 볼링 스트라이크 🎳',
    message: '🎳 [네온 미니 볼링] 파워풀한 투구로 핀이 시원하게 쓰러지며 네온 스코어보드가 환호합니다!',
  },
  mallArcade: {
    points: 70,
    energy: 10,
    item: '아케이드 & 가챠폰 캡슐토이 🕹️',
    message: '🕹️ [클로우 머신 & 가챠폰 월] 투명 캡슐 속 리미티드 아트토이 경품을 획득했습니다!',
  },
  mallRhythmFloor: {
    points: 65,
    energy: 12,
    item: '네온 리듬 댄스 스테이지 💃',
    message: '💃 [네온 리듬 스텝 스테이지] 발밑 LED 패널이 박자에 맞춰 폭발하며 신나는 리듬 게임을 즐깁니다!',
  },
  mallTeamLab: {
    points: 85,
    energy: 16,
    item: '인피니티 라이트 미디어아트 전시 🌌',
    message: '🌌 [인피니티 라이트 룸] 발걸음에 반응해 춤추는 빛의 크리스탈 기둥 속에서 환상적인 미디어아트를 체험합니다.',
  },
  mallRobotDog: {
    points: 65,
    energy: 15,
    item: 'AI 로봇견 SPOT-M 하이파이브 🐕',
    message: '🤖🐕 [AI 로봇강아지 SPOT-M] 반갑게 꼬리를 흔들며 재롱을 부리고 하이파이브에 화답했습니다!',
  },
  mallSushiBelt: {
    points: 60,
    energy: 24,
    item: '스시 소라 오마카세 한 접시 🍣',
    message: '🍣 [카이텐즈시 회전초밥] 컨베이어 벨트 위 신선한 참치 대토로 & 연어 아부리 접시를 집어 맛보았습니다!',
  },
  mallTeppanyaki: {
    points: 65,
    energy: 18,
    item: '라이브 테판야키 플람베 셰프쇼 🔥',
    message: '🔥 [테판야키 라이브 불꽃쇼] 셰프의 철판 위에서 화려한 플람베 불꽃과 고소한 스테이크 향이 피어오릅니다!',
  },
  mallMatchaCone: {
    points: 50,
    energy: 18,
    item: '교토 프리미엄 말차 젤라또 🍵',
    message: '🍵 [교토 말차 디저트 랩] 진한 우지 말차 젤라또 콘을 손에 들고 달콤한 산책을 이어갑니다!',
  },
  mallCinemaSwitch: {
    points: 45,
    energy: 8,
    item: 'IMAX 4DX 상영 프로그램 리모컨 🎬',
    message: '🎬 [IMAX 상영작 채널 전환] 새로운 블록버스터 영화로 스크린과 사운드가 전환되었습니다!',
  },
  mallCampfire: {
    points: 75,
    energy: 22,
    item: '사운즈 포레스트 글램핑 마시멜로 🔥',
    message: '🏕️ [글램핑 모닥불 불멍 존] 따뜻한 장작불 앞에서 구운 마시멜로를 즐기며 완벽한 도심 속 힐링을 만끽합니다.',
  },
  mallWishingWell: {
    points: 65,
    energy: 15,
    item: '사운즈 포레스트 행운의 금화 🪙',
    message: '🪙 [행운의 소원 분수] 맑은 물속으로 행운의 동전을 던져 VIP 보너스 포인트를 획득했습니다!',
  },
  mallSupercarDrive: {
    points: 80,
    energy: 14,
    item: 'B1 하이퍼카 시승 체험 패스 🏎️',
    message: '🏎️ [B1 슈퍼카 쇼룸 시승] 운전석 버킷 시트에 올라 시동을 걸자 웅장한 배기음과 웰컴 라이트가 점등됩니다!',
  },
  mallLedStep: {
    points: 45,
    energy: 8,
    item: '플라자 인터랙티브 라이트 스텝 ✨',
    message: '✨ [야외 광장 LED 라이트 스텝] 발을 디딘 타일에서 웨이브 네온 파동이 광장 전체로 퍼져나갑니다!',
  },
  mallDiningSeat: {
    points: 50,
    energy: 20,
    item: 'M4F 고메 테라스 다이닝 🍽️',
    message: '🍽️ [M4F 아트리움 테라스 착석] 중정 뷰 발코니 테이블에 앉아 여유로운 식사를 즐깁니다.',
  },
};

export const MALL_CINEMA_MOVIES = Object.freeze([
  { id: 'odyssey', title: 'SPACE ODYSSEY 4DX', sub: '코스믹 4K 레이저 돌비 애트모스', bg: '#07142b', accent: '#6ff2e3' },
  { id: 'cyber', title: 'CYBERPUNK SEOUL 2099', sub: '네온 퓨처 액션 4DX 시뮬레이션', bg: '#210a2e', accent: '#ff5ec4' },
  { id: 'forest', title: 'SOUNDS OF NATURE 8K', sub: '알프스 & 오로라 힐링 다큐멘터리', bg: '#09241b', accent: '#8ef576' },
  { id: 'mystery', title: 'GRAND HOTEL MYSTERY', sub: '로열 스위트 미스터리 오리지널', bg: '#24160a', accent: '#f5cb75' },
]);

export const MALL_CINEMA_COMBOS = Object.freeze([
  '시그니처 카라멜 팝콘 & 콜라 콤보 🍿🥤',
  '트러플 치즈 나초 & 자몽에이드 콤보 🧀🥤',
  '버터구이 오징어 & 제로콜라 콤보 🦑🥤',
]);

export const MALL_DJ_TRACKS = Object.freeze([
  { id: 'citypop', title: 'SEOUL CITY POP VINYL', bpm: '116 BPM · MARBLE GROOVE' },
  { id: 'jazz', title: 'MIDNIGHT JAZZ LOUNGE', bpm: '92 BPM · BRASS & PIANO' },
  { id: 'aurora', title: 'AURORA SYNTHWAVE MIX', bpm: '124 BPM · KINETIC CLUB' },
  { id: 'breeze', title: 'ACOUSTIC FOREST BREEZE', bpm: '84 BPM · LO-FI CHILL' },
]);

const GACHA_PRIZES = [
  '시그니처 그랜드 베어 키링 🧸',
  '골드 에디션 미니어처 엘리베이터 🛗',
  '스타필드 우주비행사 피규어 🧑‍🚀',
  '네온 아케이드 레트로 미니콘솔 🕹️',
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
    this.heldMallItem = null;
    this.cinemaMovieIndex = 0;
    this.cinemaTicket = null;
    this.cinemaSnack = null;
    this.cinemaSnackIndex = 0;
    this.cinemaGateOpen = false;
    this.djTrackIndex = 0;
    this.gachaCount = 0;
    this.bowlingStrikes = 0;
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

  getCheckedInRoomSpec() {
    return this.keycard ? getHotelRoomSpec(this.keycard.room) : null;
  }

  canAccess(room) {
    return this.keycard?.room === String(room);
  }

  checkIn(staffId, roomNumber = null) {
    if (!/^reception-/.test(staffId ?? '')) return null;
    if (roomNumber !== null && roomNumber !== undefined && String(roomNumber).trim() !== '') {
      const spec = getHotelRoomSpec(roomNumber);
      if (!spec) return null;
      if (this.keycard?.room !== spec.room) {
        this.keycard = { room: spec.room, floor: spec.floorLabel, hotel: 'GRAND HOTEL' };
      }
    } else {
      this.keycard ??= { room: '301', floor: '3', hotel: 'GRAND HOTEL' };
    }
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

  interactSuite(data = {}, player = null) {
    const floorIndex = data.floorIndex ?? player?.floor ?? 7;
    const room = String(data.room || '201');
    const tier = data.tier || 'deluxe';
    const type = data.amenityType || 'sofa';
    if (player && player.floor === floorIndex && Number.isFinite(data.seatX) && Number.isFinite(data.seatZ)) {
      player.x = data.seatX;
      player.z = data.seatZ;
      player.yaw = data.seatYaw ?? Math.PI;
      player.pitch = -0.05;
      player.zone = 'lobby';
    }
    const tierKo =
      tier === 'presidential'
        ? '프레지덴셜 펜트하우스 스위트'
        : tier === 'royal'
          ? '로열 이그제큐티브 스위트'
          : tier === 'sky'
            ? '스카이 프리미어 스위트'
            : tier === 'junior'
              ? '주니어 스위트'
              : tier === 'twin'
                ? '패밀리 트윈 룸'
                : '디럭스 킹 룸';
    const actMsg = {
      bed: `🛏️ [${room}호 ${tierKo}] 최고급 구스다운 침구에 기대어 도심 스카이라인을 감상하며 휴식합니다.`,
      sofa: `🛋️ [${room}호 ${tierKo}] 응접 라운지 소파에 편안히 앉아 여유로운 스위트 모먼트를 즐깁니다.`,
      bar: `🥂 [${room}호 ${tierKo}] 프라이빗 미니바에서 칠링된 샴페인과 아로마 에스프레소를 즐깁니다.`,
      spa: `🛁 [${room}호 ${tierKo}] 파노라마 창가 마블 스카이 자쿠지에서 따뜻한 스파 테라피를 만끽합니다.`,
    }[type];
    const pts = tier === 'presidential' || tier === 'royal' ? 75 : tier === 'sky' ? 60 : 45;
    const energyGain = type === 'spa' || type === 'bed' ? 20 : 14;
    this.visitedFloorAmenities.add(floorIndex);
    this.lastAmenityItem = `${room}호 ${tierKo}`;
    this.addPoints(pts, `suite:${room}:${type}`);
    this.addEnergy(energyGain);
    const newlyCompletedQuests = this.evaluateQuests();
    return {
      ok: true,
      room,
      tier,
      amenityType: type,
      newlyCompletedQuests,
      message: `${actMsg} (+${pts} VIP PTS · 활력 ${this.energy}%)`,
    };
  }

  interactHotelLounge(data = {}, player = null) {
    const floorIndex = data.floorIndex ?? player?.floor ?? 6;
    const floorNum = floorIndex - 4;
    const type = data.loungeType || 'sofa';
    if (player && player.floor === floorIndex && Number.isFinite(data.seatX) && Number.isFinite(data.seatZ)) {
      player.x = data.seatX;
      player.z = data.seatZ;
      player.yaw = data.seatYaw ?? 0;
      player.pitch = -0.04;
      player.zone = 'lobby';
    }
    this.visitedFloorAmenities.add(floorIndex);
    this.cafeSeated = true;
    const pts = floorIndex >= 12 ? 70 : 50;
    const msg =
      type === 'bar'
        ? `🥂 [${floorNum}F 이그제큐티브 클럽 라운지 바] 투숙객 전용 샴페인 해피아워와 시그니처 에스프레소를 즐깁니다.`
        : `🛋️ [${floorNum}F 이그제큐티브 클럽 라운지] 서부 스카이라인 창가 벨벳 소파에 앉아 프라이빗 라운지 티타임을 즐깁니다.`;
    this.lastAmenityItem = `${floorNum}F 클럽 라운지`;
    this.addPoints(pts, `lounge:${floorIndex}:${type}`);
    this.addEnergy(16);
    const newlyCompletedQuests = this.evaluateQuests();
    return {
      ok: true,
      floorIndex,
      loungeType: type,
      newlyCompletedQuests,
      message: `${msg} (+${pts} VIP PTS · 활력 ${this.energy}%)`,
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

  interactMall(action, data = {}, player = null) {
    if (action === 'mallPerson') {
      const name = data.personName || '몰 방문객';
      const role = data.roleLabel || '쇼핑몰 게스트';
      const quote = data.quote || '그랜드 아트리움 몰은 볼거리와 상점이 정말 많네요!';
      const key = `mallPerson:${data.personId || name}`;
      if (!this.socialContacts.has(key)) this.socialContacts.add(key);
      this.addPoints(40, key);
      this.addEnergy(5);
      const newlyCompletedQuests = this.evaluateQuests();
      return {
        ok: true,
        newlyCompletedQuests,
        message: `💬 ${name} (${role}): "${quote}"`,
      };
    }
    const spec = MALL_INTERACTION_SPECS[action];
    if (!spec) {
      return { ok: false, message: '🛍️ 그랜드 아트리움 몰 시설을 확인했습니다.' };
    }

    if (action === 'mallCinemaGate' && !this.cinemaTicket) {
      return {
        ok: false,
        gateBlocked: true,
        cinemaGateOpen: this.cinemaGateOpen,
        message: '🚫 [티켓 검표 게이트] 발권된 영화 티켓이 없습니다! 먼저 북측 [시네마 무인 발권 키오스크]에서 티켓을 발권해 주세요.',
      };
    }

    if (action === 'mallCinemaSeat' && player && player.z < 13.6 && !this.cinemaGateOpen) {
      return {
        ok: false,
        gateBlocked: true,
        cinemaGateOpen: this.cinemaGateOpen,
        message: '🚫 [상영관 입장 제한] 먼저 무인 발권 키오스크에서 티켓을 발권한 뒤, 입구 검표 게이트에서 QR 검표를 완료해 주세요.',
      };
    }

    let slideRide = null;
    let extraNote = '';
    if (action === 'mallSpiralSlide') {
      const startFloor = player?.floor ?? data.floorIndex ?? 13;
      if (player) {
        player.floor = 5;
        player.zone = 'lobby';
        player.x = -36.5;
        player.z = 24.5;
        player.yaw = Math.PI / 2;
        player.pitch = -0.05;
        player.worldY = 0;
      }
      slideRide = { startFloor, endFloor: 5 };
    } else if (action === 'mallCinemaGate') {
      this.cinemaTicket.inspected = true;
      this.cinemaGateOpen = true;
      if (player && player.floor === 13 && player.z < 14.4) {
        player.x = -41.9;
        player.z = 14.8;
        player.yaw = Math.PI;
        player.pitch = 0.02;
        player.zone = 'lobby';
      }
      extraNote = `검표 완료: [${this.cinemaTicket.title}] · 배정 좌석 [${this.cinemaTicket.seat}]${
        this.cinemaSnack ? ` · 매점 [${this.cinemaSnack}] 반입 확인` : ''
      }`;
    } else if (action === 'mallCinemaSeat' && player && Number.isFinite(data.seatX) && Number.isFinite(data.seatZ)) {
      player.x = data.seatX;
      player.z = data.seatZ;
      player.yaw = data.seatYaw ?? Math.PI;
      player.pitch = 0.08;
      player.zone = 'lobby';
    } else if (action === 'mallLibrarySeat' && player) {
      player.x = data.seatX ?? -43.8;
      player.z = data.seatZ ?? 20.0;
      player.yaw = data.seatYaw ?? Math.PI / 2;
      player.pitch = -0.04;
      player.zone = 'lobby';
    } else if (action === 'mallDiningSeat' && player && Number.isFinite(data.seatX) && Number.isFinite(data.seatZ)) {
      player.x = data.seatX;
      player.z = data.seatZ;
      player.yaw = data.seatYaw ?? 0;
      player.pitch = -0.04;
      player.zone = 'lobby';
    } else if (action === 'mallSupercarDrive' && player) {
      player.floor = 4;
      player.worldY = -3.5;
      player.x = -33.5;
      player.z = 14.5;
      player.yaw = 0;
      player.pitch = -0.05;
      player.zone = 'lobby';
    }

    if (action === 'mallCinemaSwitch' || action === 'mallCinemaScreen') {
      this.cinemaMovieIndex = (this.cinemaMovieIndex + 1) % MALL_CINEMA_MOVIES.length;
      const m = MALL_CINEMA_MOVIES[this.cinemaMovieIndex];
      extraNote = `현재 상영작: [${m.title}] (${m.sub})`;
    } else if (action === 'mallCinemaTicket') {
      const movie = MALL_CINEMA_MOVIES[this.cinemaMovieIndex];
      this.cinemaTicket = {
        movieId: movie.id,
        title: movie.title,
        sub: movie.sub,
        hall: 'IMAX LASER · HALL 1',
        seat: 'VIP B열 3번',
        seatX: -44.6,
        seatZ: 25.25,
        inspected: this.cinemaGateOpen,
      };
      this.heldMallItem = 'ticket';
      extraNote = `발권 내역: [${movie.title}] · HALL 1 (${this.cinemaTicket.seat}) · 검표 게이트에서 QR 티켓을 스캔하세요`;
    } else if (action === 'mallDjBooth') {
      this.djTrackIndex = (this.djTrackIndex + 1) % MALL_DJ_TRACKS.length;
      const t = MALL_DJ_TRACKS[this.djTrackIndex];
      extraNote = `재생 트랙: ♪ ${t.title} · ${t.bpm}`;
    } else if (action === 'mallBowling') {
      this.bowlingStrikes += 1;
      extraNote = `누적 스트라이크 ${this.bowlingStrikes}회 달성!`;
    } else if (action === 'mallArcade') {
      const prize = GACHA_PRIZES[this.gachaCount % GACHA_PRIZES.length];
      this.gachaCount += 1;
      this.heldMallItem = 'bag';
      extraNote = `획득 경품: [${prize}] (총 ${this.gachaCount}회)`;
    } else if (action === 'mallPhotoBooth') {
      this.heldMallItem = 'photocard';
    } else if (action === 'mallMatchaCone') {
      this.heldMallItem = 'matcha';
    } else if (action === 'mallCinemaSnack') {
      const combo = MALL_CINEMA_COMBOS[this.cinemaSnackIndex % MALL_CINEMA_COMBOS.length];
      this.cinemaSnackIndex += 1;
      this.cinemaSnack = combo;
      this.heldMallItem = 'popcorn';
      extraNote = `수령 메뉴: [${combo}]${
        this.cinemaTicket ? ' · 이제 검표 게이트로 이동해 입장하세요!' : ' · 무인 발권 키오스크에서 영화 티켓도 발권해 보세요!'
      }`;
    } else if (action === 'mallShop') {
      this.heldMallItem = 'bag';
    }

    const floorKey = data.floorIndex ?? '';
    if (spec.item) this.lastAmenityItem = spec.item;
    this.addPoints(spec.points, `mall:${action}:${floorKey}`);
    this.addEnergy(spec.energy);
    const newlyCompletedQuests = this.evaluateQuests();
    const tail = extraNote ? ` · ${extraNote}` : data.label ? ` (${data.label})` : '';
    return {
      ok: true,
      item: spec.item,
      heldMallItem: this.heldMallItem,
      cinemaMovieIndex: this.cinemaMovieIndex,
      cinemaTicket: this.cinemaTicket,
      cinemaSnack: this.cinemaSnack,
      cinemaGateOpen: this.cinemaGateOpen,
      djTrackIndex: this.djTrackIndex,
      slideRide,
      photoFlash: action === 'mallPhotoBooth',
      newlyCompletedQuests,
      message: `${spec.message}${tail}`,
    };
  }
}

