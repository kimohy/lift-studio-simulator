import {VOICE_CLIPS} from './voice-catalog.js';
export class RecordedUtterance {constructor(text){this.text=text;this.lang='';this.volume=.65;}}
export class RecordedVoice {
 constructor({clips=VOICE_CLIPS,baseURL='./assets/voice/',AudioClass=globalThis.Audio}={}){
  this.index=new Map(clips.map(c=>[`${c.lang}\n${c.text}`,c.file]));this.baseURL=baseURL;this.AudioClass=AudioClass;this.current=null;this.token=0;
 }
 setVolume(value){if(this.current)this.current.volume=Math.max(0,Math.min(1,value));}
 getVoices(){return [];}
 cancel(){this.token++;if(this.current){this.current.onended=null;this.current.onerror=null;this.current.pause();this.current.removeAttribute('src');this.current.load();this.current=null;}}
 speak(utterance){
  this.cancel();const token=this.token,file=this.index.get(`${utterance.lang}\n${utterance.text}`);
  if(!file){queueMicrotask(()=>{if(token===this.token)utterance.onerror?.({error:'missing-recording'});});return;}
  const audio=new this.AudioClass(this.baseURL+file);this.current=audio;audio.preload='auto';audio.defaultPlaybackRate=1.2;audio.playbackRate=1.2;audio.preservesPitch=true;audio.volume=Math.max(0,Math.min(1,utterance.volume??.65));
  let settled=false;const finish=failed=>{if(settled||token!==this.token)return;settled=true;this.current=null;if(failed)utterance.onerror?.({error:'audio-playback'});else utterance.onend?.();};
  audio.onended=()=>finish(false);audio.onerror=()=>finish(true);
  try{Promise.resolve(audio.play()).catch(()=>finish(true));}catch{finish(true);}
 }
}
