import {hotelSignTexture} from './hotel-sign.js';
import * as THREE from 'three';
import {floorUsage} from './building.js';
import {FLOORS} from './controller.js';
const geometry=new THREE.BoxGeometry(1,1,1);
const materials={
 parking:new THREE.MeshStandardMaterial({color:0x747d7c,roughness:.95}),
 lobby:new THREE.MeshStandardMaterial({color:0xdfd9c9,roughness:.3}),
 guest:new THREE.MeshStandardMaterial({color:0x344a51,roughness:1}),
 wood:new THREE.MeshStandardMaterial({color:0x745341,roughness:.6}),
 gold:new THREE.MeshStandardMaterial({color:0xc7aa70,metalness:.6,roughness:.35}),
 yellow:new THREE.MeshBasicMaterial({color:0xe5c457}),
 black:new THREE.MeshStandardMaterial({color:0x28302d,roughness:.85}),
};
export function decorateFloor(room,floor,{expanded=false}={}){
 const usage=floorUsage(floor);room.userData.floorUsage=usage.ko;room.userData.floorKind=usage.kind;
 const box=(name,size,pos,mat)=>{const m=new THREE.Mesh(geometry,mat);m.name=name;m.scale.set(...size);m.position.set(...pos);room.add(m);return m;};
 const sign=(name,lines,pos,width,height,rotation=Math.PI)=>{
  const texture=hotelSignTexture(lines);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width*(name.startsWith('Room_number')?1:.65),height*(name.startsWith('Room_number')?1:.65)),new THREE.MeshBasicMaterial({map:texture}));m.name=name;m.userData.signLines=lines;m.position.set(...pos);m.rotation.y=rotation;room.add(m);
 };
 box(`Floor_finish_${FLOORS[floor]}`,[4.9,.018,2.23],[0,.008,2.485],materials[usage.kind]);
 sign(`Floor_purpose_sign_${FLOORS[floor]}`,[`${FLOORS[floor]} · ${usage.ko}`,usage.en],[0,2.67,3.607],1.8,.60);
 sign(`Floor_side_sign_${FLOORS[floor]}`,[usage.kind==='parking'?`P · ${FLOORS[floor]}`:usage.ko,usage.en],[-2.468,2.72,2.30],1.0,.48,Math.PI/2);
 if(expanded)return;
 if(usage.kind==='guest'){
  for(const [i,x] of [-1.38,1.38].entries()){
   const number=(floor-4)*100+i+1;if(number===301)continue;
   box(`Guest_room_door_${number}`,[.86,2.18,.06],[x,1.09,3.565],materials.wood);
   for(const side of [-1,1])box(`Room_frame_${number}_${side}`,[.045,2.25,.075],[x+side*.46,1.125,3.56],materials.gold);
   box(`Room_frame_top_${number}`,[.965,.045,.075],[x,2.25,3.56],materials.gold);
   box(`Room_handle_${number}`,[.14,.055,.07],[x+.26,1.02,3.5],materials.gold);
   sign(`Room_number_${number}`,[String(number),'ROOM'],[x,1.67,3.53],.34,.21);
  }
 }else if(usage.kind==='parking'){
  for(const x of [-1.56,1.56])box('Parking_bay_line',[.05,.007,1.75],[x,.023,2.47],materials.yellow);
  box('Parking_wall_stripe',[4.94,.09,.012],[0,.72,3.607],materials.yellow);
  box('Parking_side_stripe',[.012,.09,2.35],[-2.468,.72,2.37],materials.yellow);
  for(const x of [-1.85,1.85])box('Parking_wall_bumper',[.08,.76,.035],[x,.40,3.58],materials.black);
 }else{
  box('Lobby_reception_desk',[1.65,.92,.22],[0,.46,3.625],materials.wood);
  box('Lobby_reception_top',[1.74,.045,.26],[0,.935,3.625],materials.gold);
  sign('Lobby_reception_sign',['안내 데스크','RECEPTION'],[0,.60,3.50],.87,.23);
  for(const x of [-1.65,1.65])box('Lobby_floor_inlay',[.025,.006,2.10],[x,.021,2.47],materials.gold);
 }
}
