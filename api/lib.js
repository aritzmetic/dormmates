export const fmt=t=>new Date(t).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
export const tm=t=>new Date(t).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
export const dur=h=>{const m=Math.round(h*60);return `${Math.floor(m/60)}h ${m%60}m`};
export const clock=ms=>{const s=Math.max(0,Math.floor(ms/1e3));return[s/3600|0,s/60%60|0,s%60].map(n=>String(n).padStart(2,'0')).join(':')};
export const peso=n=>'₱'+(+n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
export const d2s=t=>new Date(t-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
export const s2d=v=>{const[y,m,d]=v.split('-');return +new Date(y,m-1,d)};
export const dayAt=(s,i)=>{const d=new Date(s);return new Date(d.getFullYear(),d.getMonth(),d.getDate()+i)};
export const sod=t=>+dayAt(t,0);            // 12:00 AM of that day
export const eod=t=>+dayAt(t,1)-1;          // 11:59:59.999 PM of that day
// start of the cycle that contains t (same maths as cyc(), but for any date)
export const cycOf=(t,day=14)=>{const d=new Date(t),m=d.getMonth()-(d.getDate()<day?1:0);return +new Date(d.getFullYear(),m,day)};
// Split a range into one piece per calendar day. First day: start -> 11:59 PM, middle days: 12:00 AM -> 11:59 PM,
// last day: 12:00 AM -> end. Example Sep 11 2:00 PM -> Oct 1 2:00 PM gives 21 pieces.
export function splitDays(a,b){const o=[];if(!(b>a))return o;
 for(let d=sod(a);d<b;d=+dayAt(d,1)){const e=+dayAt(d,1),x=Math.max(a,d),y=b>=e?e-1:b;if(y>x)o.push({day:d,a:x,b:y})}return o}
// cycle starts on `day` of the month (host setting, default 14) and ends the day before the next one (end exclusive)
export function cyc(off=0,day=14){const n=new Date(),m=n.getMonth()-(n.getDate()<day?1:0)+off;return[+new Date(n.getFullYear(),m,day),+new Date(n.getFullYear(),m+1,day)]}
export const cycLabel=r=>`${new Date(r[0]).toLocaleDateString([],{month:'short',day:'numeric'})} – ${new Date(r[1]-1).toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})}`;
// 8:00 PM of the day after t
export const dl=t=>{const d=new Date(t);return +new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,20)};
// first auto time-in after a time out: today 8 PM if timed out before 7:30 PM, otherwise tomorrow 8 PM
export const fd=t=>{const d=new Date(t),e=+new Date(d.getFullYear(),d.getMonth(),d.getDate(),20);return t<e-18e5?e:dl(t)};
export const dayWord=t=>{const d=new Date(t),n=new Date(),k=x=>x.toDateString();return k(d)===k(n)?'today':k(d)===k(new Date(+n+864e5))?'tomorrow':d.toLocaleDateString([],{weekday:'long'})};
export async function notify(title,body){try{if(window.Notification?.permission!=='granted')return false;const r=await navigator.serviceWorker?.ready;
 if(r?.showNotification){await r.showNotification(title,{body,icon:'/icon-192.png',vibrate:[120,60,120],tag:title});return true}new Notification(title,{body,icon:'/icon.svg'});return true}catch{return false}}
// punches + virtual auto time-ins: after a time out, if the person doesn't confirm they are away between 7:30-8:00 PM, they are timed in at 8:00 PM
export function norm(uid,P,now=Date.now()){const a=P.filter(p=>p.uid===uid&&p.type!=='away').sort((x,y)=>x.ts-y.ts),aw=P.filter(p=>p.uid===uid&&p.type==='away').map(p=>p.ts),o=[];
 for(let i=0;i<a.length;i++){const p=a[i];o.push(p);
  if(p.type==='out'&&!p.fix){let D=fd(p.ts);const n=a[i+1];
   while(D<=now){if(n&&n.type==='in'&&n.ts<=D)break;
    if(aw.some(t=>t>=D-18e5&&t<D)){D=dl(D);continue}
    o.push({uid,type:'in',ts:D,auto:true});while(a[i+1]?.type==='in')i++;break}}}
 return o.sort((x,y)=>x.ts-y.ts)}
export function away(uid,P,now=Date.now()){const l=norm(uid,P,now).at(-1);if(!l||l.type!=='out'||l.fix)return null;
 const aw=P.filter(p=>p.uid===uid&&p.type==='away').map(p=>p.ts);let D=fd(l.ts);while(aw.some(t=>t>=D-18e5&&t<D))D=dl(D);
 return{D,open:now>=D-18e5&&now<D}}
// Approved "time in only" / "time out only" fixes behave like real punches (see withFix). Put them into the punch list first.
export const withFix=(P,X)=>[...P,...X.filter(x=>x.status==='approved'&&(x.kind==='in'||x.kind==='out')&&x.ts>0).map(x=>({id:'fx'+x.id,uid:x.uid,type:x.kind,ts:x.ts,fix:true,fixId:x.id}))];
// remove the part of session s that falls inside [ca,cb); what is left on either side stays
const carve=(s,ca,cb)=>{if(!(s.a<cb&&s.b>ca))return[s];const o=[];
 if(s.a<ca)o.push({...s,b:ca,op:undefined,live:false});
 if(s.b>cb)o.push({...s,a:cb,ip:undefined});return o};
// sessions; approved fixes are layered in the order they were decided.
//  v2 fixes (one per day) only replace the time inside their own window, so a fix on one day never touches another day.
//  older fixes (no v) still remove every session they touch. kind 'remove' only clears, 'add'/'edit' also add their own session.
//  kind 'in' / 'out' are not handled here: they are real-looking punches added by withFix().
export function pairs(uid,P,X,now=Date.now()){let out=[],o=null;
 norm(uid,P,now).forEach(p=>{if(p.type==='in')o=p;else if(p.type==='out'&&o){out.push({a:o.ts,b:p.ts,ip:o,op:p});o=null}});
 if(o)out.push({a:o.ts,b:now,ip:o,live:true});
 X.filter(x=>x.uid===uid&&x.status==='approved'&&x.kind!=='in'&&x.kind!=='out').sort((x,y)=>(x.decidedAt??x.createdAt??0)-(y.decidedAt??y.createdAt??0)).forEach(x=>{
  const ca=x.cutA??x.inTs,cb=x.cutB??x.outTs;out=x.v>=2?out.flatMap(s=>carve(s,ca,cb)):out.filter(s=>!(s.a<cb&&s.b>ca));
  if(x.kind!=='remove')out.push({a:x.inTs,b:x.outTs,fix:true,fixId:x.id})});
 return out}
export function iv(uid,P,X,[s,e]){const a=pairs(uid,P,X).map(x=>[x.a,x.b]).sort((x,y)=>x[0]-y[0]),m=[];
 for(const[b,c]of a){const L=m[m.length-1];if(L&&b<=L[1])L[1]=Math.max(L[1],c);else m.push([b,c])}
 return m.map(([b,c])=>[Math.max(b,s),Math.min(c,e)]).filter(([b,c])=>c>b)}
export const hrs=(uid,P,X,r)=>iv(uid,P,X,r).reduce((t,[b,c])=>t+c-b,0)/36e5;
export function daily(ivs,[s,e]){const d=[];for(let i=0;+dayAt(s,i)<e;i++){const a=+dayAt(s,i),z=+dayAt(s,i+1);d.push(ivs.reduce((t,[b,c])=>t+Math.max(0,Math.min(c,z)-Math.max(b,a)),0)/36e5)}return d}
// a session that crosses 12AM of the 14th stays one session; each cycle only counts its own part
export const sessions=(uid,P,X,[s,e])=>pairs(uid,P,X).filter(x=>x.a<e&&x.b>s).map(x=>({...x,uid,ca:Math.max(x.a,s),cb:Math.min(x.b,e),before:x.a<s,after:x.b>e})).sort((x,y)=>y.a-x.a);
export const shrink=f=>new Promise(res=>{const im=new Image();im.onload=()=>{const s=720/Math.max(im.width,im.height,720),c=document.createElement('canvas');c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.6))};im.src=URL.createObjectURL(f)});

