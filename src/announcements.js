import {RecordedVoice,RecordedUtterance} from './recorded-voice.js';
const ORDINALS=['First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth'];
export function floorPhrase(index){
 if(!Number.isInteger(index)||index<0||index>14)throw new RangeError('Invalid floor');
 const basement=index<5,n=basement?5-index:index-4;
 return [basement?`지하 ${n}층입니다.`:`${n}층입니다.`,`${ORDINALS[n-1]}${basement?' basement':''} floor.`];
}
const pair=(ko,en)=>[{text:ko,lang:'ko-KR'},{text:en,lang:'en-US'}];
export class HotelAnnouncements {
 constructor({synth=new RecordedVoice(),Utterance=RecordedUtterance,onCaption=()=>{},onStatus=()=>{},onChime=()=>{},gap=120}={}){
  Object.assign(this,{synth,Utterance,onCaption,onStatus,onChime,gap});this.enabled=false;this.volume=.65;this.active=null;this.generation=0;this.timers=new Set();
 }
 snapshot(c){return {state:c.state,stops:c.stops.length,time:c.time,paused:c.paused};}
 tune(c){c.doorCloseSeconds=this.enabled?5:1.7;c.doorDwellSeconds=this.enabled?9:3;}
 setEnabled(on,c){this.clear();this.enabled=on;this.tune(c);this.previous=this.snapshot(c);
  if(on){this.onStatus('AI로 제작한 고정 안내 음성입니다.');if(c.state==='open')c.dwell=Math.max(c.dwell,9);this.announce('welcome',pair('환영합니다.','Welcome aboard.'));}
 }
 reset(c){this.clear();this.tune(c);this.previous=this.snapshot(c);}
 clear(){this.generation++;for(const timer of this.timers)clearTimeout(timer);this.timers.clear();this.active=null;try{this.synth?.cancel();}catch{}}
 later(fn,ms){const t=setTimeout(()=>{this.timers.delete(t);fn();},ms);this.timers.add(t);t.unref?.();return t;}
 announce(kind,parts){
  if(!this.enabled)return;
  // Only the current action is spoken; an arrival or reopening replaces obsolete speech.
  this.clear();const token=this.generation;this.active={kind,parts,index:0};
  this.onCaption({ko:parts.filter(p=>p.lang==='ko-KR').map(p=>p.text).join(' '),en:parts.filter(p=>p.lang==='en-US').map(p=>p.text).join(' ')});
  if(!this.synth||!this.Utterance){this.active=null;this.onStatus('음성 파일을 재생할 수 없어 자막으로 안내합니다.');return;}
  if(kind==='arrival'){this.onChime();this.later(()=>this.speakNext(token),this.gap?450:0);}else this.speakNext(token);
 }
 speakNext(token){
  if(token!==this.generation||!this.enabled||!this.active)return;
  const part=this.active.parts[this.active.index++];if(!part){this.active=null;return;}
  const u=new this.Utterance(part.text);u.lang=part.lang;u.volume=this.volume;
  this.active.utterance=u;let finished=false;
  const done=error=>{if(finished||token!==this.generation)return;finished=true;clearTimeout(watchdog);this.timers.delete(watchdog);
   if(error)this.onStatus('음성을 재생할 수 없으면 안내 자막을 확인해 주세요.');
   this.later(()=>this.speakNext(token),this.gap);
  };
  u.onend=()=>done(false);u.onerror=()=>done(true);
  const watchdog=this.later(()=>{if(token!==this.generation)return;try{this.synth.cancel();}catch{}done(true);},10000);
  try{this.synth.speak(u);}catch{done(true);}
 }
 observe(c){
  const old=this.previous;this.previous=this.snapshot(c);
  if(!old)return;
  if(c.time<old.time){this.reset(c);return;}
  if(!this.enabled)return;
  if(c.paused){if(!old.paused)this.clear();return;}
  if(c.state==='open'&&old.state!=='open')c.dwell=Math.max(c.dwell,9);
  if(c.stops.length>old.stops){const floor=floorPhrase(c.floor);this.announce('arrival',[...pair(...floor),...pair('문이 열립니다.','The door is opening.')]);}
  else if(c.state!==old.state){
   if(c.state==='opening')this.announce('opening',old.state==='closing'?pair('문이 다시 열립니다. 출입문에서 물러나 주세요.','The door is reopening. Please stand clear.'):pair('문이 열립니다.','The door is opening.'));
   if(c.state==='closing')this.announce('closing',pair('문이 닫힙니다.','The door is closing.'));
   if(c.state==='moving')this.announce('direction',c.direction===1?pair('올라갑니다.','Going up.'):pair('내려갑니다.','Going down.'));
  }
 }
}
