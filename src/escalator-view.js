import {hotelSignTexture} from './hotel-sign.js';import {escalatorLayout} from './escalator.js';
import * as THREE from 'three';import {FLOORS} from './controller.js';
export class EscalatorView {
 constructor(scene){this.root=new THREE.Group();this.root.name='Hotel_escalators';scene.add(this.root);this.flights=[];this.signs=[];const steel=new THREE.MeshStandardMaterial({color:0x879594,metalness:.8,roughness:.28}),black=new THREE.MeshStandardMaterial({color:0x1d272b,roughness:.6}),stone=new THREE.MeshStandardMaterial({color:0xbdb8a9,roughness:.8}),glass=new THREE.MeshStandardMaterial({color:0x99bcb6,transparent:true,opacity:.5,roughness:.2}),tread=new THREE.MeshStandardMaterial({color:0x647276,metalness:.7,roughness:.35}),yellow=new THREE.MeshBasicMaterial({color:0xe9cb72});const geo=new THREE.BoxGeometry(1,1,1);
 const box=(g,n,size,pos,m)=>{const o=new THREE.Mesh(geo,m);o.name=n;o.scale.set(...size);o.position.set(...pos);g.add(o);return o;};
 const sign=(g,lines,pos,rot)=>{const tex=hotelSignTexture(lines);const o=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.36),new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide}));o.name='Escalator_floor_sign';o.position.set(...pos);o.rotation.y=rot;g.add(o);this.signs.push(o);};
 for(let f=0;f<15;f++){const g=new THREE.Group();g.userData.floorIndex=f;g.position.y=(f-5)*3.5;this.root.add(g);
 box(g,'Entry_platform',[1.2,.14,5.8],[-3.4,-.07,4.3],stone);box(g,'Entry_bridge',[.52,.14,.7],[-2.54,-.07,2.35],stone);box(g,'Exit_platform',[.8,.14,5.8],[-10.4,-.07,4.3],stone);box(g,'Return_corridor',[6.8,.14,1.6],[-7.4,-.07,6.4],stone);
 box(g,'Escalator_back_wall',[8.6,3.56,.16],[-6.54,1.75,7.28],stone);box(g,'Escalator_front_wall',[8.6,3.56,.16],[-6.54,1.75,1.32],stone);box(g,'Escalator_outer_wall',[.16,3.56,6],[-10.88,1.75,4.3],stone);
 for(const [z,d] of [[1.625,.75],[5.025,4.65]])box(g,'Escalator_inner_wall',[.3,3.56,d],[-2.65,1.75,z],stone);
 box(g,'Escalator_door_lintel',[.3,1.1,.7],[-2.65,2.95,2.35],stone);
 if(f===0)box(g,'Escalator_shaft_bottom_cap',[8.4,.2,6.2],[-6.7,-.2,4.3],stone);
 if(f===14)box(g,'Escalator_shaft_top_cap',[8.4,.2,6.2],[-6.7,3.4,4.3],stone);
 sign(g,[`${FLOORS[f]}층 · 에스컬레이터`,'ESCALATORS  ·  ↑ UP / ↓ DOWN'],[-2.46,2.65,2.35],Math.PI/2);sign(g,[`${FLOORS[f]}층 · 복도 →`,'ELEVATOR & HOTEL →'],[-10.78,1.85,6.35],Math.PI/2);
 // Direction information belongs on the fixed landing walls, clear of the moving flights.
 for(const [x,rot,east] of [[-2.81,-Math.PI/2,true],[-10.78,Math.PI/2,false]]){
  const up=escalatorLayout(f),upLane=up.start===(east?-4:-10)?(up.upZ<3?'앞쪽 입구':'뒤쪽 입구'):'반대편 입구';
  const lower=f>0?escalatorLayout(f-1):null,downLane=lower?(lower.start===(east?-4:-10)?(lower.downZ<3?'앞쪽 입구':'뒤쪽 입구'):'반대편 입구'):null;
  const routes=[f<14?`↑ ${FLOORS[f+1]} · ${upLane}`:'최상층 · TOP FLOOR',f>0?`↓ ${FLOORS[f-1]} · ${downLane}`:'최하층 · LOWEST FLOOR'];
  sign(g,routes,[x,1.85,3.4],rot);
 }
 const floorLayout=escalatorLayout(f);for(const [z,direction] of [[floorLayout.upZ,1],[floorLayout.downZ,-1]]){const layout=direction===1?floorLayout:{start:floorLayout.end,end:floorLayout.start};if(f===14){box(g,'Top_terminal_barrier',[.12,.95,1.65],[layout.start,.5,z],steel);continue;}const slope=Math.sign(layout.start-layout.end)*Math.atan2(3.5,6),length=Math.hypot(3.5,6);
 const base=box(g,'Escalator_truss',[length,.24,1.6],[-7,1.60,z],steel);base.rotation.z=-slope;
 for(const side of [-.85,.85]){const bal=box(g,'Escalator_glass_balustrade',[length,.78,.08],[-7,2.15,z+side],glass);bal.rotation.z=-slope;const rail=box(g,'Escalator_handrail',[length,.10,.13],[-7,2.60,z+side],black);rail.rotation.z=-slope;}
 for(const x of [-4,-10])box(g,'Escalator_comb_plate',[.36,.035,1.48],[x,x===layout.start?.016:3.516,z],yellow);
 const stepMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.27,.17,1.4),tread,24),edgeMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.00675,.0102,1.4),yellow,24);
 stepMesh.name='Moving_escalator_steps';edgeMesh.name='Step_safety_edges';for(const mesh of [stepMesh,edgeMesh]){mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(-7,1.75,z),4.5);g.add(mesh);}
 this.flights.push({floor:f,z,direction,group:g,stepMesh,edgeMesh,layout});


 }
 }
 }
 update(time,paused){if(!paused)this.time=time;const matrix=this.stepMatrix??=new THREE.Matrix4();for(const flight of this.flights){if(!this.root.visible||!flight.group.visible)continue;for(let i=0;i<24;i++){const t=((i/24+(this.time||0)*.45/6*flight.direction)%1+1)%1,x=flight.layout.start+t*(flight.layout.end-flight.layout.start),y=t*3.5-.085;matrix.makeTranslation(x,y,flight.z);flight.stepMesh.setMatrixAt(i,matrix);matrix.makeTranslation(x+.1242,y+.0782,flight.z);flight.edgeMesh.setMatrixAt(i,matrix);}flight.stepMesh.instanceMatrix.needsUpdate=true;flight.edgeMesh.instanceMatrix.needsUpdate=true;}}

 updateVisibility(floor,active){this.root.visible=active;for(const g of this.root.children)g.visible=Math.abs(g.userData.floorIndex-floor)<=1;}
}
