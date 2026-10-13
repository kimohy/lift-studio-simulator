import {batchStaticMeshes} from './render-optimization.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {GuestRoomView} from './guest-room-view.js';
import {EscalatorView} from './escalator-view.js';
import {HotelScene} from './hotel-scene.js';
import {floorUsage} from './building.js';
import {decorateFloor} from './floor-interiors.js';
import {StairwellView} from './stairwell-view.js';
import { FLOORS } from './controller.js';
export class LiftScene {
  constructor(canvas,onAction){
    this.canvas=canvas;this.onAction=onAction;this.view='lobby';this.ready=false;this.followY=0;this.lastFloor=-1;
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(44,1,.03,250);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.renderer.setClearColor(0x111b23,0);
    this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.075;this.controls.maxDistance=100;this.controls.minDistance=.4;this.controls.maxPolarAngle=Math.PI*.94;
    const pmrem=new THREE.PMREMGenerator(this.renderer);const env=new RoomEnvironment();this.scene.environment=pmrem.fromScene(env,.04).texture;env.dispose();pmrem.dispose();
    this.scene.environmentIntensity=1.2;
    this.scene.add(new THREE.HemisphereLight(0xe1efff,0x3a4144,1.4));
    const key=new THREE.DirectionalLight(0xffedcc,2);key.position.set(4,10,7);this.scene.add(key);
    const fill=new THREE.DirectionalLight(0xb4dbff,1);fill.position.set(-5,3,-5);this.scene.add(fill);
    this.cabinLight=new THREE.PointLight(0xffe8c5,16,5,2);this.cabinLight.position.set(0,2,0);this.scene.add(this.cabinLight);
    this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.pickables=[];this.landings=[];this.doors=[];this.parts=[];this.ropes=[];
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);this.resize();
    let down;canvas.addEventListener('pointerdown',e=>{if(e.button===0)down=[e.clientX,e.clientY];});
    canvas.addEventListener('pointerup',e=>{
      if(e.button!==0||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5||!this.ready)return;
      down=null;const r=canvas.getBoundingClientRect();
      const point=document.pointerLockElement===canvas?{x:0,y:0}:{x:(e.clientX-r.left)/r.width*2-1,y:-(e.clientY-r.top)/r.height*2+1};
      const hit=this.getInteraction(point,this.game?.active?1.8:Infinity);
      if(hit)this.onAction(hit.userData.action,hit.userData.floorIndex,hit.userData.direction,hit.userData);
    });
    this.setView('lobby');
  }
  isVisible(o){while(o){if(!o.visible)return false;o=o.parent;}return true;}
  resize(){const r=this.canvas.parentElement.getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.25,Math.sqrt(2100000/(r.width*r.height))));this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();}
  async load(){
    const gltf=await new GLTFLoader().loadAsync('./assets/elevator.glb',e=>{if(e.total)document.querySelector('#loading-detail').textContent=`모델 연결 ${Math.round(e.loaded/e.total*100)}%`;});
    this.model=gltf.scene;this.scene.add(this.model);
    this.model.traverse(o=>{
      const d=o.userData;const role=d.simRole;
      if(role==='carRoot')this.car=o;
      if(role==='weightRoot')this.weight=o;
      if(role==='controllerRoot')this.cabinet=o;
      if(role==='carDoor'||role==='landingDoor')this.doors.push(o);
      const staticLandingDisplay=/^Landing[ _]display[ _]/.test(o.name);
      if((role==='landing'||role==='landingDoor')&&!staticLandingDisplay)this.landings.push(o);
      if(staticLandingDisplay)o.visible=false;
      if(role==='shaft'||role==='mechanism')this.parts.push(o);
      if(role==='staticDisplay'||role==='controllerStaticText'||role==='controllerDisplay')o.visible=false;
      if(d.action)this.pickables.push(o);
      if(o.name.startsWith('Car_suspension_rope')||o.name.startsWith('Weight_suspension_rope'))this.ropes.push({o,baseScale:o.scale.clone(),basePos:o.position.clone(),car:o.name.startsWith('Car_')});
      if(o.isMesh){
        o.castShadow=false;o.receiveShadow=false;
        const materials=Array.isArray(o.material)?o.material:[o.material];
        for(const m of materials){if(m.isMeshStandardMaterial){m.envMapIntensity=1.1;if(m.name.includes('Rear mirror')){m.roughness=.12;}if(m.emissiveIntensity>1)m.emissiveIntensity=1.1;}}
      }
    });
    if(!this.car||!this.cabinet||this.doors.length!==32)throw new Error('필수 모델 구성이 누락되었습니다.');
    this.carBase=this.car.position.clone();this.weightBase=this.weight.position.clone();
    this.makeDisplay();this.makeGameRoom();
    for(const s of this.hotelScene?.staff??[])s.root.userData.dynamic=true;
    for(const d of this.stairwellView?.doors??[])d.userData.dynamic=true;
    if(this.guestRoomView)this.guestRoomView.door.userData.dynamic=true;
    for(const root of [...(this.hotelScene?.floors??[]),this.hotelScene?.exterior,...(this.gameRoom?.children??[]),...(this.stairwellView?.root.children??[]),...(this.escalatorView?.root.children??[])])if(root)batchStaticMeshes(root);
    this.ready=true;this.applyVisibility();
    document.querySelector('#loading').hidden=true;document.querySelector('#loading').style.display='none';
  }
  getInteraction(ndc,maxDistance=Infinity){
    if(!this.ready)return null;
    this.scene.updateMatrixWorld();this.camera.updateMatrixWorld();
    const candidates=this.pickables.filter(o=>this.isVisible(o)&&(!this.game?.active||this.game.accepts(o.userData)));
    this.ray.setFromCamera(ndc,this.camera);this.ray.far=maxDistance;
    const actionable=this.ray.intersectObjects(candidates,true);
    if(!actionable.length)return null;
    // Skip hidden floors before raycasting; hover should not scan the entire building.
    const meshes=[];for(const root of [this.model,this.gameRoom,this.guestRoomView?.root,this.stairwellView?.root,this.escalatorView?.root,this.hotelScene?.root,this.hotelScene?.exterior])root?.traverseVisible(o=>{if(o.isMesh)meshes.push(o);});
    const surfaces=this.ray.intersectObjects(meshes,false);
    const first=surfaces.find(h=>this.isVisible(h.object));if(!first)return null;
    const hit=actionable.find(h=>this.isVisible(h.object)&&h.distance<=first.distance+.02&&(!this.game?.active||this.game.accepts(h.object.userData)));
    return hit?.object??null;
  }
  makeGameRoom(){
    const room=new THREE.Group();room.name='Walkable_lobby';
    this.gameRoom=new THREE.Group();this.gameRoom.name='Fixed_floor_lobbies';this.scene.add(this.gameRoom);
    const wall=new THREE.MeshStandardMaterial({color:0x344951,roughness:.85});
    const ceiling=new THREE.MeshStandardMaterial({color:0xa7b1b3,roughness:.8});
    const box=(size,pos,material)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.position.set(...pos);room.add(m);return m;};
    box([.12,3.2,.77],[-2.54,1.6,1.415],wall);box([.12,3.2,.83],[-2.54,1.6,3.315],wall);box([.12,.9,1.1],[-2.54,2.75,2.35],wall);
    box([.12,3.2,.77],[2.54,1.6,1.415],wall);
    box([.12,3.2,.83],[2.54,1.6,3.315],wall);
    box([.12,.9,1.1],[2.54,2.75,2.35],wall);
    box([5.2,3.2,.12],[0,1.6,3.68],wall).name='Vestibule_back_wall';box([5.2,.12,2.7],[0,3.16,2.38],ceiling);
    box([1.3,.025,.32],[0,3.087,2.3],new THREE.MeshBasicMaterial({color:0xffefd9}));
    // Fixed geometry at each landing, sharing meshes/materials. No travelling room or light.
    const wallColors={parking:0x89918e,lobby:0xc2b69d,guest:0x8a8172};
    const wallMaterials=Object.fromEntries(Object.entries(wallColors).map(([kind,color])=>[kind,new THREE.MeshStandardMaterial({color,roughness:.85})]));
    for(let floor=0;floor<FLOORS.length;floor++){
      const lobby=room.clone();lobby.position.y=(floor-5)*3.5;lobby.userData.floorIndex=floor;
      lobby.traverse(o=>{if(o.isMesh&&o.material===wall)o.material=wallMaterials[floorUsage(floor).kind];});
      const expanded=!!this.game?.world&&floor<=5;
      if(floor===7){const back=lobby.getObjectByName('Vestibule_back_wall');lobby.remove(back);for(const [x,width] of [[-2.255,.69],[.875,3.45]]){const m=new THREE.Mesh(new THREE.BoxGeometry(width,3.2,.12),wallMaterials.guest);m.position.set(x,1.6,3.68);lobby.add(m);}const header=new THREE.Mesh(new THREE.BoxGeometry(1.06,1.0,.12),wallMaterials.guest);header.position.set(-1.38,2.7,3.68);lobby.add(header);}
      if(expanded){const back=lobby.getObjectByName('Vestibule_back_wall');lobby.remove(back);}
      decorateFloor(lobby,floor,{expanded});this.gameRoom.add(lobby);
    }
    this.gameRoom.visible=false;
    if(this.game?.room)this.guestRoomView=new GuestRoomView(this.scene,this.game.room,this.pickables);
    if(this.game?.escalators)this.escalatorView=new EscalatorView(this.scene);
    if(this.game?.world)this.hotelScene=new HotelScene(this.scene,this.game.world,this.pickables);
    if(this.game?.stairs)this.stairwellView=new StairwellView(this.scene,this.game.stairs,this.pickables);
  }
  makeDisplay(){
    this.lcd=document.createElement('canvas');this.lcd.width=768;this.lcd.height=180;this.lcdctx=this.lcd.getContext('2d');this.lcdtex=new THREE.CanvasTexture(this.lcd);this.lcdtex.colorSpace=THREE.SRGBColorSpace;
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(.64,.15),new THREE.MeshBasicMaterial({map:this.lcdtex}));screen.position.set(0,.94,.074);this.cabinet.add(screen);
    this.floorCanvas=document.createElement('canvas');this.floorCanvas.width=512;this.floorCanvas.height=128;this.floorCtx=this.floorCanvas.getContext('2d');this.floorTex=new THREE.CanvasTexture(this.floorCanvas);this.floorTex.colorSpace=THREE.SRGBColorSpace;
    const floorScreen=new THREE.Mesh(new THREE.PlaneGeometry(.39,.10),new THREE.MeshBasicMaterial({map:this.floorTex}));floorScreen.position.set(0,2.27,.771);floorScreen.rotation.y=Math.PI;this.car.add(floorScreen);
    // Every landing shows the same live car position and travel direction.
    const landingMaterial=new THREE.MeshBasicMaterial({map:this.floorTex});
    for(const indicator of [...this.landings]){
      if(!/^Landing[ _]indicator[ _]/.test(indicator.name))continue;
      const display=new THREE.Mesh(new THREE.PlaneGeometry(.39,.10),landingMaterial);
      display.name=`Live_landing_display_${indicator.userData.floorIndex}`;
      display.userData={simRole:'landing',floorIndex:indicator.userData.floorIndex};
      display.position.copy(indicator.position);display.position.z+=.023;
      indicator.parent.add(display);this.landings.push(display);
    }
  }
  setView(view,c){
    this.view=view;const y=c?c.position-17.5:0;this.followY=y;
    this.controls.enabled=view!=='game';
    if(view==='game'){this.camera.fov=74;this.camera.updateProjectionMatrix();if(this.ready)this.applyVisibility(c);return;}
    this.camera.fov=view==='cabin'?78:44;this.camera.updateProjectionMatrix();
    this.controls.minDistance=view==='cabin'?.12:.4;this.controls.maxDistance=(view==='shaft'||view==='exterior')?110:15;
    const presets={exterior:{p:[44,24,64],t:[3,15,16]},lobby:{p:[3.1,2.7,6.8],t:[0,1.18,.5]},cabin:{p:[-.52,1.62,-.62],t:[.26,1.30,.79]},shaft:{p:[38,19,68],t:[0,8.5,0]},controller:{p:[5.2,1.8,3.4],t:[3.46,.97,0]}};
    const v=presets[view];this.camera.position.fromArray(v.p);this.controls.target.fromArray(v.t);
    if(view==='lobby'||view==='cabin'){this.camera.position.y+=y;this.controls.target.y+=y;}
    this.controls.update();if(this.ready)this.applyVisibility(c);
  }
  applyVisibility(c){
    if(!this.ready)return;
    const floor=this.game?.active?this.game.player.floor:(c?.floor??5);const v=this.view;
    this.guestRoomView?.updateVisibility(floor,v==='game');
    this.escalatorView?.updateVisibility(floor,v==='game');
    this.stairwellView?.updateVisibility(floor,v==='game');
    this.hotelScene?.updateVisibility(floor,v==='game',v==='exterior');
    this.scene.background=(v==='exterior'||(v==='game'&&floor===5))?new THREE.Color(0xb7cbd6):null;
    this.scene.fog=v==='exterior'?new THREE.Fog(0xb7cbd6,90,190):null;
    if(this.gameRoom){this.gameRoom.visible=v==='game';for(const room of this.gameRoom.children)room.visible=Math.abs(room.userData.floorIndex-floor)<=1;}
    this.car.visible=v!=='controller';this.cabinet.visible=v==='controller';this.weight.visible=v==='shaft';
    for(const o of this.parts){let underCar=false;for(let p=o.parent;p;p=p.parent)if(p===this.car)underCar=true;o.visible=underCar?(v!=='controller'):(v==='shaft');}
    for(const o of this.landings)o.visible=v==='shaft'||((v==='lobby'||v==='game')&&Math.abs(o.userData.floorIndex-floor)<=1);
    // The full shaft view removes solid facade panels so cabin travel is inspectable.
    if(v==='shaft')for(const o of this.landings){if(/Landing_wall|Landing_header/.test(o.name))o.visible=false;}
    this.lastFloor=floor;
  }
  update(c){
    if(!this.ready)return;
    const visibleFloor=this.game?.active?this.game.player.floor:c.floor;
    if(visibleFloor!==this.lastFloor)this.applyVisibility(c);
    this.guestRoomView?.update();
    this.escalatorView?.update(c.time,c.paused);
    this.stairwellView?.update();this.hotelScene?.update(c.time,this.game?.player);
    const y=c.position-17.5;this.car.position.y=this.carBase.y+y;this.weight.position.y=this.weightBase.y-y;
    this.cabinLight.position.y=y+2.1;
    for(const o of this.doors){const open=o.userData.simRole==='carDoor'||(o.userData.floorIndex===c.floor&&c.aligned())?c.door:0;o.position.x=o.userData.side*(.228+.46*open);}
    for(const r of this.ropes){const len=r.car?32.05-y:19.15+y;const bottom=r.car?2.85+y:15.75-y;r.o.position.y=(34.9+bottom)/2;r.o.scale.y=r.baseScale.y*len/(r.car?32.05:19.15);}
    if(this.view==='lobby'||this.view==='cabin'){const d=y-this.followY;this.camera.position.y+=d;this.controls.target.y+=d;this.followY=y;}
    const displayKey=`${c.floor}/${c.state}/${c.direction}/${c.alarm}/${Math.round(c.velocity*10)}`;
    if(displayKey!==this.displayKey){
      this.displayKey=displayKey;const ctx=this.lcdctx;ctx.fillStyle='#071f19';ctx.fillRect(0,0,768,180);ctx.fillStyle=c.alarm?'#ff9d81':'#aaffdc';ctx.font='bold 64px monospace';ctx.textAlign='left';ctx.fillText(`${FLOORS[c.floor]}F  ${c.alarm?'ALARM':c.state.toUpperCase()}`,24,76);ctx.font='34px monospace';ctx.fillStyle='#7fae9c';ctx.fillText(`V ${Math.abs(c.velocity).toFixed(2)} m/s   ${c.door===0?'LOCKED':'DOOR OPEN'}`,24,141);this.lcdtex.needsUpdate=true;
      const f=this.floorCtx;f.fillStyle='#081816';f.fillRect(0,0,512,128);f.fillStyle='#baf5e0';f.font='80px monospace';f.textAlign='center';f.fillText(`${FLOORS[c.floor]}  ${c.direction===1?'↑':c.direction===-1?'↓':'–'}`,256,93);this.floorTex.needsUpdate=true;
    }
    for(const o of this.pickables){
      const action=o.userData.action;if(!o.isMesh||!['car','hall','alarm'].includes(action))continue;
      if(!o.userData.ownMaterial){o.material=o.material.clone();o.userData.ownMaterial=true;}
      const selected=action==='car'?c.car.has(o.userData.floorIndex):action==='hall'?(o.userData.direction===1?c.up:c.down).has(o.userData.floorIndex):c.alarm;
      o.material.color.setHex(action==='car'?(selected?0xe6b36b:0x8e9aa3):action==='hall'?0x243440:0xa83025);
      o.material.emissive.setHex(selected?(action==='hall'?0x76cfbf:0xffb04d):0x000000);o.material.emissiveIntensity=selected?.45:0;
    }
  }
  render(){if(this.controls.enabled)this.controls.update();this.renderer.render(this.scene,this.camera);}
}
