import {useEffect,useState} from 'react';
import {motion} from 'framer-motion';

// Bump this number to make EVERYONE (new and existing users) see the guide once again.
export const TOUR_V=1;

const steps=owner=>[
 {tab:'home',ic:'👋',t:'Welcome to DormMates',b:'A quick tour of every page. Tap Next to move on, or Skip to jump to the end. It only takes about a minute.'},
 {tab:'home',sel:'[data-tour=punch]',ic:'⏱',t:'Time in / Time out',b:'This big button is how you punch. Tap it, add proof (a picture or your location) and your dormmates are notified. Your hours for the cycle count up above it.'},
 {tab:'home',sel:'[data-tour=board]',ic:'🏆',t:'Cycle leaderboard',b:'See who has logged the most hours this cycle. Use ‹ › at the top to look at earlier cycles.'},
 {tab:'dorm',sel:'[data-tour=dorm]',ic:'👥',t:"Who's home",b:'Live status of every dormmate: in or out, since when, and the proof they sent. Tap a picture to enlarge it.'},
 {tab:'dorm',sel:'[data-tour=notes]',ic:'📌',t:'Notice board',b:'Post a note for everyone. Everyone else gets a push notification.'},
 {tab:'history',sel:'[data-tour=hist]',ic:'🕘',t:'History',b:'The chart shows the AVERAGE hours per member for each day. Tap a name to see only that person. Tap a bar to see that day.'},
 {tab:'fixes',sel:'[data-tour=fixcal]',ic:'📝',t:'Fixes calendar',b:owner?'Tap a day to fix hours. Pick a member at the top to counter-check their punches, and suggest a correction. They must approve it.':'Forgot to time in or out? Tap a day and send a fix request. The default range is 12:00 AM to 11:59 PM, adjust it as needed.'},
 {tab:'fixes',sel:'[data-tour=fixreq]',ic:'📬',t:'Requests',b:owner?'Approve or deny requests here. Corrections you suggested show as “suggested” until the member accepts.':'Your requests show here. If the host suggests a correction to your hours, accept or decline it here.'},
 {tab:'bills',sel:'[data-tour=bills]',ic:'💡',t:'Bills',b:owner?'Enter the bills and tap Save draft. Only you can see the draft. Check the numbers, then tap “Send to dormmates”.':'Once the host sends the bills you will see your share and how it was computed. Receipts appear here too.'},
 {tab:'settings',sel:'[data-tour=alerts]',ic:'🔔',t:'Reminders & notifications',b:'Turn on notifications, set a time-in / time-out reminder, and you will get a confirmation right away. Tap “Send a test” to check it works.'},
 {tab:'settings',sel:'[data-tour=look]',ic:'🌗',t:'Light & dark mode',b:'Pick Light, Dark or System under Appearance. You can replay this guide any time from Settings → Help.'},
 {tab:'home',ic:'✅',t:'You are all set',b:'Please confirm so we do not show this guide again.',last:true}
];

export default function Tour({owner,setTab,onDone,onLater}){
 const S=steps(owner),[i,setI]=useState(0),[ack,setAck]=useState(false),[rect,setRect]=useState(null),st=S[i],last=i===S.length-1;
 useEffect(()=>{
  setRect(null);if(st.tab)setTab(st.tab);
  const measure=()=>{const el=st.sel&&document.querySelector(st.sel);if(!el){setRect(null);return}const b=el.getBoundingClientRect();setRect({x:b.left-6,y:b.top-6,w:b.width+12,h:b.height+12})};
  let n=0;const t=setInterval(()=>{n++;const el=st.sel&&document.querySelector(st.sel);
   if(el){clearInterval(t);el.scrollIntoView({block:'center',behavior:'smooth'});setTimeout(measure,420)}else if(n>25)clearInterval(t)},100);
  addEventListener('resize',measure);addEventListener('scroll',measure,true);
  return()=>{clearInterval(t);removeEventListener('resize',measure);removeEventListener('scroll',measure,true)}},[i]);
 const top=rect&&rect.y>innerHeight*.5;
 return <>
  <div className="tour-block"/>
  {rect?<div className="tour-hl" style={{left:rect.x,top:rect.y,width:rect.w,height:rect.h}}/>:<div className="tour-dim"/>}
  <motion.div key={i} className="tour-card" style={top?{top:'calc(12px + env(safe-area-inset-top))'}:{bottom:'calc(84px + env(safe-area-inset-bottom))'}} initial={{opacity:0,y:top?-16:16}} animate={{opacity:1,y:0}}>
   <div className="tour-dots">{S.map((_,k)=><i key={k} className={k<=i?'on':''}/>)}</div>
   <div className="tour-ic">{st.ic}</div><h3>{st.t}</h3><p className="mut" style={{fontSize:14,marginBottom:14}}>{st.b}</p>
   {last?<>
    <label className="chk" style={{padding:'4px 0 12px'}}><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>I understand how to use DormMates.</label>
    <button className="pri w" disabled={!ack} onClick={onDone}>Finish guide</button>
    <div className="row" style={{marginTop:8}}><button className="sm" style={{flex:1}} onClick={()=>setI(i-1)}>‹ Back</button><button className="sm" style={{flex:1}} onClick={onLater}>Ask me next time</button></div></>
   :<div className="row"><button className="sm" onClick={()=>setI(S.length-1)}>Skip</button><span style={{flex:1}}/>{i>0&&<button className="sm" onClick={()=>setI(i-1)}>‹ Back</button>}<button className="pri" onClick={()=>setI(i+1)}>Next ›</button></div>}
  </motion.div></>}
