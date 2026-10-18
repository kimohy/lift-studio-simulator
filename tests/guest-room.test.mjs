import {test} from 'node:test';import assert from 'node:assert/strict';import {HotelStay} from '../src/hotel-stay.js';import {GuestRoom} from '../src/guest-room.js';import {WalkingPlayer} from '../src/player.js';import {LiftController} from '../src/controller.js';
const setup=()=>{const stay=new HotelStay(),r=new GuestRoom(stay),p=new WalkingPlayer(null,null,null,r),c=new LiftController();Object.assign(p,{floor:7,x:-1.38,z:3.1,yaw:Math.PI});return {stay,r,p,c};};const walk=(p,c,f,s,sec,run=false)=>{for(let i=0;i<sec*120;i++)p.move(f,s,1/120,c,run);};const open=(r,p)=>{r.toggle(p);for(let i=0;i<100;i++)r.update(.01,p);};
test('no keycard means no unlock or door tunnelling even while running',()=>{const {r,p,c}=setup();assert.equal(r.toggle(p).ok,false);walk(p,c,1,0,3,true);assert.ok(p.z<=3.42);assert.equal(r.target,0);});
test('301 card opens guest door, permits walking in, closes and allows exit from inside',()=>{const {stay,r,p,c}=setup();stay.checkIn('reception-a');open(r,p);walk(p,c,1,0,1.3);assert.equal(p.zone,'room');assert.ok(p.z>5);assert.equal(r.toggle(p).ok,true);for(let i=0;i<100;i++)r.update(.01,p);assert.equal(r.open,0);stay.keycard=null;assert.equal(r.toggle(p).ok,true);for(let i=0;i<100;i++)r.update(.01,p);p.yaw=0;walk(p,c,1,0,2);assert.equal(p.zone,'lobby');assert.ok(p.z<3.42);});
test('room walls cannot be entered from escalators or exited sideways, furniture blocks movement',()=>{const {stay,r,p,c}=setup();stay.checkIn('reception-a');open(r,p);assert.equal(r.canOccupy(-2.2,6.4,{...p,zone:'escalator',x:-2.8,z:6.4,groundY:()=>7},c),false);walk(p,c,1,0,1.3);walk(p,c,0,-1,4,true);assert.ok(p.x<=2.28);r.addObstacle(-1.7,-1.1,6.2,7);Object.assign(p,{x:-1.38,z:5.5,yaw:Math.PI});walk(p,c,1,0,4,true);assert.ok(p.z<6.2);});
test('door refuses closing on the guest and reset closes door while retaining card',()=>{const {stay,r,p,c}=setup();stay.checkIn('reception-a');open(r,p);walk(p,c,1,0,.4);assert.equal(r.toggle(p).ok,false);r.reset();assert.equal(r.open,0);assert.ok(stay.canAccess('301'));assert.equal(stay.canAccess('302'),false);});
test('guest room interactive amenities (TV, lighting, curtain, shower, bed rest, food tray) work properly',()=>{
  const {r,p}=setup();
  assert.equal(r.tvMode,'welcome');
  assert.equal(r.cycleTV().mode,'cinema');
  assert.equal(r.cycleTV().mode,'lounge');
  assert.equal(r.cycleTV().mode,'off');
  assert.equal(r.cycleTV().mode,'welcome');
  assert.equal(r.lightMode,'bright');
  assert.equal(r.cycleLight().mode,'warm');
  assert.equal(r.cycleLight().mode,'night');
  assert.equal(r.cycleLight().mode,'bright');
  assert.equal(r.curtainTarget,1);
  r.toggleCurtain();
  assert.equal(r.curtainTarget,0);
  for(let i=0;i<100;i++)r.update(.02,p);
  assert.equal(r.curtainOpen,0);
  assert.equal(r.showerOn,false);
  r.toggleShower();
  assert.equal(r.showerOn,true);
  p.zone='room';
  assert.ok(r.restOnBed(p).message.includes('침대'));
  assert.equal(p.x,0.25);
  assert.equal(r.consumeFood().ok,false);
  r.deliverFood('그랜드 시그니처 커피 & 크루아상 세트');
  assert.ok(r.foodItem);
  assert.equal(r.consumeFood().ok,true);
  assert.equal(r.foodItem,null);
  // New Room 301 amenities: Armchair, Coffee Machine, Minibar, Digital Safe, Wardrobe Bathrobe, Thermostat, Bluetooth Speaker
  assert.equal(r.sitArmchair(p).ok,true);
  assert.equal(p.x,0.65);
  assert.equal(p.z,11.75);
  assert.equal(r.coffeeBrewed,false);
  assert.equal(r.brewCoffee().ok,true);
  assert.equal(r.coffeeBrewed,true);
  assert.equal(r.useMinibar().open,true);
  for(let i=0;i<40;i++)r.update(.02,p);
  assert.equal(r.minibarOpen,1);
  assert.equal(r.useMinibar().open,false);
  assert.equal(r.toggleSafe().open,true);
  for(let i=0;i<40;i++)r.update(.02,p);
  assert.equal(r.safeOpen,1);
  assert.equal(r.toggleSafe().open,false);
  assert.equal(r.wearingRobe,false);
  assert.equal(r.toggleWardrobe().wearingRobe,true);
  assert.equal(r.toggleWardrobe().wearingRobe,false);
  assert.equal(r.acMode.temp,22);
  assert.equal(r.cycleThermostat().temp,24);
  assert.equal(r.audioTrack.playing,false);
  assert.equal(r.cycleAudio().playing,true);
});
test('service robot DELI takes room service order, rides elevator to 3F Room 301, delivers food, and returns to 1F',async()=>{
  const {ServiceRobot}=await import('../src/service-robot.js');
  const {r,c}=setup();
  let notified='';
  const robot=new ServiceRobot(r,{onNotify:(msg)=>{notified=msg;}});
  const orderRes=robot.orderRoomService();
  assert.equal(orderRes.ok,true);
  assert.equal(robot.orderState,'going_to_lift_up');
  for(let i=0;i<4000;i++){
    c.step(1/30);
    robot.update(1/30,c);
    if(r.foodItem && robot.orderState==='arrived_at_room'){
      robot.interact(c.time);
    }
    if(r.foodItem && robot.orderState==='none' && robot.floor===5)break;
  }
  assert.ok(r.foodItem,'Food should be delivered to Room 301');
  assert.ok(notified.includes('301호'),'Arrival notification should mention Room 301');
  assert.equal(robot.floor,5,'Robot should return to 1F after delivery');
  assert.equal(robot.orderState,'none');
});
test('10F rooftop infinity pool allows walking from 10F landing, swimming in water, jacuzzi, sunbed, sky bar, and LED control',async()=>{
  const {RooftopPool}=await import('../src/rooftop-pool.js');
  const pool=new RooftopPool();
  const c=new LiftController();
  const p=new WalkingPlayer(null,null,null,null,pool);
  Object.assign(p,{floor:14,x:0,z:2.8,yaw:Math.PI,zone:'lobby'});
  // Walk straight through the central archway onto the 10F rooftop pool deck
  walk(p,c,1,0,1.5,true);
  assert.equal(p.zone,'pool');
  assert.ok(p.z>10 && p.z<14);
  const deckEye=p.eyeY(c);
  assert.equal(deckEye,(14-5)*3.5+1.65);
  // Dive into the infinity pool
  const swimIn=pool.toggleSwim(p);
  assert.equal(swimIn.ok,true);
  assert.equal(swimIn.swimming,true);
  assert.equal(pool.inPool(p.x,p.z),true);
  assert.ok(p.eyeY(c)<deckEye-0.5,'Eye height should lower to water level when swimming');
  // Exit pool back onto teak deck
  const swimOut=pool.toggleSwim(p);
  assert.equal(swimOut.swimming,false);
  assert.equal(pool.inPool(p.x,p.z),false);
  // Enter jacuzzi and toggle bubbles
  const jac1=pool.toggleJacuzzi(p);
  assert.equal(jac1.ok,true);
  assert.equal(pool.inJacuzzi(p.x,p.z),true);
  const jac2=pool.toggleJacuzzi(p);
  assert.equal(jac2.on,false);
  // Rest on sunbed, order drink at Sky Bar, and cycle underwater LEDs
  assert.equal(pool.restOnSunbed(p,-4.2,11.6).ok,true);
  assert.equal(p.x,-4.2);
  assert.equal(pool.orderPoolDrink().ok,true);
  assert.ok(pool.lastDrink);
  assert.equal(pool.cyclePoolLight().mode,'sunset');
});

