export const ROOM={floor:7,number:'301',doorX:-1.38,entry:[-1.75,-1.01],bounds:[-2.28,2.28,4.05,13.65]};
const within=(v,a,b)=>v>=a-1e-7&&v<=b+1e-7;
export class GuestRoom {
 constructor(stay){this.stay=stay;this.obstacles=[];this.reset();}
 reset(){this.open=0;this.target=0;}
 addObstacle(minX,maxX,minZ,maxZ){this.obstacles.push({minX,maxX,minZ,maxZ});}
 inGateway(x,z){return within(x,...ROOM.entry)&&within(z,3.42,4.13);}
 inside(x,z){return within(x,ROOM.bounds[0],ROOM.bounds[1])&&within(z,ROOM.bounds[2],ROOM.bounds[3]);}
 contains(x,z,floor){return floor===ROOM.floor&&(this.inGateway(x,z)||this.inside(x,z));}
 occupied(p){return p?.floor===ROOM.floor&&within(p.x,-2.05,-.60)&&within(p.z,3.25,4.75);}
 toggle(p){if(this.target&&this.occupied(p))return {ok:false,message:'문에서 조금 떨어진 뒤 닫아 주세요.'};if(!this.target&&p?.zone!=='room'&&!this.stay.canAccess(ROOM.number))return {ok:false,message:'301호 키카드가 필요합니다. 1층 리셉션에서 체크인해 주세요.'};this.target=this.target?0:1;return {ok:true,message:this.target?'301호 문을 엽니다. WASD로 들어가세요.':'301호 문을 닫고 잠급니다.'};}
 update(dt,p){if(!this.target&&this.open>0&&this.occupied(p))this.target=1;const d=Math.min(Math.max(dt,0),.1)/.8;this.open=this.target?Math.min(1,this.open+d):Math.max(0,this.open-d);}
 canOccupy(x,z,p,c){if(!this.contains(x,z,p.floor)||Math.abs(p.groundY(c)-7)>.04)return false;if(this.inGateway(x,z)&&this.open<.95)return false;if(p.zone!=='room'&&!(this.inGateway(p.x,p.z)||this.inGateway(x,z)))return false;if(this.open>=.95&&within(x,-2.08,-1.72)&&within(z,3.55,4.69))return false;if(this.obstacles.some(o=>within(x,o.minX-.17,o.maxX+.17)&&within(z,o.minZ-.17,o.maxZ+.17)))return false;return true;}
 canExit(x,z,p){return within(x,...ROOM.entry)&&within(z,1.4,3.42)&&p.z<=3.6;}
}
