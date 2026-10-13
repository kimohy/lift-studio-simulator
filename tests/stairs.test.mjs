import test from 'node:test';import assert from 'node:assert/strict';
import {Stairwell,STAIRS} from '../src/stairs.js';
import {WalkingPlayer} from '../src/player.js';import {LiftController} from '../src/controller.js';
const walk=(p,c,forward,strafe,seconds)=>{for(let i=0;i<Math.ceil(seconds*120);i++)p.move(forward,strafe,1/120,c);};
const setup=()=>{const stairs=new Stairwell(),p=new WalkingPlayer(stairs),c=new LiftController();return {stairs,p,c};};
function open(stairs,floor,p){assert.ok(stairs.toggleDoor(floor,p));stairs.update(1);}
function travel(p,c,x,z){const dx=x-p.x,dz=z-p.z;if(Math.abs(dx)>.015){p.yaw=0;walk(p,c,0,Math.sign(dx),Math.abs(dx)/p.speed);}if(Math.abs(dz)>.015){p.yaw=0;walk(p,c,-Math.sign(dz),0,Math.abs(dz)/p.speed);}}
function up(p,c){travel(p,c,4.2,2.8);travel(p,c,4.2,7);travel(p,c,6.2,7);travel(p,c,6.2,2.8);}
function down(p,c){travel(p,c,6.2,2.8);travel(p,c,6.2,7);travel(p,c,4.2,7);travel(p,c,4.2,2.8);}
test('closed stair door blocks passage; opening permits walking into stairs',()=>{const {stairs,p,c}=setup();walk(p,c,0,1,3);assert.equal(p.zone,'lobby');assert.ok(p.x<=2.28);open(stairs,5,p);walk(p,c,0,1,1);assert.equal(p.zone,'stairs');assert.equal(p.floor,5);});
test('switchback stairs ascend and descend without elevator or height jumps',()=>{const {stairs,p,c}=setup();open(stairs,5,p);travel(p,c,3,2.65);const heights=[];const move=p.move.bind(p);p.move=(...args)=>{move(...args);heights.push(p.eyeY(c));};up(p,c);assert.equal(p.floor,6);assert.equal(p.zone,'stairs');assert.ok(Math.abs(p.eyeY(c)-5.15)<.01);assert.ok(heights.every((y,i)=>!i||Math.abs(y-heights[i-1])<.025));down(p,c);assert.equal(p.floor,5);assert.ok(Math.abs(p.eyeY(c)-1.65)<.01);assert.equal(c.floor,5);});
test('every floor from B5 through 10F is reachable on foot, with bounded ends',()=>{const {stairs,p,c}=setup();open(stairs,5,p);travel(p,c,3,2.65);for(let i=5;i<14;i++){up(p,c);assert.equal(p.floor,i+1);}const y=p.eyeY(c);travel(p,c,4.2,2.8);walk(p,c,-1,0,5);assert.equal(p.floor,14);assert.equal(p.eyeY(c),y);for(let i=14;i>0;i--){down(p,c);assert.equal(p.floor,i-1);}travel(p,c,6.2,2.8);walk(p,c,-1,0,5);assert.equal(p.floor,0);assert.ok(p.z<=STAIRS.start);});
test('destination door blocks return until opened; lobby stays on new floor',()=>{const {stairs,p,c}=setup();open(stairs,5,p);travel(p,c,3,2.65);up(p,c);travel(p,c,3,2.65);walk(p,c,0,-1,2);assert.equal(p.zone,'stairs');assert.ok(p.x>=2.8-1e-6);open(stairs,6,p);walk(p,c,0,-1,1.5);assert.equal(p.zone,'lobby');assert.equal(p.floor,6);c.floor=12;c.position=42;p.sync(c);assert.equal(p.floor,6);assert.equal(p.eyeY(c),5.15);});
test('door cannot close on passenger, and partial opening is impassable',()=>{const {stairs,p,c}=setup();stairs.toggleDoor(5,p);stairs.update(.1);walk(p,c,0,1,3);assert.equal(p.zone,'lobby');stairs.update(1);travel(p,c,2.65,2.65);assert.equal(stairs.toggleDoor(5,p),false);assert.equal(stairs.doors[5].target,1);});
test('staircase cannot be entered through walls or crossed through flight gap',()=>{const {stairs,p,c}=setup();p.z=1.45;open(stairs,5,p);walk(p,c,0,1,4);assert.equal(p.zone,'lobby');p.z=2.65;travel(p,c,4.2,5);const x=p.x;walk(p,c,0,1,2);assert.ok(p.x<5);assert.ok(p.x>=x);});
test('pause stops stair movement and reset returns to 1F',()=>{const {stairs,p,c}=setup();open(stairs,5,p);travel(p,c,3,2.65);up(p,c);c.paused=true;const y=p.eyeY(c);walk(p,c,-1,0,2);assert.equal(p.eyeY(c),y);p.reset();stairs.reset();assert.equal(p.zone,'lobby');assert.equal(p.floor,5);assert.equal(p.eyeY(c),1.65);assert.ok(stairs.doors.every(d=>d.open===0));});
test('after using stairs, passenger can call and board the elevator on that floor',()=>{
 const {stairs,p,c}=setup();open(stairs,5,p);travel(p,c,3,2.65);up(p,c);open(stairs,6,p);travel(p,c,3,2.65);travel(p,c,0,2.65);assert.equal(p.zone,'lobby');
 c.callHall(6,-1);for(let i=0;i<120*40;i++){c.tick(1/120);p.sync(c);if(c.floor===6&&c.state==='open')break;}
 assert.equal(c.floor,6);assert.equal(p.floor,6);assert.equal(p.eyeY(c),5.15);walk(p,c,1,0,1.3);assert.equal(p.zone,'cabin');assert.equal(p.floor,6);
});
test('door reopens if a walking passenger reaches its closing swing area',()=>{
 const {stairs,p}=setup();stairs.doors[5]={open:1,target:0};p.x=3.7;p.z=2.35;p.zone='stairs';p.stairY=0;stairs.update(.1,p);assert.equal(stairs.doors[5].target,1);assert.equal(stairs.doors[5].open,1);
});
