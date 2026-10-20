process.env.TZ='Asia/Manila';
import {db,push,pushInfo,who,others} from './_lib.js';
import {norm} from '../src/lib.js';

// Called every 2-5 minutes by cron-job.org. It handles:
//  1) each member's custom "time in" / "time out" reminder times
//  2) once a day at 9:00 AM: bill due-date reminders and fix-deadline reminders
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const toMin=t=>{const[h,m]=String(t||'').split(':').map(Number);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:null};
const day0=t=>{const d=new Date(t);return +new Date(d.getFullYear(),d.getMonth(),d.getDate())};
const fmtDT=t=>new Date(t).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Asia/Manila'});

export default async function handler(req,res){
  const key=req.query.key||(req.headers.authorization||'').replace(/^Bearer /,'');
  if(!process.env.CRON_SECRET||key!==process.env.CRON_SECRET)return res.status(401).json({error:'unauthorized'});
  try{
    const now=new Date(),mins=now.getHours()*60+now.getMinutes(),today=ymd(now),dbg=req.query.debug==='1',force=req.query.force==='1',trace=[],sent=[];
    const out={custom:0,due:0,fix:0,long:0,noDevice:0};
    await db.doc('meta/tick').set({at:Date.now()});   // heartbeat: Settings shows whether this timer is running
    // QUOTA-FRIENDLY: a normal run reads only the few people with a reminder switched on, plus the (usually empty) Wi-Fi watch list.
    // Spaces and punches are read only when something actually needs them, and heavy checks run at most once per time slot.
    let spacesP=null;const getSpaces=()=>spacesP||(spacesP=db.collection('spaces').get());
    const cache=new Map();
    const punches=async(s,n=100)=>{const k=s.id+':'+n;if(!cache.has(k)){const q=await s.ref.collection('punches').orderBy('ts','desc').limit(n).get();cache.set(k,q.docs.map(d=>d.data()))}return cache.get(k)};
    let stP=null;const slots=async()=>stP||(stP=(await db.doc('meta/tickState').get()).data()||{});
    const setSlots=o=>db.doc('meta/tickState').set(o,{merge:true});

    // 1) custom reminder times
    const want=new Map();
    (await Promise.all(['inOn','outOn','longOn'].map(f=>db.collection('prefs').where(f,'==',true).get()))).forEach(q=>q.docs.forEach(d=>want.set(d.id,d)));
    for(const d of want.values()){
      const p=d.data(),uid=d.id;
      // use the PERSON's own clock (the phone saved its UTC offset), default Manila
      const lt=new Date(Date.now()-(p.tz??-480)*6e4),umins=lt.getUTCHours()*60+lt.getUTCMinutes(),dow=lt.getUTCDay(),today=lt.toISOString().slice(0,10);
      if(!force&&Array.isArray(p.days)&&!p.days.includes(dow))continue;
      // long-session alert: still timed in after N hours (once per session). Checked at most once per half hour per person.
      if(p.longOn&&p.longSlot!==Math.floor(Date.now()/18e5)){
        await d.ref.set({longSlot:Math.floor(Date.now()/18e5)},{merge:true});
        const h=+p.longH||10;let best=null;
        for(const s of (await db.collection('spaces').where('members','array-contains',uid).get()).docs){const l=norm(uid,await punches(s,60),Date.now()).at(-1);if(l&&(!best||l.ts>best.ts))best=l}
        if(best?.type==='in'&&Date.now()-best.ts>=h*36e5&&p.last?.longTs!==best.ts){await push([uid],{title:'⏱ Still timed in?',body:`You've been timed in for ${h}+ hours. Forgot to time out? Open DormMate.`,tag:'rem-long'});await d.ref.set({last:{longTs:best.ts}},{merge:true});out.long++}}
      // a reminder is DUE from its set time until 15 min later (so one late run of the timer never loses it) and is sent once a day
      const state=(on,at,k)=>{const t=toMin(at);if(!on)return 'off';if(t==null)return 'bad-time';if(p.last?.[k]===today+'@'+at)return 'already-sent-today';const diff=umins-t;if(diff<0)return 'not-yet ('+(-diff)+' min to go)';if(diff>=15)return 'missed-window ('+diff+' min late, the timer did not run in the 15 minutes after the set time)';return 'DUE'};
      const sIn=state(p.inOn,p.inAt,'in'),sOut=state(p.outOn,p.outAt,'out');
      if(dbg)trace.push({user:uid.slice(0,6),phoneClock:`${String(Math.floor(umins/60)).padStart(2,'0')}:${String(umins%60).padStart(2,'0')}`,timeIn:sIn,timeOut:sOut});
      // force=1 (secret-protected test): send every reminder that is switched on, right now, through the exact same push path
      const fire=[(sIn==='DUE'||(force&&p.inOn))&&['in','🟢 Time to time in','Your time-in reminder. Open DormMate to punch in.','rem-in-'+today],(sOut==='DUE'||(force&&p.outOn))&&['out','🔴 Time to time out','Your time-out reminder. Open DormMate to punch out.','rem-out-'+today]].filter(Boolean);
      for(const[k,title,body,tag]of fire){
        if(!force)await d.ref.set({last:{[k]:today+'@'+(k==='in'?p.inAt:p.outAt)}},{merge:true});   // claim first, so two timers can never double-send
        const n=await push([uid],{title,body,tag});out.custom++;if(!n)out.noDevice++;
        sent.push({user:uid.slice(0,6),kind:k,devices:n,tokens:pushInfo.tokens,errors:pushInfo.errors});
        if(!force)await d.ref.set({lastSent:{kind:k,at:Date.now(),devices:n}},{merge:true});
      }
    }

    // 1b) 8:00-9:00 PM: tell the dorm about anyone who did not confirm they were away and was auto timed in (once per 10-minute slot)
    if(mins>=1200&&mins<1260){const st=await slots(),slot=Math.floor(Date.now()/6e5);
      if(st.autoSlot!==slot){await setSlots({autoSlot:slot});
        for(const s of (await getSpaces()).docs){const sp=s.data(),mem=sp.members||[];if(mem.length<2)continue;
          const P=await punches(s,150);
          for(const uid of mem){for(const e of norm(uid,P,Date.now()).filter(e=>e.auto&&Date.now()-e.ts<90*60e3)){
            const ref=s.ref.collection('autoNotified').doc(`${uid}_${e.ts}`);if((await ref.get()).exists)continue;
            await ref.set({at:Date.now()});   // claim first so it is never sent twice
            await push(others(sp,uid),{title:`🏠 ${who(sp,uid)} was auto timed in`,body:`They did not confirm they were away before 8:00 PM, so they are counted as home.`,tag:'auto-'+uid+'-'+e.ts});out.auto=(out.auto||0)+1}}}}}

    // 1c) disconnected from the dorm Wi-Fi but still timed in after the grace period -> ask the HOST to verify.
    //     api/presence.js puts one tiny document per pending person in `pendingWifi`, so this costs ONE read when nobody is pending.
    const groups=new Map();
    for(const d of (await db.collection('pendingWifi').get()).docs){const w=d.data();
      if(!w.outAt||Date.now()-w.outAt<(w.graceMs||3e5))continue;
      const sref=db.doc(`spaces/${w.sid}`),sd=await sref.get();if(!sd.exists){await d.ref.delete();continue}
      const sp=sd.data(),pres=sref.collection('presence').doc(w.uid),last=norm(w.uid,await punches(sd,100),Date.now()).at(-1);
      if(last?.type!=='in'||last.ts>w.outAt){await pres.set({pending:false,resolved:'auto-clear'},{merge:true});await d.ref.delete();continue}   // they timed out / reconnected meanwhile
      await pres.set({escalatedAt:Date.now()},{merge:true});await d.ref.delete();   // claim first
      const ago=Math.round((Date.now()-w.outAt)/6e4),name=who(sp,w.uid);
      if(w.uid===sp.ownerId){await push([sp.ownerId],{title:'📴 Still timed in?',body:`You left the dorm Wi-Fi ${ago} min ago and are still timed in. Open DormMate to time out.`,url:'/?punch=out',tag:'verify-'+w.uid});out.verify=(out.verify||0)+1;continue}
      const g=groups.get(w.sid)||{sp,names:[],ago:0};g.names.push(name);g.ago=Math.max(g.ago,ago);groups.set(w.sid,g)}
    // several members can be waiting at once: the host gets ONE notification per space and handles them from a list
    for(const[sid,g]of groups){
      await push([g.sp.ownerId],g.names.length===1
        ?{title:`📴 ${g.names[0]} left the dorm Wi-Fi`,body:`${g.ago} min ago, and ${g.names[0]} is still timed in. Did they leave? Tap to verify.`,url:'/?verify=1',tag:'verify-'+sid}
        :{title:`📴 ${g.names.length} members left the dorm Wi-Fi`,body:`${g.names.join(', ')} are still timed in. Tap to review the list and choose what to do.`,url:'/?verify=1',tag:'verify-'+sid});
      out.verify=(out.verify||0)+g.names.length}

    // 2) daily 9:00 AM: bill due + fix deadline reminders
    if(mins>=540&&mins<560&&(await slots()).dueDay!==today){
      for(const s of (await getSpaces()).docs){
        const sp=s.data(),bills=await s.ref.collection('bills').get();
        for(const bd of bills.docs){
          const b=bd.data(),upd={};
          if((b.elec||b.water)&&b.due&&b.remDay!==today){
            const dl=Math.round((day0(b.due)-day0(now))/864e5);
            if([3,1,0,-1].includes(dl)){
              const unpaid=(sp.members||[]).filter(u=>!b.paid?.[u]);
              const when=dl===3?'in 3 days':dl===1?'tomorrow':dl===0?'today':'was yesterday';
              await push(unpaid,{title:dl<0?'⚠️ Bill overdue':'💡 Bill due '+when,body:`${sp.name}: ${dl<0?'your bill is overdue.':'your bill is due '+when+'.'} Open the app to see your share.`,tag:'due-'+bd.id});
              out.due+=unpaid.length;upd.remDay=today;
            }
          }
          if(b.fixDue&&!b.final&&b.fixRem!==today){
            const hl=(b.fixDue-Date.now())/36e5;
            if(hl>0&&hl<=30){
              await push(sp.members||[],{title:'⏳ Fix requests close soon',body:`${sp.name}: requests for this cycle close ${fmtDT(b.fixDue)}.`,tag:'fixrem-'+bd.id});
              out.fix+=(sp.members||[]).length;upd.fixRem=today;
            }
          }
          if(Object.keys(upd).length)await bd.ref.update(upd);
        }
      }
      await setSlots({dueDay:today});   // done for today: later runs in this window skip it
    }
    res.json({ok:true,...out,sent,...(dbg?{serverClock:now.toString(),users:trace}:{})});
  }catch(e){console.error('tick error',e);res.status(500).json({error:e.message})}
}
