# Lift Studio (Grand Hotel Experience)

B5부터 10층까지 이동할 수 있는 브라우저 기반 3D 호텔 엘리베이터 및 1인칭 호텔 체험 시뮬레이터입니다. Three.js로 구성한 15개 층 건물 장면과 엘리베이터 모델, 1층 로비·그랜드 카페, 3층 301호 스마트 객실, 10층 루프탑 인피니티 풀 & 스카이 라운지, B5~B1 지하 주차장, 계단과 에스컬레이터, 자율주행 투숙객 NPC 및 룸서비스 배달 로봇(G-BOT), 주/야간 시간대 조명 전환 및 호텔 컨시어지 가이드를 포함합니다.

## 주요 기능

- **엘리베이터 제어 및 시뮬레이션**: B5~10F 양방향 집단 제어(SCAN), 실시간 탑승 인원/하중(kg/%) 센서, VIP 직통 운행 모드, 도어 끼임 감지 및 비상 경보
- **1층 그랜드 로비 & 카페**: 리셉션 체크인(301호 키카드 발급), 그랜드 카페 스페셜티 커피·베이커리 주문 및 테이블/라운지 소파 착석
- **3층 301호 객실 체험**: 키카드 도어락, 스마트 TV, 3단계 무드 조명, 전동 커튼, 레인 샤워기, 침대 휴식, 컨시어지 태블릿 룸서비스 로봇 배달 주문
- **10층 루프탑 인피니티 풀 & 스카이 바**: 인피니티 풀 입수/수영, 온수 자쿠지 월풀 스파, 수중 조명 테마 전환, 선베드 휴식 및 스카이 풀 바 칵테일 주문
- **B5~B1 지하 주차장**: 차량용 경사로 보행 이동, 층별 주차 차량 스마트키 웰컴 라이트 점멸 및 차량 상태 확인
- **호텔 컨시어지 가이드 & 시간대 전환**: 6대 투어 체크리스트, 주요 명소 원클릭 빠른 이동(Fast Travel, `G` / `Tab`), 주간·노을·야경 실시간 분위기 전환

## 실행

Node.js 20 이상에서 다음 명령을 실행하세요.

```sh
npm ci
npm run build
npm start
```

브라우저에서 `http://localhost:4173`을 여세요. Windows에서는 `Start_Simulator.cmd`로 실행할 수 있습니다.

## Blender 모델 소스

`blender/`에는 엘리베이터 장면을 만드는 Blender Python 스크립트가 있습니다. Blender를 설치한 뒤 저장소 루트에서 실행하세요.

```sh
blender --background --python blender/build_elevator.py
blender --background --python blender/export_simulator.py
blender --background --python blender/verify_elevator.py
```

생성된 편집 가능한 `.blend` 파일은 `blender-output/`에 저장되고, 웹 시뮬레이터용 GLB 모델은 `dist/assets/elevator.glb`에 기록됩니다. `blender-output/`은 Git에서 제외됩니다.

## 검사

```sh
npm test
```

`dist/`에는 바로 실행할 수 있는 웹 산출물과 모델·음성 자산이 포함되어 있습니다. `src/`에는 번들링 전 애플리케이션 코드가, `tests/`에는 Node 기반 단위 검사가 들어 있습니다.

## 산출물

`outputs/`에는 최종 Blender 프로젝트 파일과 GLB 패키지, 렌더 이미지, 시뮬레이터 화면 캡처, 사용 안내 및 작업 중 생성한 버전 패키지를 모았습니다. 원본 결과물을 그대로 보존하기 위해 산출물 파일명과 폴더 구조를 유지했습니다.
