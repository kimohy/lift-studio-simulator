# Lift Studio

B5부터 10층까지 이동할 수 있는 브라우저 기반 3D 호텔 엘리베이터 시뮬레이터입니다. Three.js로 구성한 층별 건물 장면과 엘리베이터 모델, 호텔 로비·객실·주차장, 계단과 에스컬레이터 체험을 포함합니다.

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