// Bill split. `pct`% of the bill is the base pool, split equally among the `fixed` members only.
// The rest is split by actual hours among EVERYONE. No fixed members selected -> 100% by hours.
// Cents are allocated with the largest-remainder method so shares add up exactly to the bill.
export function shares(amt,ids,hours,fixed=[],pct=25){
 const n=ids.length;if(!n)return{amounts:[],base:0,rest:0,nf:0};
 const T=hours.reduce((a,c)=>a+c,0),F=ids.map(id=>fixed.includes(id)),nf=F.filter(Boolean).length,
  total=Math.round((+amt||0)*100),base=nf?Math.round(total*Math.min(100,Math.max(0,+pct||0))/100):0,rest=total-base,
  rb=F.map(f=>f?base/nf:0),ru=hours.map(h=>(T?h/T:1/n)*rest),raw=rb.map((x,i)=>x+ru[i]),fl=raw.map(Math.floor);
 let rem=total-fl.reduce((a,c)=>a+c,0);
 raw.map((x,i)=>[x-fl[i],i]).sort((a,c)=>c[0]-a[0]).forEach(([,i])=>{if(rem>0){fl[i]++;rem--}});
 return{amounts:fl.map((t,i)=>{const b=Math.min(t,Math.round(rb[i]));return{base:b/100,use:(t-b)/100,total:t/100}}),base:base/100,rest:rest/100,nf}}

