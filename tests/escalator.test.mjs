import {HotelWorld} from '../src/hotel-world.js';import {test} from 'node:test';import assert from 'node:assert/strict';import {Escalators,escalatorLayout} from '../src/escalator.js';import {WalkingPlayer} from '../src/player.js';import {LiftController} from '../src/controller.js';
const walk=(p,c,forward,strafe,seconds)=>{for(let i=0;i<seconds*120;i++)p.move(forward,strafe,1/120,c);};
const board=(p,f,up=true)=>{const l=escalatorLayout(f),sign=Math.sign(l.end-l.start);Object.assign(p,{x:l.start+sign*.01,z:up?l.upZ:l.downZ,zone:'escalator',escalatorY:(f-5)*3.5+(up?.01/6*3.5:3.5-.01/6*3.5),floor:up?f:f+1});};
test('automatic up/down has continuous height and stops when paused',()=>{const e=new Escalators(),p=new WalkingPlayer(null,null,e),c=new LiftController();board(p,5);let last=p.eyeY(c);for(let i=0;i<1800;i++){e.carry(p,.01,c);assert.ok(Math.abs(p.eyeY(c)-last)<.01);last=p.eyeY(c);}assert.equal(p.floor,6);const x=p.x;c.paused=true;e.carry(p,.1,c);assert.equal(p.x,x);});
test('every adjacent floor pair supports both directions and bounds',()=>{const e=new Escalators(),c=new LiftController();for(let f=0;f<14;f++)for(const up of [true,false]){const p=new WalkingPlayer(null,null,e);board(p,f,up);for(let i=0;i<1800;i++)e.carry(p,.01,c);assert.equal(p.floor,up?f+1:f);assert.ok(Math.abs(p.groundY(c)-(p.floor-5)*3.5)<1e-8);assert.ok(p.floor>=0&&p.floor<=14);}});
test('crossed flights allow continuous ascending and descending using adjacent lane at arrival',()=>{const e=new Escalators(),p=new WalkingPlayer(null,null,e),c=new LiftController();board(p,0,true);for(let f=0;f<14;f++){const l=escalatorLayout(f);for(let i=0;i<1800;i++)e.carry(p,.01,c);assert.equal(p.floor,f+1);if(f<13){const next=escalatorLayout(f+1);assert.equal(l.end,next.start);assert.notEqual(l.upZ,next.upZ);const dz=next.upZ-p.z;walk(p,c,dz<0?1:-1,0,Math.abs(dz)/2);walk(p,c,0,Math.sign(next.end-next.start),.05);}}walk(p,c,-1,0,(6.4-p.z)/2);const target=escalatorLayout(13).start-.02;walk(p,c,0,Math.sign(target-p.x),Math.abs(target-p.x)/2);for(let f=13;f>=0;f--){const l=escalatorLayout(f),dz=l.downZ-p.z;walk(p,c,dz<0?1:-1,0,Math.abs(dz)/2);walk(p,c,0,Math.sign(l.end-l.start),.05);for(let i=0;i<1800;i++)e.carry(p,.01,c);assert.equal(p.floor,f);}});
test('hotel and parking west wings remain reachable with escalators attached',()=>{for(const floor of [4,5]){const p=new WalkingPlayer(null,new HotelWorld(),new Escalators()),c=new LiftController();Object.assign(p,{x:0,z:19,floor});walk(p,c,0,-1,4);assert.ok(p.x<-7);assert.equal(p.zone,'lobby');}});

test('opposed lane slopes maintain 3.5m clearance between successive storeys',()=>{const e=new Escalators();for(let f=0;f<13;f++)for(const z of [2.35,4.45])for(const x of [-9.9,-9,-7,-5,-4.1]){const base=(f-5)*3.5,t=z===2.35?(-4-x)/6:(x+10)/6,y=base+t*3.5;assert.ok(Math.abs(e.surfaceAt(x,z,y+3.5)-y-3.5)<1e-7);}});

test('escalator rear space permits comfortable walking and camera stays bounded within back wall', () => {
  const e = new Escalators(), p = new WalkingPlayer(null, new HotelWorld(), e), c = new LiftController();
  Object.assign(p, { x: -6.5, z: 6.4, floor: 5, zone: 'escalator', escalatorY: 0, yaw: 0 });
  walk(p, c, -1, 0, 5, true);
  assert.ok(p.z > 7.6, `Expected p.z to reach expanded rear corridor (> 7.6), got ${p.z}`);
  assert.ok(p.z <= 7.85, `Expected p.z to stay bounded within back wall (<= 7.85), got ${p.z}`);
  walk(p, c, -1, 0, 3, true);
  assert.ok(p.z <= 7.85);
  assert.equal(p.zone, 'escalator');
  assert.equal(p.canOccupy(-6.5, 7.95, c), false);
  assert.equal(p.canOccupy(-6.5, 8.2, c), false);
});
