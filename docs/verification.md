# Verification
- 21 controller tests: 15 stops, duplicate suppression, collective dispatch, door interlock, reopen on obstruction, same-floor calls, endpoint input guards, alarm, pause/reset, braking-safe inserted stops, turnaround direction commitment, bounded acceleration and all-floor queue drain.
- GLB geometry: 32 moving door panels (2 car + 30 landing), 15 landings, native car/counterweight/controller nodes.
- Independent review found and repaired: final velocity snap, down-call turnaround direction, basement counterweight position.
- Controller neutral counterweight offset is -16.5m from original geometry. Suspension top at 1F is 15.75m, leaving 19.15m cable length; endpoints remain inside the shaft.
- Browser smoke: actual GLB loading, open/close, movement to 2F, moving door rejection, obstruction hold, alarm, view presets, mobile overflow; endpoint rope lengths and counterweight bounds.

## 1.0.1 — Hall-call turnaround fix
- Reproduced the reported 9F up + B1 down loop in 1.0.0: both calls remained after seven alternating stops in 200 simulated seconds.
- Arrival now clears served calls using the incoming direction before committing a turnaround. Matching hall pickups retain their boarding direction during dwell.
- Regression checks cover both input orders, 60 seconds of stable idle after clearing, all 756 ordered pairs of valid hall calls from 1F, and a 9F up pickup followed by a new 10F destination.

## 1.1.0 — First-person game mode
- All 40 controller/player tests pass, retaining all 756 ordered hall-call pair regressions.
- Player tests cover closed and partly opened doors, absent car, wall/cabin bounds, diagonal speed, large-step collision, boarding/riding/exit, pause, view orientation and safe mode exit.
- Manual and player obstruction sources remain independent. Review found and fixed remote-floor obstruction: waiting against closed landing doors no longer holds a remote elevator open.
- Real Chromium input test passed: WASD against closed doors, physical 1F hall-button click, walking into cabin, physical 2F/3F buttons, ride to 2F, walk out, player stays on 2F while car continues to 3F, blur releases keys and game exit restores OrbitControls.
- No browser page errors in that flow. Software WebGL verification uses half pixel density to accommodate the test environment; screenshots were visually inspected.

## 1.1.1 — Continuous floor scenery
- Reproduced a 3.5 m room/light jump when the rounded floor indicator changed; the current landing was also abruptly replaced.
- Lobbies now occupy fixed world heights and nearby landings remain visible together. Removed the floor-snapping lobby point light; stable building/cabin lighting remains. Hidden meshes are excluded before interaction raycasting.
- 43 automated tests pass. New regressions check fixed room position, adjacent landing continuity and the waiting player's floor.
- Chromium checked 61 positions across a floor boundary: camera motion stayed continuous, cabin-relative eye height stayed constant, room heights did not change and both nearby landings remained visible. No page errors; boundary screenshot inspected.

## 1.2.0 — Korean/English hotel-style announcements
- Korean then English voices with a brief inter-language pause, relaxed speech rate, soft arrival chime, bilingual captions and volume control. Explicit user gesture enables speech.
- Actual arrival (not pass-through floor), direction, opening/closing and obstruction reopening trigger announcements. All B5–10F names use English ordinals.
- Latest action replaces outdated speech; generation guards reject callbacks after cancellation. Mute, pause, hidden page and reset cancel outstanding utterances. Watchdog/error handling cannot stop elevator movement.
- Voice mode uses 5-second closing and 9-second open dwell. The open button and obstruction clearance use the same configurable dwell; silent operation retains original timings.
- 54 unit tests pass, including language order, basement names, arrival sequence, stale callback cancellation, errors, reset/mute, movement despite unfinished audio and consistent door dwell.
- Browser integration verifies enable/disable, bilingual speech calls, actual controller direction/arrival, door actions, obstruction warning, captions, volume, pause and reset using a simulated SpeechSynthesis adapter. This checks integration rather than physical speaker output or installed voice quality.
- Voice quality depends on browser/device voices; no studio recording or external paid TTS service is bundled. Captions and elevator operation remain available if synthesis fails.

## 1.3.0 — Generated fixed voice recordings
- Generated 42 Korean/English MP3 clips using OpenAI gpt-4o-mini-tts, Marin, with consistent calm hotel-concierge direction. Trimmed edge silence and normalized loudness to -19 LUFS / -2 dBTP target; encoded 24 kHz MP3.
- Decoded all 42 clips and checked duration, non-silent signal and no full-scale PCM clipping. Total duration about 57 seconds; longest clip 3.864 seconds. Longest floor+opening audio is 6.36 seconds, fitting the existing arrival dwell including language gaps.
- Replaced default OS speech synthesis with a fixed-file playback adapter. No system voice fallback or live generation API requests in the app. Explicit AI-generated voice disclosure appears with captions.
- 57 automated tests pass. Browser test blocks access to speechSynthesis and confirms real MP3 playing events for welcome, direction and floor/door announcements, plus live volume/mute; no media or page errors.
- Independent review found no significant issues in cancellation, stale callbacks, errors, volume or static asset security. API key remains local and ignored; release artifacts exclude environment files.
