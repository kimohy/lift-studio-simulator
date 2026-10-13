import test from 'node:test';
import assert from 'node:assert/strict';
import {WalkingPlayer} from '../src/player.js';
import {LiftController} from '../src/controller.js';
const walk=(p,c,forward,strafe,seconds)=>{for(let i=0;i<Math.ceil(seconds*120);i++)p.move(forward,strafe,1/120,c);};
const open=c=>{c.openDoor();for(let i=0;i<170;i++)c.tick(1/120);};
test('spawns in 1F lobby at human eye height',()=>{const p=new WalkingPlayer(),c=new LiftController();assert.equal(p.zone,'lobby');assert.equal(p.floor,5);assert.equal(p.eyeY(c),1.65);});
test('closed doors prevent walking into shaft',()=>{const p=new WalkingPlayer(),c=new LiftController();walk(p,c,1,0,4);assert.equal(p.zone,'lobby');assert.ok(p.z>=1.4-1e-6);});
test('open aligned car can be boarded by walking',()=>{const p=new WalkingPlayer(),c=new LiftController();open(c);walk(p,c,1,0,1.3);assert.equal(p.zone,'cabin');assert.ok(p.z<.66);});
test('cannot board a car at another floor',()=>{const p=new WalkingPlayer(),c=new LiftController();c.position=21;c.floor=6;c.door=1;c.state='open';walk(p,c,1,0,4);assert.equal(p.zone,'lobby');assert.equal(p.floor,5);assert.ok(p.z>=1.4-1e-6);});
test('partly opened door is not passable',()=>{const p=new WalkingPlayer(),c=new LiftController();c.door=.6;c.state='opening';walk(p,c,1,0,4);assert.equal(p.zone,'lobby');assert.ok(p.z>=1.4-1e-6);});
test('cannot bypass doorway through facade',()=>{const p=new WalkingPlayer(),c=new LiftController();open(c);p.x=.8;walk(p,c,1,0,4);assert.equal(p.zone,'lobby');assert.ok(p.z>=1.4-1e-6);});
test('diagonal walking is normalized',()=>{const p=new WalkingPlayer(),q=new WalkingPlayer(),c=new LiftController();walk(p,c,0,1,.2);walk(q,c,1,1,.2);assert.ok(Math.abs(Math.hypot(q.x,q.z-2.65)-p.x)<1e-6);});
test('lobby bounds prevent escaping the building',()=>{const p=new WalkingPlayer(),c=new LiftController();walk(p,c,0,1,20);walk(p,c,-1,0,20);assert.ok(p.x<=2.28);assert.ok(p.z<=3.42);});
test('large step cannot tunnel through closed doorway',()=>{const p=new WalkingPlayer(),c=new LiftController();p.move(1,0,10,c);assert.ok(p.z>=1.4-1e-6);assert.equal(p.zone,'lobby');});
test('passenger rides the cabin and exits onto destination floor',()=>{
 const p=new WalkingPlayer(),c=new LiftController();open(c);walk(p,c,1,0,1.3);c.callCar(6);c.closeDoor();
 for(let i=0;i<120*30;i++){c.tick(1/120);p.sync(c);if(c.floor===6&&c.state==='open')break;}
 assert.equal(p.zone,'cabin');assert.equal(p.floor,6);assert.equal(p.eyeY(c),5.15);
 walk(p,c,-1,0,1.3);assert.equal(p.zone,'lobby');assert.equal(p.floor,6);assert.equal(p.eyeY(c),5.15);
 c.position=28;c.floor=8;c.state='moving';p.sync(c);assert.equal(p.eyeY(c),5.15);
});
test('cabin walls and closed car door prevent exiting in motion',()=>{const p=new WalkingPlayer(),c=new LiftController();open(c);walk(p,c,1,0,1.3);c.door=0;c.state='moving';c.position=19;c.velocity=1;walk(p,c,-1,0,5);assert.equal(p.zone,'cabin');assert.ok(p.z<=.66+1e-6);walk(p,c,0,1,5);assert.ok(p.x<=.70);});
test('threshold occupant trips sensor; standing in cabin does not',()=>{const p=new WalkingPlayer(),c=new LiftController();open(c);walk(p,c,1,0,.85);assert.ok(p.inDoorway());walk(p,c,1,0,.7);assert.equal(p.inDoorway(),false);});
test('pause freezes player walking',()=>{const p=new WalkingPlayer(),c=new LiftController();c.paused=true;walk(p,c,0,1,2);assert.equal(p.x,0);});
test('leaving game at threshold moves to safe side',()=>{const p=new WalkingPlayer(),c=new LiftController();open(c);walk(p,c,1,0,.85);p.leaveDoorway();assert.equal(p.inDoorway(),false);assert.equal(p.zone,'lobby');assert.ok(p.z>=1.4);});
test('look clamps pitch and WASD follows yaw',()=>{const p=new WalkingPlayer(),c=new LiftController();p.look(0,100000);assert.ok(Math.abs(p.pitch)<=1.3);p.yaw=Math.PI/2;walk(p,c,1,0,.2);assert.ok(p.x<-.39);});
test('waiting against closed landing does not obstruct doors',()=>{const p=new WalkingPlayer(),c=new LiftController();walk(p,c,1,0,4);assert.equal(p.blocksDoor(c),false);});
test('player cannot obstruct an elevator on another floor',()=>{const p=new WalkingPlayer(),c=new LiftController();p.z=1.2;c.position=21;c.floor=6;c.door=1;c.state='open';c.callCar(5);for(let i=0;i<120*30;i++){c.setObstruction(p.blocksDoor(c),'player');c.tick(1/120);if(c.floor===5&&c.state==='open')break;}assert.equal(c.floor,5);assert.equal(c.state,'open');});

test('sprint triples movement, release restores walking and closed doors still block',()=>{const c=new LiftController(),p=new WalkingPlayer();p.move(0,1,.1,c);const normal=p.x;p.reset();p.move(0,1,.1,c,true);assert.ok(Math.abs(p.x-normal*3)<1e-8);const before=p.x;p.move(0,1,.1,c,false);assert.ok(Math.abs(p.x-before-normal)<1e-8);p.reset();for(let i=0;i<20;i++)p.move(1,0,.25,c,true);assert.ok(p.z>=1.4-1e-6);});
