export class EmergencyAlarm {
 constructor(createContext=()=>new AudioContext()){this.createContext=createContext;this.context=null;this.nodes=[];}
 setEnabled(enabled){this.stop();if(!enabled)return;try{this.context??=this.createContext();this.context.resume().catch(()=>{});const c=this.context,t=c.currentTime,osc=c.createOscillator(),gain=c.createGain(),pulse=c.createOscillator(),depth=c.createGain();osc.type='sine';osc.frequency.value=880;pulse.type='sine';pulse.frequency.value=2;depth.gain.value=.08;gain.gain.value=.09;pulse.connect(depth);depth.connect(gain.gain);osc.connect(gain);gain.connect(c.destination);osc.start(t);pulse.start(t);this.nodes=[osc,pulse,depth,gain];}catch{this.stop();}}
 stop(){for(const n of this.nodes){try{n.stop?.();}catch{}n.disconnect();}this.nodes=[];}
}
