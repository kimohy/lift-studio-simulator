import {HotelWorld} from '../src/hotel-world.js';import {test} from 'node:test';import assert from 'node:assert/strict';import {ESCALATOR,ESCALATOR_STOPS,Escalators,escalatorLayout} from '../src/escalator.js';import {WalkingPlayer} from '../src/player.js';import {LiftController} from '../src/controller.js';
const walk=(p,c,forward,strafe,seconds)=>{for(let i=0;i<seconds*120;i++)p.move(forward,strafe,1/120,c);};
const board=(p,f,up=true)=>{const l=escalatorLayout(f),sign=Math.sign(l.end-l.start),h=l.height;Object.assign(p,{x:l.start+sign*.01,z:up?l.upZ:l.downZ,zone:'escalator',escalatorY:l.baseY+(up?.01/ESCALATOR.run*h:h-.01/ESCALATOR.run*h),floor:up?l.floor:l.nextFloor});};
test('automatic up/down has continuous height and stops when paused',()=>{const e=new Escalators(),p=new WalkingPlayer(null,null,e),c=new LiftController();board(p,5);let last=p.eyeY(c);for(let i=0;i<2600;i++){e.carry(p,.01,c);assert.ok(Math.abs(p.eyeY(c)-last)<.01);last=p.eyeY(c);}assert.equal(p.floor,7);board(p,5);const x=p.x;c.paused=true;e.carry(p,.1,c);assert.equal(p.x,x);});
test('every adjacent floor pair supports both directions and bounds',()=>{const e=new Escalators(),c=new LiftController();for(let idx=0;idx<ESCALATOR_STOPS.length-1;idx++){const f=ESCALATOR_STOPS[idx],nextF=ESCALATOR_STOPS[idx+1];for(const up of [true,false]){const p=new WalkingPlayer(null,null,e);board(p,f,up);for(let i=0;i<2600;i++)e.carry(p,.01,c);assert.equal(p.floor,up?nextF:f);assert.ok(Math.abs(p.groundY(c)-(p.floor-5)*3.5)<1e-8);assert.ok(p.floor>=0&&p.floor<=13);}}});
test('crossed flights allow continuous ascending and descending using adjacent lane at arrival',()=>{const e=new Escalators(),p=new WalkingPlayer(null,null,e),c=new LiftController();board(p,0,true);for(let idx=0;idx<ESCALATOR_STOPS.length-1;idx++){const l=escalatorLayout(ESCALATOR_STOPS[idx]);for(let i=0;i<2600;i++)e.carry(p,.01,c);assert.equal(p.floor,l.nextFloor);if(idx<ESCALATOR_STOPS.length-2){const next=escalatorLayout(ESCALATOR_STOPS[idx+1]);assert.equal(l.end,next.start);assert.notEqual(l.upZ,next.upZ);const dz=next.upZ-p.z;walk(p,c,dz<0?1:-1,0,Math.abs(dz)/2);walk(p,c,0,Math.sign(next.end-next.start),.05);}}walk(p,c,-1,0,(23.4-p.z)/2);const topL=escalatorLayout(ESCALATOR_STOPS[ESCALATOR_STOPS.length-2]);const target=topL.start-Math.sign(topL.end-topL.start)*.02;walk(p,c,0,Math.sign(target-p.x),Math.abs(target-p.x)/2);for(let idx=ESCALATOR_STOPS.length-2;idx>=0;idx--){const f=ESCALATOR_STOPS[idx],l=escalatorLayout(f),dz=l.downZ-p.z;walk(p,c,dz<0?1:-1,0,Math.abs(dz)/2);walk(p,c,0,Math.sign(l.end-l.start),.05);for(let i=0;i<2600;i++)e.carry(p,.01,c);assert.equal(p.floor,f);}});
test('hotel and parking west wings remain reachable with escalators attached',()=>{for(const floor of [4,5]){const p=new WalkingPlayer(null,new HotelWorld(),new Escalators()),c=new LiftController();Object.assign(p,{x:0,z:19,floor});walk(p,c,0,-1,4);assert.ok(p.x<-7);assert.equal(p.zone,'lobby');}});

test('opposed lane slopes maintain clear headroom between successive direct flights',()=>{const e=new Escalators();for(const idx of [0,1,2,3,5,6,7]){const l=escalatorLayout(ESCALATOR_STOPS[idx]);for(const z of [18.55,21.45])for(const x of [-36.9,-35,-31,-27,-25.1]){const y=l.baseY+((z===l.upZ?x-l.start:x-l.end)/(z===l.upZ?l.end-l.start:l.start-l.end))*l.height;assert.ok(Math.abs(e.surfaceAt(x,z,y+l.height)-y-l.height)<1e-7);}}});

test('escalator rear space permits comfortable walking and camera stays bounded within back wall', () => {
  const e = new Escalators(), p = new WalkingPlayer(null, new HotelWorld(), e), c = new LiftController();
  Object.assign(p, { x: -31.0, z: 23.4, floor: 5, zone: 'escalator', escalatorY: 0, yaw: 0 });
  walk(p, c, -1, 0, 5, true);
  assert.ok(p.z > 24.4, `Expected p.z to reach south crossover promenade (> 24.4), got ${p.z}`);
  assert.ok(p.z <= 24.6, `Expected p.z to stay bounded within back balustrade (<= 24.6), got ${p.z}`);
  walk(p, c, -1, 0, 3, true);
  assert.ok(p.z <= 24.6);
  assert.equal(p.zone, 'escalator');
  assert.equal(p.canOccupy(-31.0, 24.75, c), false);
  assert.equal(p.canOccupy(-31.0, 25.0, c), false);
});

test('escalator emergency stop toggles state and halts carrying', () => {
  const e = new Escalators(), p = new WalkingPlayer(null, null, e), c = new LiftController();
  board(p, 5);
  const startX = p.x;
  e.carry(p, 0.5, c);
  assert.notEqual(p.x, startX);

  assert.equal(e.stopped, false);
  const stopped = e.toggleStop();
  assert.equal(stopped, true);
  assert.equal(e.stopped, true);

  const currentX = p.x;
  e.carry(p, 1.0, c);
  assert.equal(p.x, currentX, 'Player position should not change while stopped');

  const resumed = e.toggleStop();
  assert.equal(resumed, false);
  assert.equal(e.stopped, false);
  e.carry(p, 0.5, c);
  assert.notEqual(p.x, currentX, 'Player position should advance when resumed');
});

