import {useEffect,useState} from 'react';
import {motion} from 'framer-motion';

// Bump this number to make EVERYONE (new and existing users) see the guide once again.
export const TOUR_V=2;

// H = the person is the host of the current space. Steps are written for the role the person actually has.
const steps=H=>[
 {sec:'Welcome',tab:'home',ic:'👋',t:'Welcome to DormMate',b:`DormMate tracks who is in the dorm, adds up everyone's hours for each billing cycle, and splits the bills fairly by those hours. This guide covers every page. You are ${H?'the HOST of this space':'a MEMBER of this space'}. Tap Next, or Skip to go straight to the end.`},
 {sec:'Welcome',tab:'home',ic:'🎭',t:H?'What you can do as host':'What you can do as a member',b:H?'You can do everything a member can, plus: approve or deny fix requests, counter-check anyone\'s punches and suggest corrections, enter and send the bills, finalize a cycle and send receipts, and set the space rules, Wi-Fi and location.':'You can time in and out, request fixes for missed or wrong times, see who is home, and see your own bill share and receipt. Your host approves fixes and sends the bills.'},
 {sec:'Welcome',tab:'home',sel:'[data-tour=nav]',ic:'🧭',t:'The six tabs',b:'Home, Dorm, History, Fixes, Bills and Settings. A number badge on a tab means something is waiting for you, for example a fix to answer.'},

 {sec:'Home',tab:'home',sel:'[data-tour=hours]',ic:'🏠',t:'Your cycle and hours',b:`The top card shows the current billing cycle, how many people are home, and your hours so far. Use ‹ › to look at earlier cycles. Hours are counted from time in to time out${H?'. You set the cycle start day under Settings → Space.':', and the cycle starts on the day your host chose.'}`},
 {sec:'Home',tab:'home',sel:'[data-tour=punch]',ic:'⏱',t:'Time in / Time out',b:'Tap the big button when you arrive or leave. Add proof: take a picture with the in-app camera (the front camera is mirrored like a selfie, and 🔄 flips it) or send your location. Your dormmates get a notification like “Ana is home” with the proof attached.'},
 {sec:'Home',tab:'home',sel:'[data-tour=away]',ic:'🌙',t:'Auto time-in at 8:00 PM',b:'After you time out, you are timed back in automatically at 8:00 PM unless you confirm you are still away. Between 7:30 and 8:00 PM tap “I\'m still away” and send a picture or location. Your dormmates see the confirmation. If you do not confirm, you are counted as home and they are told. This card appears on Home after you time out.'},
 {sec:'Home',tab:'home',sel:'[data-tour=board]',ic:'🏆',t:'Cycle leaderboard',b:'Everyone\'s hours for this cycle, highest first. Bills are split using these hours, so they matter.'},

 {sec:'Dorm',tab:'dorm',sel:'[data-tour=dorm]',ic:'👥',t:"Who's home",b:`Every dormmate with their status, since when, and their latest proof. Tap a picture to enlarge it, or 📍 to open the location. You also see “Confirmed still away” and “auto time-in” notes here.${H?' As host you can remove a member with ✕.':''}`},
 {sec:'Dorm',tab:'dorm',sel:'[data-tour=notes]',ic:'📌',t:'Notice board',b:`Post a short note for the dorm. Everyone else gets a push notification. ${H?'Host announcements (Settings → Host tools) also show at the top of this tab.':'Announcements from your host show at the top of this tab.'}`},

 {sec:'History',tab:'history',sel:'[data-tour=hist]',ic:'🕘',t:'Choose who to view',b:'Everyone shows the average hours per member for each day. Tap a person\'s name to see only their hours. Use ‹ › to change the cycle.'},
 {sec:'History',tab:'history',sel:'[data-tour=chart]',ic:'📊',t:'Hours per day',b:'Each bar is one day of the cycle. Tap a bar to see that day\'s hours. The total under the chart is the average per member, or the person\'s own total.'},
 {sec:'History',tab:'history',sel:'[data-tour=sess]',ic:'🧾',t:'Time logged',b:'Every session with its time in, time out, duration and proof. “Approved fix” marks a session that was corrected. Arrows show sessions that started in the previous cycle or continue into the next.'},

 {sec:'Fixes',tab:'fixes',sel:'[data-tour=fixcal]',ic:'📝',t:'Fix a missed or wrong time',b:`Forgot to time in or out? Tap the day on the calendar and choose: edit a session, add time in + out, time in only, time out only, or remove a session. The default range is 12:00 AM to 11:59 PM, so adjust it. Add a reason. ${H?'Your own fixes are approved automatically if that is on in Settings → Fix request rules.':'Your host then approves or denies it. A dot on a day means a request is pending.'}`},
 ...(H?[
 {sec:'Fixes',tab:'fixes',sel:'[data-tour=counter]',ic:'🔍',t:'Counter-check a member',b:'Pick a member to see every punch they made this cycle, with photo or location proof. Tap Review on a day to look at it, and suggest a time in / out. A suggestion only counts after that member accepts it. They are notified, and you can withdraw it.'},
 {sec:'Fixes',tab:'fixes',sel:'[data-tour=fixdl]',ic:'⏳',t:'Fix deadline',b:'Set the date and time after which nobody can send new fix requests for this cycle. Everyone is reminded a day before. Finalizing the bills also locks the cycle.'}]
 :[]),
 {sec:'Fixes',tab:'fixes',sel:'[data-tour=fixreq]',ic:'📬',t:'Requests and their status',b:H?'Each request is Pending, Suggested (waiting for the member), Approved or Denied. Approve or deny, undo a decision, or act on a whole batch at once. The member is notified of your decision.':'Your requests are Pending, Approved or Denied, and you are notified of the decision. You can cancel a pending one. If your host SUGGESTS a correction to your hours, accept or decline it here; it only changes your hours if you accept.'},

 {sec:'Bills',tab:'bills',sel:'[data-tour=bills]',ic:'💡',t:'Deadline and days left',b:'Shows the payment deadline and how many days are left, counted in Manila time. It turns to “Due today” and then “Overdue”. Unpaid members get reminders 3 days before, 1 day before, on the day and after.'},
 ...(H?[
 {sec:'Bills',tab:'bills',sel:'[data-tour=billform]',ic:'🧮',t:'Enter the bills (private draft)',b:'Type the electric and water amounts, the period dates, the deadline and the base contribution. The deadline, base % and fixed members start from Settings → Bill defaults, so leave them to follow your defaults or change them for this bill only. Save draft is private: nobody sees it. Check the numbers below, then tap “Send to dormmates”, which notifies everyone.'},
 {sec:'Bills',tab:'bills',sel:'[data-tour=billform]',ic:'📅',t:'Period with no hours?',b:'If a past period has no recorded hours, tick “Calculate by days in the dorm” and type how many days each person was there. The bill is then split by days, and the receipts say days.'}]
 :[]),
 {sec:'Bills',tab:'bills',sel:'[data-tour=how]',ic:'ℹ️',t:'How shares are computed',b:'Optionally a base percentage is split equally among the “fixed” members. The rest is split by each person\'s share of the hours (or days). Cents are allocated so all shares add up exactly to the bill.'},
 {sec:'Bills',tab:'bills',sel:'[data-tour=shares]',ic:'💸',t:H?'Each person\'s share':'Your share',b:H?'Each card shows what that person owes, split into electricity ⚡ and water 💧. Tap “Mark paid” when someone pays. Export everything as CSV.':'Your card shows what you owe, split into electricity ⚡ and water 💧, and whether you are marked paid by your host. You can export the table as CSV.'},
 ...(H?[
 {sec:'Bills',tab:'bills',sel:'[data-tour=final]',ic:'🔒',t:'Remind, finalize, receipts',b:'“Remind unpaid members” sends a push to those who have not paid. “Finalize” locks the hours and fixes for the cycle. After that, generate receipts: each member gets a PDF showing exactly how their share was computed, and sees only their own.'}]
 :[{sec:'Bills',tab:'bills',sel:'[data-tour=bills]',ic:'🧾',t:'Receipts',b:'After the host finalizes the cycle, your receipt appears at the bottom of this tab. View it or download the PDF. It shows every step of how your share was computed.'}]),

 {sec:'Settings',tab:'settings',sel:'[data-tour=set-space]',ic:'🏠',t:'Space',b:H?'Change the space name and the billing cycle start day, share the invite code (Copy, Share or make a New one), see members and make someone else host, switch between spaces, leave, or delete the space for everyone.':'See the space details and the invite code, switch between spaces or join a new one, and leave the space. Only the host can change the name and cycle.'},
 {sec:'Settings',tab:'settings',sel:'[data-tour=set-fixes]',ic:'📏',t:'Fix request rules',b:H?'Choose whether your own fixes are approved automatically, whether a reason is required, how many days back a fix may go, and the longest range a single request may cover.':'The rules for sending fix requests: whether a reason is needed, how far back you can go and the longest range. Only the host can change them.'},
 {sec:'Settings',tab:'settings',sel:'[data-tour=set-bills]',ic:'💡',t:'Bill defaults',b:H?'The default deadline day, base percentage and fixed members. Changing them also updates every bill that is not finalized and has no custom value, and your dormmates are notified. Finalized bills never change.':'The default deadline, base percentage and fixed members used for the bills. Only the host can change them, and you are notified when they change.'},
 {sec:'Settings',tab:'settings',sel:'[data-tour=alerts]',ic:'🔔',t:'Notifications & reminders',b:'Enable notifications on this phone, then use “Send a test”. You can set a reminder to time in and time out at chosen times and days, and an alert if you stay timed in too long. Changes save automatically and work even when the app is closed. You are notified about punches, away confirmations, notes, bills, deadline changes, fixes, suggestions and receipts.'},
 {sec:'Settings',tab:'settings',sel:'[data-tour=auto]',ic:'📶',t:'Auto-detect Wi-Fi & location',b:H?'Type the dorm Wi-Fi name(s) and set the dorm location (use your current location, or paste a map link) with a perimeter. While the app is open, members are alerted when they arrive or leave.':'The host sets the dorm Wi-Fi name and location. Turn on alerts to be told when you arrive or leave while the app is open.'},
 {sec:'Settings',tab:'settings',sel:'[data-tour=auto]',ic:'📲',t:'Alerts when the app is closed',b:'A website cannot see your Wi-Fi in the background, but your phone can. In this section tap “Create my personal links”, then follow the iPhone Shortcuts or Android MacroDroid steps once. When you join or leave the dorm Wi-Fi, or arrive or leave, you get a notification asking if you want to time in or out.'},
 {sec:'Settings',tab:'settings',sel:'[data-tour=look]',ic:'🌗',t:'Appearance',b:'Choose Light, Dark, or System to follow your phone.'},
 ...(H?[{sec:'Settings',tab:'settings',sel:'[data-tour=set-host]',ic:'📣',t:'Host tools',b:'Send an announcement. It is sent as a notification to every member and shown at the top of the Dorm tab.'}]:[]),
 {sec:'Settings',tab:'settings',sel:'[data-tour=set-data]',ic:'📦',t:'Export data',b:H?'Download spreadsheets (CSV) of everyone\'s hours and sessions, and of fix requests, for the current cycle.':'Download a spreadsheet (CSV) of your own hours and sessions, and your fix requests, for the current cycle.'},
 {sec:'Settings',tab:'settings',sel:'[data-tour=set-help]',ic:'❓',t:'Help and account',b:'Replay this guide any time from Help. Under Account you can switch account, sign out, or delete your account.'},

 {sec:'Done',tab:'home',ic:'✅',t:'You are all set',b:'That is everything. Please confirm so we do not show this guide again. You can replay it from Settings → Help.',last:true}
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
   <div className="tour-bar"><i style={{width:((i+1)/S.length*100)+'%'}}/></div><div className="row sp" style={{marginBottom:2}}><span className="tag t-pending">{st.sec}</span><span className="mut" style={{fontSize:12}}>{i+1} / {S.length}</span></div>
   <div className="tour-ic">{st.ic}</div><h3>{st.t}</h3><p className="mut" style={{fontSize:14,marginBottom:14}}>{st.b}</p>
   {last?<>
    <label className="chk" style={{padding:'4px 0 12px'}}><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>I understand how to use DormMate.</label>
    <button className="pri w" disabled={!ack} onClick={onDone}>Finish guide</button>
    <div className="row" style={{marginTop:8}}><button className="sm" style={{flex:1}} onClick={()=>setI(i-1)}>‹ Back</button><button className="sm" style={{flex:1}} onClick={onLater}>Ask me next time</button></div></>
   :<div className="row"><button className="sm" onClick={()=>setI(S.length-1)}>Skip</button><span style={{flex:1}}/>{i>0&&<button className="sm" onClick={()=>setI(i-1)}>‹ Back</button>}<button className="pri" onClick={()=>setI(i+1)}>Next ›</button></div>}
  </motion.div></>}
