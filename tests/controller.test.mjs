import test from 'node:test';
import assert from 'node:assert/strict';
import { LiftController, FLOORS } from '../src/controller.js';
function run(c,until,max=200){for(let i=0;i<max*120;i++){c.tick(1/120);assert.ok(c.position>=-1e-8 && c.position<=49+1e-8);if(Math.abs(c.velocity)>.001)assert.equal(c.door,0,'moving with doors open');if(until(c))return;}assert.fail('timed out: '+JSON.stringify(c.snapshot()));}
function drained(c){return c.pending().length===0 && c.state==='idle';}
test('15 stops and initial 1F alignment',()=>{const c=new LiftController();assert.equal(FLOORS.length,15);assert.equal(c.floor,5);assert.equal(c.position,17.5);assert.equal(c.state,'idle');});
test('deduplicates car requests and reaches 10F',()=>{const c=new LiftController();c.callCar(14);c.callCar(14);assert.equal(c.pending().length,1);run(c,drained);assert.equal(c.floor,14);assert.equal(c.position,49);});
test('serves car calls in travel direction before reversing',()=>{const c=new LiftController();c.callCar(10);c.callCar(7);c.callCar(2);run(c,drained);assert.deepEqual(c.stops,[7,10,2]);});
test('same-floor request opens without moving and clears',()=>{const c=new LiftController();c.callCar(5);run(c,x=>x.state==='open');assert.equal(c.floor,5);assert.equal(c.velocity,0);assert.equal(c.pending().length,0);});
test('open request while moving does not open doors',()=>{const c=new LiftController();c.callCar(9);run(c,x=>x.state==='moving'&&x.velocity>.5);assert.equal(c.openDoor(),false);assert.equal(c.door,0);run(c,drained);});
test('obstruction reopens closing door and holds it open',()=>{const c=new LiftController();c.openDoor();run(c,x=>x.state==='open');c.closeDoor();run(c,x=>x.door<.8);c.setObstruction(true);run(c,x=>x.state==='open');for(let i=0;i<1000;i++)c.tick(1/120);assert.equal(c.door,1);assert.equal(c.closeDoor(),false);c.callCar(6);c.setObstruction(false);run(c,drained);assert.equal(c.floor,6);});
test('opposite hall call waits until direction reverses',()=>{const c=new LiftController();c.callCar(12);c.callHall(8,-1);run(c,drained);assert.deepEqual(c.stops,[12,8]);});
test('matching hall calls picked up en route',()=>{const c=new LiftController();c.callCar(12);c.callHall(8,1);run(c,drained);assert.deepEqual(c.stops,[8,12]);});
test('call ahead after braking point is served on return',()=>{const c=new LiftController();c.callCar(12);run(c,x=>x.position>27.7);c.callCar(8);run(c,drained);assert.deepEqual(c.stops,[12,8]);});
test('intermediate call with sufficient stopping distance is served',()=>{const c=new LiftController();c.callCar(12);run(c,x=>x.position>20);c.callCar(8);run(c,drained);assert.deepEqual(c.stops,[8,12]);});
test('both hall directions at turnaround are eventually cleared',()=>{const c=new LiftController();c.callHall(8,1);c.callHall(8,-1);run(c,drained);assert.equal(c.pending().length,0);assert.equal(c.floor,8);});
test('basement boundary and invalid inputs',()=>{const c=new LiftController();assert.equal(c.callCar(-1),false);assert.equal(c.callCar(15),false);assert.equal(c.callHall(0,-1),false);assert.equal(c.callHall(14,1),false);c.callCar(0);run(c,drained);assert.equal(c.position,0);});
test('pause freezes simulation and reset removes all calls',()=>{const c=new LiftController();c.callCar(13);run(c,x=>x.velocity>.5);c.paused=true;const p=c.position;for(let i=0;i<120;i++)c.tick(1/120);assert.equal(c.position,p);c.reset();assert.equal(c.floor,5);assert.equal(c.pending().length,0);assert.equal(c.paused,false);});
test('alarm does not stop car or open doors',()=>{const c=new LiftController();c.callCar(6);run(c,x=>x.velocity>.5);c.toggleAlarm();assert.equal(c.alarm,true);run(c,drained);assert.equal(c.floor,6);});
test('commits to down hall pickup direction before accepting new calls',()=>{const c=new LiftController();c.callHall(8,-1);c.callCar(2);run(c,x=>x.state==='open');assert.equal(c.direction,-1);c.callCar(10);run(c,drained);assert.deepEqual(c.stops,[8,2,10]);});
test('acceleration stays bounded through final stop',()=>{const c=new LiftController();c.callCar(14);let old=0;for(let i=0;i<120*100;i++){c.tick(1/120);assert.ok(Math.abs(c.velocity-old)<=c.accel/120+1e-7,`acceleration ${Math.abs(c.velocity-old)*120}`);old=c.velocity;if(drained(c))return;}assert.fail('did not arrive');});
test('all 15 floor requests drain with doors closed in motion',()=>{const c=new LiftController();for(let i=0;i<15;i++)c.callCar(i);run(c,drained,300);assert.equal(new Set(c.stops).size,15);});
test('9F up and B1 down clear at their arrivals without endless shuttling',()=>{
  const c=new LiftController();c.callHall(13,1);c.callHall(4,-1);
  run(c,x=>x.state==='open');assert.equal(c.floor,13);assert.equal(c.up.has(13),false,'9F up must clear before reversing');assert.equal(c.down.has(4),true);
  run(c,drained);assert.deepEqual(c.stops,[13,4]);
  for(let i=0;i<120*60;i++)c.tick(1/120);
  assert.equal(c.state,'idle');assert.deepEqual(c.stops,[13,4]);assert.deepEqual(c.pending(),[]);
});
test('B1 down then 9F up clears the mirrored arrival order',()=>{
  const c=new LiftController();c.callHall(4,-1);c.callHall(13,1);
  run(c,x=>x.state==='open');assert.equal(c.floor,4);assert.equal(c.down.has(4),false,'B1 down must clear before reversing');
  run(c,drained);assert.deepEqual(c.stops,[4,13]);
});
test('every ordered pair of valid hall calls drains from 1F',()=>{
  const calls=[];for(let floor=0;floor<15;floor++)for(const dir of [-1,1])if(!(floor===0&&dir===-1)&&!(floor===14&&dir===1))calls.push([floor,dir]);
  let scenarios=0;
  for(let a=0;a<calls.length;a++)for(let b=0;b<calls.length;b++)if(a!==b){
    const c=new LiftController();c.callHall(...calls[a]);c.callHall(...calls[b]);
    run(c,drained,180);assert.equal(c.up.size+c.down.size,0);scenarios++;
  }
  assert.equal(scenarios,756);
});
test('up pickup keeps boarding direction for a new higher destination',()=>{
  const c=new LiftController();c.callHall(13,1);c.callHall(4,-1);
  run(c,x=>x.state==='open');assert.equal(c.direction,1,'9F upward boarding keeps its direction during dwell');
  c.callCar(14);run(c,drained);assert.deepEqual(c.stops,[13,14,4]);
});
test('manual and passenger obstruction sources cannot clear each other',()=>{
 const c=new LiftController();c.openDoor();run(c,x=>x.state==='open');c.setObstruction(true,'manual');c.setObstruction(true,'player');c.setObstruction(false,'player');assert.equal(c.obstruction,true);
 c.setObstruction(true,'player');c.setObstruction(false,'manual');assert.equal(c.obstruction,true);assert.equal(c.closeDoor(),false);c.setObstruction(false,'player');assert.equal(c.obstruction,false);assert.equal(c.closeDoor(),true);
});
test('passenger in doorway reopens closing door and prevents departure',()=>{
 const c=new LiftController();c.openDoor();run(c,x=>x.state==='open');c.callCar(6);c.closeDoor();run(c,x=>x.door<.9);c.setObstruction(true,'player');run(c,x=>x.state==='open');
 for(let i=0;i<120*8;i++)c.tick(1/120);assert.equal(c.position,17.5);assert.equal(c.door,1);c.setObstruction(false,'player');run(c,drained);assert.equal(c.floor,6);
});
test('car call cancellation, clearCarCalls, ETA, and cabin environment controls (light, fan, music, intercom) work properly',()=>{
 const c=new LiftController();
 assert.equal(c.toggleCar(10,{allowCancel:true}).action,'added');
 assert.equal(c.car.has(10),true);
 assert.ok(c.etaToFloor(10)>0);
 assert.equal(c.toggleCar(10,{allowCancel:true}).action,'cancelled');
 assert.equal(c.car.has(10),false);
 c.callCar(8);c.callCar(12);
 assert.equal(c.clearCarCalls(),2);
 assert.equal(c.car.size,0);
 assert.equal(c.cabinLightMode.id,'warm');
 assert.equal(c.cycleCabinLight().mode.id,'daylight');
 assert.equal(c.cabinFanMode.id,'auto');
 assert.equal(c.cycleCabinFan().mode.id,'turbo');
 assert.equal(c.cabinMusicTrack.playing,true);
 c.cycleCabinMusic();c.cycleCabinMusic();
 assert.equal(c.cycleCabinMusic().track.playing,false);
 assert.equal(c.callIntercom().ok,true);
 assert.ok(c.intercomActiveUntil>c.time);
 // Horizontal accessible COP (장애인 배려 운전 모드): extends door dwell to 7.5s and close time to 2.8s
 assert.equal(c.accessibleMode,false);
 assert.equal(c.effectiveDwellSeconds,3);
 assert.equal(c.toggleAccessibleMode().accessibleMode,true);
 assert.equal(c.effectiveDwellSeconds,7.5);
 assert.equal(c.effectiveCloseSeconds,2.8);
 c.openDoor();
 assert.equal(c.dwell,7.5);
 assert.equal(c.toggleAccessibleMode(false).accessibleMode,false);
});


