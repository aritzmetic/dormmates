process.env.TZ='Asia/Manila';
import {db,push} from './_lib.js';
import {norm} from '../src/lib.js';

// Called every 5 minutes by cron-job.org. It handles:
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
    const now=new Date(),mins=now.getHours()*60+now.getMinutes(),today=ymd(now),dbg=req.query.debug==='1',trace=[];
    const out={custom:0,due:0,fix:0,long:0,noDevice:0};
    await db.doc('meta/tick').set({at:Date.now()});   // heartbeat: Settings shows whether this timer is running
    const spaces=await db.collection('spaces').get();
    const byUser=new Map();
    spaces.docs.forEach(s=>(s.data().members||[]).forEach(u=>byUser.set(u,[...(byUser.get(u)||[]),s])));
    const cache=new Map();
    const punches=async s=>{if(!cache.has(s.id)){const q=await s.ref.collection('punches').orderBy('ts','desc').limit(300).get();cache.set(s.id,q.docs.map(d=>d.data()))}return cache.get(s.id)};
    const lastIn=async uid=>{let best=null;for(const s of byUser.get(uid)||[]){const l=norm(uid,await punches(s),Date.now()).at(-1);if(l&&(!best||l.ts>best.ts))best=l}return best};
    const isIn=async uid=>(await lastIn(uid))?.type==='in';

    // 1) custom reminder times
    const prefs=await db.collection('prefs').get();
    for(const d of prefs.docs){
      const p=d.data(),uid=d.id;
      // use the PERSON's own clock (the phone saved its UTC offset), default Manila
      const lt=new Date(Date.now()-(p.tz??-480)*6e4),umins=lt.getUTCHours()*60+lt.getUTCMinutes(),dow=lt.getUTCDay(),today=lt.toISOString().slice(0,10);
      if(Array.isArray(p.days)&&!p.days.includes(dow))continue;
      // long-session alert: still timed in after N hours (once per session)
      if(p.longOn){const l=await lastIn(uid),h=+p.longH||10;
        if(l?.type==='in'&&Date.now()-l.ts>=h*36e5&&p.last?.longTs!==l.ts){await push([uid],{title:'⏱ Still timed in?',body:`You've been timed in for ${h}+ hours. Forgot to time out? Open DormMate.`,tag:'rem-long'});await d.ref.set({last:{longTs:l.ts}},{merge:true});out.long++}}
      // a reminder is DUE from its set time until 15 min later (so one late run of the timer never loses it) and is sent once a day
      const state=(on,at,k)=>{const t=toMin(at);if(!on)return 'off';if(t==null)return 'bad-time';const diff=umins-t;if(diff<0)return 'not-yet ('+(-diff)+' min to go)';if(diff>=15)return 'missed-window ('+diff+' min late)';if(p.last?.[k]===today)return 'already-sent-today';return 'DUE'};
      const sIn=state(p.inOn,p.inAt,'in'),sOut=state(p.outOn,p.outAt,'out');
      if(dbg)trace.push({user:uid.slice(0,6),phoneClock:`${String(Math.floor(umins/60)).padStart(2,'0')}:${String(umins%60).padStart(2,'0')}`,timeIn:sIn,timeOut:sOut});
      const fire=[sIn==='DUE'&&['in','🟢 Time to time in','Your time-in reminder. Open DormMate to punch in.','rem-in'],sOut==='DUE'&&['out','🔴 Time to time out','Your time-out reminder. Open DormMate to punch out.','rem-out']].filter(Boolean);
      for(const[k,title,body,tag]of fire){
        await d.ref.set({last:{[k]:today}},{merge:true});            // claim first, so two timers can never double-send
        const n=await push([uid],{title,body,tag});out.custom++;if(!n)out.noDevice++;
        await d.ref.set({lastSent:{kind:k,at:Date.now(),devices:n}},{merge:true});
      }
    }

    // 2) daily 9:00 AM: bill due + fix deadline reminders
    if(mins>=540&&mins<560){
      for(const s of spaces.docs){
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
    }
    res.json({ok:true,...out,...(dbg?{serverClock:now.toString(),users:trace}:{})});
  }catch(e){console.error('tick error',e);res.status(500).json({error:e.message})}
}
