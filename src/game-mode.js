import {GuestRoom} from './guest-room.js';
import {HotelStay} from './hotel-stay.js';
import {Escalators} from './escalator.js';
import {HotelWorld} from './hotel-world.js';
import {floorUsage} from './building.js';
import {Stairwell} from './stairs.js';
import {WalkingPlayer} from './player.js';
import {FLOORS} from './controller.js';
const $=id=>document.getElementById(id);
export class GameMode {
  constructor(view,controller){
    this.view=view;this.controller=controller;view.game=this;
    this.stay=new HotelStay();this.room=new GuestRoom(this.stay);this.stairs=new Stairwell();this.world=new HotelWorld();this.escalators=new Escalators();this.player=new WalkingPlayer(this.stairs,this.world,this.escalators,this.room);this.startInLobby();this.active=false;this.keys=new Set();this.dragging=false;this.hoverTime=0;this.cursor={x:0,y:0};this.previousView='lobby';
    $('viewport').append($('keycard-dialog'));
    const canvas=view.canvas;
    canvas.tabIndex=0;
    window.addEventListener('keydown',e=>{
      if(!this.active||e.target.closest?.('input,select,textarea,[contenteditable="true"],dialog'))return;
      if(e.code==='Escape'&&document.body.classList.contains('game-fullscreen')){this.leaveFullscreen();return;}
      if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('blur',()=>this.clearInput());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clearInput();});
    document.addEventListener('pointerlockchange',()=>{this.clearInput();document.body.classList.toggle('pointer-locked',document.pointerLockElement===canvas);$('game-lock').textContent=document.pointerLockElement===canvas?'마우스 해제 (Esc)':'마우스 고정';});
    canvas.addEventListener('contextmenu',e=>{if(this.active)e.preventDefault();});
    canvas.addEventListener('pointerdown',e=>{
      if(!this.active)return;canvas.focus({preventScroll:true});
      if(e.button===2){this.dragging=true;canvas.setPointerCapture(e.pointerId);}
    });
    canvas.addEventListener('pointerup',e=>{if(e.button===2){this.dragging=false;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}});
    canvas.addEventListener('pointercancel',()=>this.clearInput());
    canvas.addEventListener('pointermove',e=>{
      if(!this.active)return;
      const rect=canvas.getBoundingClientRect();this.cursor={x:(e.clientX-rect.left)/rect.width*2-1,y:-(e.clientY-rect.top)/rect.height*2+1};
      if(this.dragging||document.pointerLockElement===canvas){this.player.look(e.movementX,e.movementY);this.applyCamera();}
    });
    canvas.addEventListener('wheel',e=>{if(this.active)e.preventDefault();},{passive:false});
    $('keycard-button').addEventListener('click',()=>{if(this.stay.keycard){this.clearInput();if(document.pointerLockElement)document.exitPointerLock();$('keycard-dialog').showModal();}});
    $('keycard-close').addEventListener('click',()=>$('keycard-dialog').close());
    $('game-toggle').addEventListener('click',()=>this.active?this.exit():this.enter());
    $('game-fullscreen').addEventListener('click',()=>this.toggleFullscreen());
    document.addEventListener('fullscreenchange',()=>this.syncFullscreen());
    $('game-exit').addEventListener('click',()=>this.exit());
    $('game-lock').addEventListener('click',()=>{
      if(document.pointerLockElement===canvas){document.exitPointerLock();return;}
      try{Promise.resolve(canvas.requestPointerLock()).catch(()=>this.message('마우스 오른쪽 버튼을 누른 채 움직이면 시점을 바꿀 수 있습니다.'));}catch{this.message('오른쪽 드래그로 시점을 바꿀 수 있습니다.');}
    });
  }
  isFullscreen(){return document.fullscreenElement===$('viewport')||document.body.classList.contains('game-fullscreen');}
  syncFullscreen(){
    const on=this.isFullscreen();
    $('game-fullscreen').textContent=on?'전체화면 해제':'전체화면';
    $('game-fullscreen').setAttribute('aria-pressed',String(on));
    this.clearInput();
    if(this.active)this.view.canvas.focus({preventScroll:true});
    requestAnimationFrame(()=>this.view.resize());
  }
  leaveFullscreen(){
    document.body.classList.remove('game-fullscreen');
    if(document.fullscreenElement===$('viewport'))document.exitFullscreen().catch(()=>{});
    this.syncFullscreen();
  }
  async toggleFullscreen(){
    if(!this.active||this.fullscreenPending)return;
    if(this.isFullscreen()){this.leaveFullscreen();return;}
    this.fullscreenPending=true;
    try{
      if(!$('viewport').requestFullscreen)throw new Error('Fullscreen unavailable');
      await $('viewport').requestFullscreen();
      if(!this.active)this.leaveFullscreen();
    }catch{
      if(this.active){document.body.classList.add('game-fullscreen');this.message('화면을 확장했습니다. Esc를 누르면 돌아갑니다.');}
    }finally{this.fullscreenPending=false;this.syncFullscreen();}
  }
  startInLobby(){Object.assign(this.player,{x:0,z:12,yaw:Math.PI,pitch:-.04});}
  clearInput(){this.keys.clear();this.dragging=false;}
  message(text){$('game-target').textContent=text;this.messageUntil=performance.now()+2200;}
  enter(){
    if(!this.view.ready)return;
    this.previousView=this.view.view==='game'?'lobby':this.view.view;this.active=true;this.clearInput();this.player.sync(this.controller);
    document.body.classList.add('game-active');$('game-hud').hidden=false;$('game-toggle').textContent='관찰 모드';$('game-toggle').setAttribute('aria-pressed','true');
    $('time-scale').value='1';$('time-scale').dispatchEvent(new Event('change'));$('time-scale').disabled=true;
    this.view.setView('game',this.controller);this.applyCamera();this.view.canvas.focus({preventScroll:true});this.view.resize();
    this.message('호텔에 오신 것을 환영합니다. WASD로 이동하고 직원·문·엘리베이터 버튼을 클릭하세요.');this.updateHUD();
  }
  exit(){
    if(!this.active)return;
    this.player.leaveDoorway();this.controller.setObstruction(false,'player');this.active=false;this.clearInput();this.leaveFullscreen();
    if(document.pointerLockElement===this.view.canvas)document.exitPointerLock();
    document.body.classList.remove('game-active','pointer-locked');$('game-hud').hidden=true;$('game-toggle').textContent='호텔 체험 시작';$('game-toggle').setAttribute('aria-pressed','false');$('time-scale').disabled=false;
    this.view.setView(this.previousView,this.controller);this.view.canvas.style.cursor='';this.view.resize();
  }
  reset(){
    this.room.reset();this.player.reset();this.startInLobby();this.stairs.reset();this.clearInput();this.controller.setObstruction(false,'player');
    if(document.pointerLockElement===this.view.canvas)document.exitPointerLock();
    if(this.active){this.view.setView('game',this.controller);this.applyCamera();this.updateHUD();}
  }
  beforeStep(){if(this.active){this.player.sync(this.controller);this.controller.setObstruction(this.player.blocksDoor(this.controller),'player');}}
  update(dt){
    if(!this.active)return;
    const forward=Number(this.keys.has('KeyW'))-Number(this.keys.has('KeyS'));
    const strafe=Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA'));
    if(!this.controller.paused)this.stairs.update(dt,this.player);
    if(!this.controller.paused)this.room.update(dt,this.player);
    this.escalators.carry(this.player,dt,this.controller);
    this.player.move(forward,strafe,dt,this.controller,this.keys.has('ShiftLeft')||this.keys.has('ShiftRight'));
    this.controller.setObstruction(this.player.blocksDoor(this.controller),'player');this.applyCamera();
    this.hoverTime+=dt;
    if(this.hoverTime>.10){this.hoverTime=0;this.updateHUD();}
  }
  applyCamera(){
    const p=this.player;this.view.camera.position.set(p.x,p.eyeY(this.controller),p.z);
    this.view.camera.rotation.order='YXZ';this.view.camera.rotation.set(p.pitch,p.yaw,0);this.view.camera.updateMatrixWorld();
  }
  accepts(data){
    if(!this.active)return true;
    if(data.action==='roomDoor')return this.player.floor===7&&['lobby','room'].includes(this.player.zone);
    if(data.action==='staff')return this.player.zone==='lobby'&&this.player.floor===5;
    if(data.action==='stairDoor')return this.player.zone!=='cabin'&&data.floorIndex===this.player.floor;
    if(data.action==='hall')return this.player.zone==='lobby'&&data.floorIndex===this.player.floor;
    return this.player.zone==='cabin';
  }
  talkToStaff(data){
    if(!this.active||this.player.floor!==5||!data?.staffId)return;
    const card=this.stay.checkIn(data.staffId);if(card){$('keycard-button').hidden=false;this.message('체크인되었습니다. 3층 301호 키카드를 받았습니다. Welcome to Grand Hotel.');}else this.message(data.dialogue);this.messageUntil=performance.now()+6500;this.view.hotelScene?.waveStaff(data.staffId,this.controller.time);
  }
  toggleRoomDoor(){if(!this.active||this.player.floor!==7)return;const result=this.room.toggle(this.player);this.message(result.message);}
  toggleStairDoor(floor){
    if(!this.active||floor!==this.player.floor||this.player.zone==='cabin')return;
    const ok=this.stairs.toggleDoor(floor,this.player);
    this.message(!ok?'출입문에서 조금 떨어진 뒤 닫아 주세요.':this.stairs.doors[floor].target?'계단실 문을 엽니다. WASD로 걸어서 이동하세요.':'계단실 문을 닫습니다.');
  }
  stairLocation(){
    const level=this.player.stairY/3.5+5,near=Math.round(level);
    if(Math.abs(level-near)<.025)return `${FLOORS[near]}층 · ${floorUsage(near).ko} · 계단실`;
    const lower=Math.floor(level);return `${FLOORS[lower]}층 ↔ ${FLOORS[lower+1]}층 · 계단`;
  }
  updateHUD(){
    const p=this.player,c=this.controller;
    $('player-location').textContent=p.zone==='cabin'?`엘리베이터 안 · ${FLOORS[c.floor]}층${c.state==='moving'?' 이동 중':''}`:p.zone==='room'?'3층 · 301호 객실':p.zone==='escalator'?`${FLOORS[p.floor]}층 · 에스컬레이터`:p.zone==='stairs'?this.stairLocation():`${FLOORS[p.floor]}층 · ${this.world.location(p)}`;
    $('game-lift-state').textContent=`엘리베이터 ${FLOORS[c.floor]}층 · ${c.state==='moving'?(c.direction>0?'올라가는 중':'내려가는 중'):c.door>0?'문 열림':'대기'}`;
    const ndc=document.pointerLockElement===this.view.canvas?{x:0,y:0}:this.cursor;
    const hit=this.view.getInteraction(ndc,1.8);
    this.view.canvas.style.cursor=hit?'pointer':this.dragging?'grabbing':'crosshair';
    $('game-crosshair').classList.toggle('targeted',!!hit);
    if(performance.now()<(this.messageUntil||0))return;
    let text;
    if(hit){const d=hit.userData;text=d.action==='roomDoor'?`301호 · ${this.room.target?'문 닫기':this.stay.canAccess('301')||p.zone==='room'?'문 열기':'키카드 필요'} · 클릭`:d.action==='staff'?`${d.staffName} · ${d.staffId.startsWith('reception-')?'클릭해 체크인':'클릭해 이야기하기'}`:d.action==='stairDoor'?`${FLOORS[d.floorIndex]}층 계단실 문 ${this.stairs.doors[d.floorIndex].target?'닫기':'열기'} · 왼쪽 클릭`:d.action==='hall'?`${FLOORS[d.floorIndex]}층 ${d.direction===1?'올라가기':'내려가기'} 호출 · 왼쪽 클릭`:d.action==='car'?`${FLOORS[d.floorIndex]}층 선택 · 왼쪽 클릭`:({'open':'문 열림','close':'문 닫힘','alarm':'비상 호출'}[d.action]+' · 왼쪽 클릭');}
    else if(p.zone==='ramp')text='차량용 경사로입니다. WASD로 주차장 층 사이를 이동할 수 있습니다.';
    else if(p.zone==='room')text='301호 객실입니다. 출입문을 클릭해 열고 복도로 나갈 수 있습니다.';
    else if(p.zone==='escalator')text='발판에 올라서면 자동 이동합니다. 출구에서 WASD로 복도로 이동하세요.';
    else if(p.zone==='stairs')text='WASD로 계단을 오르내리세요. 층별 표지를 따라 복도 문을 열 수 있습니다.';
    else if(p.inDoorway())text='출입문을 지나 안쪽이나 승강장으로 이동하세요.';
    else if(p.zone==='cabin')text=c.state==='moving'?'이동 중입니다. 도착해 문이 열리면 걸어서 내리세요.':'내부 층 버튼을 클릭해 목적층을 선택하세요.';
    else text='왼쪽 에스컬레이터 · 오른쪽 계단 · 뒤쪽 통로는 로비와 주차장입니다.';
    $('game-target').textContent=text;
  }
}
