import test from 'node:test';import assert from 'node:assert/strict';
import {HotelWorld} from '../src/hotel-world.js';import {WalkingPlayer} from '../src/player.js';import {Stairwell} from '../src/stairs.js';import {LiftController} from '../src/controller.js';
const setup=()=>{const world=new HotelWorld(),p=new WalkingPlayer(new Stairwell(),world),c=new LiftController();return {world,p,c};};
const walk=(p,c,f,s,t)=>{for(let i=0;i<Math.ceil(t*120);i++)p.move(f,s,1/120,c);};
test('player walks from elevator vestibule into expanded lobby and returns',()=>{const {p,c}=setup();walk(p,c,-1,0,4);assert.ok(p.z>10);assert.equal(p.zone,'lobby');assert.equal(p.floor,5);walk(p,c,1,0,4);assert.ok(Math.abs(p.z-2.65)<.02);assert.equal(p.eyeY(c),1.65);});
test('furniture and parked cars block walking while aisles stay open',()=>{const {world}=setup();world.addObstacle(5,-4,-2,20,22);assert.equal(world.surfaceAt(-3,21,0,5),null);assert.equal(world.surfaceAt(0,16,0,5),0);world.addObstacle(4,-10,-8,13,17);assert.equal(world.surfaceAt(-9,15,-3.5,4),null);assert.equal(world.surfaceAt(0,15,-3.5,4),-3.5);});
test('all five basement ramps connect continuously up to ground level',()=>{const {world}=setup();for(let f=0;f<5;f++){let y=(f-5)*3.5;const forward=f%2===0;for(let i=0;i<=240;i++){const z=forward?10+i*.1:34-i*.1;const next=world.surfaceAt(f%2===0?14:20,z,y,f);assert.notEqual(next,null);assert.ok(Math.abs(next-y)<.016);y=next;}assert.ok(Math.abs(y-(f-4)*3.5)<.001);}});
test('walking on ramps changes floor smoothly and never follows elevator',()=>{const {p,c}=setup();p.floor=4;p.x=14;p.z=10;p.zone='lobby';const heights=[];for(let i=0;i<1500;i++){p.move(-1,0,1/120,c);heights.push(p.eyeY(c));if(p.z>34.1)break;}assert.equal(p.floor,5);assert.ok(Math.abs(p.eyeY(c)-1.65)<.001);assert.ok(heights.every((h,i)=>!i||Math.abs(h-heights[i-1])<.01));c.floor=10;c.position=35;p.sync(c);assert.equal(p.floor,5);});
test('closed building walls cannot be crossed and guest floors stay bounded',()=>{const {p,c}=setup();p.z=18;p.x=11.5;walk(p,c,0,1,2);assert.ok(p.x<=11.7+1e-6);p.floor=6;p.x=0;p.z=2.65;walk(p,c,-1,0,5);assert.ok(p.z<=3.42);});
test('ground plaza leaves ramp entrance clear for continuous descent to B1',()=>{
 const {p,c}=setup();p.floor=5;p.zone='lobby';p.x=14;p.z=35;const heights=[];
 for(let i=0;i<1800;i++){p.move(1,0,1/120,c);heights.push(p.eyeY(c));if(p.z<9.9)break;}
 assert.equal(p.floor,4);assert.ok(p.z<10);assert.ok(Math.abs(p.eyeY(c)-(-3.5+1.65))<.001);assert.ok(heights.every((h,i)=>!i||Math.abs(h-heights[i-1])<.01));
});
test('both directions on all ramps remain connected to adjacent levels',()=>{
 const {world}=setup();for(let f=0;f<5;f++){let y=(f-4)*3.5;const even=f%2===0;for(let i=0;i<=240;i++){const z=even?34-i*.1:10+i*.1;const next=world.surfaceAt(even?14:20,z,y,f+1);assert.notEqual(next,null);assert.ok(Math.abs(next-y)<.016);y=next;}assert.ok(Math.abs(y-(f-5)*3.5)<.001);}
});
