import {useEffect,useRef,useState} from 'react';
import {motion} from 'framer-motion';

// ---------------------------------------------------------------------------------------------
// "What's new" pop-up. To announce something new: add a NEW entry at the TOP with a higher `v`.
// Everyone who has not seen that version (and everyone, once, on their next open) gets the pop-up.
// An item marked  host:true  is only shown to the host.
// ---------------------------------------------------------------------------------------------
export const UPDATES=[
 {v:4,date:'Oct 22, 2026',title:'Presets and Wi-Fi checks',sections:[
  {h:'Fixes',items:[['💾','Saving a time in / out preset works again, and every preset now has a Delete button under “Your presets”.']]},
  {h:'Dorm Wi-Fi',items:[['🔎','Settings → Dorm Wi-Fi now shows the last signal from your phone and has a “Check my connection” button that tells you what the server sees and why nothing changed.']]}]},
 {v:3,date:'Oct 21, 2026',title:'Fixes now stay in the past',sections:[
  {h:'Fixes',items:[
   ['🔒','Fixes only cover times older than 24 hours. You can no longer fix today or the last 24 hours, so a fix can never change your current time.'],
   ['📅','Days inside the last 24 hours are locked (greyed out) in the Fixes calendar. A time unlocks 24 hours after it happened.'],
   ['⚡','The Quick fix was removed. Forgot to time out just now? Use the normal Time out button.'],
   ['👥','This applies to everyone, including the host and the host\'s suggestions.']]}]},
 {v:2,date:'Oct 20, 2026',title:'Updates screen',sections:[
  {h:'Updates',items:[['✨','This pop-up appears whenever something new is added. Open it again any time from Settings → Help.']]}]},
 {v:1,date:'Oct 2026',title:'Everything that arrived recently',sections:[
  {h:'Time in & proof',items:[
   ['📸','New in-app camera with a flash button. The front camera is mirrored like a selfie.'],
   ['💬','Add a short note when you time in or out, and comment on anyone\'s entry. Notices and comments only show in the cycle they were posted in.'],
   ['📍','“Send my location” is still there as a proof option.']]},
  {h:'Dorm Wi-Fi',items:[
   ['📶','Connect to the dorm Wi-Fi and you are timed in automatically. Set it up once under Settings → Dorm Wi-Fi.'],
   ['📴','Disconnect and you get a reminder to time out. You are never timed out automatically.'],
   ['🔔','The host sees a list of members who left the Wi-Fi but are still timed in, and can time them out or remind them.',true]]},
  {h:'Fixes',items:[
   ['🎚','Easier two-handle slider, with presets you can save and apply in one tap.'],
   ['🧩','Several time in / out blocks in one request, with no overlapping times. Replace a session and add new times in one request.'],
   ['🔍','Hosts can counter-check punches and suggest a correction. The member must accept it.']]},
  {h:'Bills',items:[
   ['📝','The host saves a private draft, checks it, then sends it to everyone.'],
   ['📅','No hours for a past period? The host can split by days in the dorm.'],
   ['⏳','Days left are counted from today\'s date in Manila. Changing the default deadline updates your bills and notifies everyone.']]},
  {h:'App',items:[
   ['🔔','Reminders save automatically and you get a confirmation notification.'],
   ['🌗','Light mode, plus a How-To guide you can replay in Settings → Help.'],
   ['🗓️','New spaces ask the host to set the billing cycle. The app has a new icon and is now called DormMate.'],
   ['☑️','Hosts can select, clear and delete notices, announcements and comments in bulk.',true]]}]}
];
export const LATEST=Math.max(...UPDATES.map(x=>x.v));

export default function Updates({list,owner,review,onClose}){
 const box=useRef(),[end,setEnd]=useState(false);
 const check=()=>{const el=box.current;if(el&&el.scrollTop+el.clientHeight>=el.scrollHeight-14)setEnd(true)};
 useEffect(()=>{const t=setTimeout(check,120);return()=>clearTimeout(t)},[]);
 return <div className="scrim" style={{zIndex:66,alignItems:'center',padding:16}}>
  <motion.div className="card" style={{width:'100%',maxWidth:460,margin:0,maxHeight:'86vh',display:'flex',flexDirection:'column'}} initial={{scale:.92,opacity:0}} animate={{scale:1,opacity:1}}>
   <div style={{fontSize:30}}>✨</div><h3 style={{fontSize:21,margin:'2px 0 4px'}}>What's new in DormMate</h3>
   <p className="mut" style={{marginBottom:10,fontSize:13}}>{review||end?'Tap Got it when you are done.':'Scroll down to read everything, then tap Got it.'}</p>
   <div ref={box} onScroll={check} style={{overflow:'auto',flex:1,margin:'0 -6px',padding:'0 6px'}}>
    {list.map(u=><div key={u.v} style={{marginBottom:16}}>
     <div className="row sp" style={{marginBottom:6}}><b style={{fontSize:16}}>{u.title}</b><span className="mut" style={{fontSize:12}}>{u.date}</span></div>
     {u.sections.map(s=>{const it=s.items.filter(x=>!x[2]||owner);return it.length?<div key={s.h} style={{marginBottom:10}}>
      <div className="tag t-pending" style={{display:'inline-block',marginBottom:6}}>{s.h}</div>
      {it.map(([ic,t],k)=><div key={k} className="row" style={{gap:10,alignItems:'flex-start',padding:'5px 0'}}><span style={{fontSize:18,width:24,textAlign:'center'}}>{ic}</span><span style={{flex:1,fontSize:14}}>{t}</span></div>)}</div>:null})}
    </div>)}
   </div>
   <button className="pri w" style={{marginTop:12}} disabled={!review&&!end} onClick={onClose}>{review||end?'Got it':'Scroll to the bottom to continue ↓'}</button>
  </motion.div></div>}