// ---- fix requests ----
export const FIX={add:'Add time (in + out)',in:'Add time in',out:'Add time out',edit:'Edit session',remove:'Remove session'};
// the time window a request touches
export const xr=x=>[x.cutA??x.inTs??x.ts,x.cutB??x.outTs??x.ts];
// Can this "time in only" / "time out only" fix be applied at time T? P must already include approved fixes (withFix).
// 'in'  : you must have been timed out at T, and your very next event must be a time out (that is how long you stayed).
// 'out' : you must have been timed in at T (that session ends at T).
export function fixCheck(uid,P,kind,T,now=Date.now()){
 const ev=norm(uid,P,now),bf=ev.filter(e=>e.ts<=T).at(-1),af=ev.find(e=>e.ts>T);
 if(kind==='in'){
  if(bf?.type==='in')return{ok:false,msg:`You were already timed in at ${tm(T)} (since ${fmt(bf.ts)}${bf.auto?', auto time-in':''}). Use Edit to change that session instead.`};
  if(!af)return{ok:false,msg:'There is no time out after that time, so we cannot tell how long you stayed. Use "Time in + out" instead.'};
  if(af.type!=='out')return{ok:false,msg:`You timed in again at ${fmt(af.ts)}. Use Edit on that session to move its start earlier.`};
  return{ok:true,partner:af,msg:`Counts until your time out at ${fmt(af.ts)} · ${dur((af.ts-T)/36e5)}`}}
 if(T>now+6e4)return{ok:false,msg:"Time out can't be in the future."};
 if(!bf||bf.type!=='in')return{ok:false,msg:bf?`You were already timed out at ${tm(T)} (since ${fmt(bf.ts)}). Nothing to close.`:'You were not timed in before that time. Use "Time in + out" instead.'};
 return{ok:true,partner:bf,msg:`Ends your session that started ${fmt(bf.ts)} · ${dur((T-bf.ts)/36e5)}`}}
