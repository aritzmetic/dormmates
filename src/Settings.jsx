import {useEffect,useState} from 'react';
import {signOut} from 'firebase/auth';
import {doc,collection,setDoc,updateDoc,addDoc,arrayRemove,deleteField} from 'firebase/firestore';
import {auth,db} from './firebase';
import {ping} from './notify';
import {List,Item,Av,buzz} from './ui';
import {cyc,cycLabel,fmt,sessions,notify,FIX} from './lib';

const DFLT={inOn:false,inAt:'08:00',outOn:false,outAt:'17:00',days:[0,1,2,3,4,5,6]};
const csv=(name,rows)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows.map(x=>x.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'}));a.download=name;a.click()};
const ord=n=>n+(n%100>10&&n%100<14?'th':['th','st','nd','rd'][n%10]||'th');
const Row=({children,...p})=><div className="row sp" style={{marginBottom:10}} {...p}>{children}</div>;

// one collapsible section
function Acc({id,open,set,icon,title,sub,children}){const on=open===id;
 return <div className="card acc"><button className="acch" onClick={()=>{buzz();set(on?'':id)}}><span className="acci">{icon}</span><span style={{flex:1,textAlign:'left'}}><b>{title}</b><span className="mut" style={{display:'block'}}>{sub}</span></span><span className="mut">{on?'▴':'▾'}</span></button>
  {on&&<div className="accb">{children}</div>}</div>}

// Everything configurable lives here, grouped by who it is for:
//  Account, Alerts (me) · Space, Fix rules, Bill defaults, Host tools (space) · Data
// Space-level sections are visible to everyone but only the host can change them.
export default function Settings({u,sp,spaces,owner,members,nm,PF,P,X,r,cd,say,setOff,askNotif,switchAcc,delAcc,leave,delSpace,openSpaces}){
 const cfg=sp.cfg||{},sref=doc(db,'spaces',sp.id),[open,setOpen]=useState('space'),[rp,setRp]=useState({...DFLT,...(PF||{})}),[an,setAn]=useState('');
 useEffect(()=>{setRp({...DFLT,...(PF||{})})},[JSON.stringify(PF)]);
 const perm=window.Notification?.permission,nRem=(rp.inOn?1:0)+(rp.outOn?1:0),pct=cfg.basePct??25,due=cfg.dueDay||5,back=cfg.fixBackDays?`${cfg.fixBackDays} days back`:'no limit on how far back';
 const hostOnly=!owner&&<p className="mut" style={{marginBottom:10}}>🔒 Only the host ({nm(sp.ownerId)}) can change these.</p>;
 const upd=async(patch,msg)=>{try{await updateDoc(sref,patch);buzz();say(msg||'Saved ✓')}catch(e){say('Failed: '+e.message,5000)}};

 // ---- me ----
 const savePf=async()=>{try{await setDoc(doc(db,'prefs',u.uid),{uid:u.uid,inOn:!!rp.inOn,inAt:rp.inAt,outOn:!!rp.outOn,outAt:rp.outAt,days:rp.days,updatedAt:Date.now()},{merge:true});buzz();
  say(perm==='granted'?'Reminders saved ✓':'Saved. Now tap "Enable notifications" so your phone can receive them.',5000)}catch(e){say('Failed: '+e.message,5000)}};
 const test=async()=>{if(!(await notify('DormMates test 🔔','If you can read this, notifications work on this device.')))say('Notifications are off or blocked. Tap "Enable notifications" first.',5000)};

 // ---- space ----
 const saveSpace=ev=>{ev.preventDefault();const g=new FormData(ev.target),n=String(g.get('n')).trim();if(!n)return say('The space needs a name.');
  upd({name:n,cycleDay:+g.get('c')},'Space saved ✓').then(()=>setOff(0))};
 const newCode=()=>confirm('Make a new invite code? The old code will stop working.')&&upd({code:Math.random().toString(36).slice(2,8).toUpperCase()},'New invite code ✓');
 const share=()=>navigator.share?navigator.share({title:'Join my DormMates space',text:`Join "${sp.name}" on DormMates with code ${sp.code}`}).catch(()=>{}):navigator.clipboard?.writeText(sp.code).then(()=>say('Code copied'));
 const makeHost=m=>confirm(`Make ${m.n} the host? You will lose host controls.`)&&upd({ownerId:m.id},`${m.n} is now the host`);
 const kick=m=>confirm(`Remove ${m.n} from this space?`)&&upd({members:arrayRemove(m.id),['names.'+m.id]:deleteField()},`${m.n} removed`);

 // ---- fix rules ----
 const saveFix=ev=>{ev.preventDefault();const g=new FormData(ev.target);
  upd({'cfg.hostAuto':g.has('ha'),'cfg.needReason':g.has('nr'),'cfg.fixBackDays':+g.get('fb')||0,'cfg.fixMaxDays':Math.min(62,Math.max(1,+g.get('fm')||31))})};

 // ---- bill defaults ----
 const saveBills=ev=>{ev.preventDefault();const g=new FormData(ev.target),p=g.get('p');
  upd({'cfg.basePct':p===''?25:Math.min(100,Math.max(0,+p||0)),'cfg.fixedIds':g.getAll('f'),'cfg.dueDay':+g.get('d')||5})};

 // ---- host tools ----
 const sendAn=async()=>{if(!an.trim())return;try{const ar=await addDoc(collection(db,'spaces',sp.id,'announcements'),{uid:u.uid,text:an.trim(),createdAt:Date.now()});setAn('');ping({sid:sp.id,kind:'announcement',id:ar.id});buzz();say('Sent to all members 📣')}catch(e){say('Failed: '+e.message,5000)}};

 // ---- data ----
 const who=owner?members:members.filter(m=>m.id===u.uid);
 const expHours=()=>{const rows=[['Name','Date','Time in','Time out','Hours (this cycle)','Type']];
  who.forEach(m=>sessions(m.id,P,X,r).slice().reverse().forEach(s=>rows.push([m.n,new Date(s.ca).toLocaleDateString(),fmt(s.a),s.live?'still in':fmt(s.b),((s.cb-s.ca)/36e5).toFixed(2),s.fix?'approved fix':s.ip?.auto?'auto time-in':s.live?'live':'punch'])));
  csv(`dormmates-hours-${new Date(r[0]).toISOString().slice(0,10)}.csv`,rows)};
 const expReq=()=>{const rows=[['Requester','Type','Day','From','To','Status','Reason','Sent']];
  X.filter(x=>x.cyc===String(r[0])&&(owner||x.uid===u.uid)).forEach(x=>rows.push([nm(x.uid),FIX[x.mode||x.kind||'add'],new Date(x.day??x.inTs??x.ts).toLocaleDateString(),fmt(x.ts??x.inTs),x.ts?'':fmt(x.outTs),x.status,x.reason,fmt(x.createdAt)]));
  csv(`dormmates-requests-${new Date(r[0]).toISOString().slice(0,10)}.csv`,rows)};

 return <List><h2 style={{margin:'6px 0 12px'}}>Settings</h2>

  <Item className="card row"><Av m={{n:u.displayName||'Me',p:u.photoURL||''}}/><div style={{flex:1,minWidth:0}}><b>{u.displayName||'Me'}</b><div className="mut" style={{overflow:'hidden',textOverflow:'ellipsis'}}>{u.email}</div><div className="mut">{owner?'Host':'Member'} of {sp.name}</div></div></Item>

  <Item className="acc-wrap">
   <Acc id="space" open={open} set={setOpen} icon="🏠" title="Space" sub={`${sp.name} · ${members.length} member${members.length>1?'s':''} · cycle starts day ${cd}`}>
    {hostOnly}
    <fieldset disabled={!owner}><form key={sp.name+cd} onSubmit={saveSpace}>
     <label>Space name</label><input name="n" defaultValue={sp.name} maxLength={40}/>
     <label>Billing cycle starts on day</label><select name="c" defaultValue={cd}>{[...Array(28)].map((_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select>
     <p className="mut" style={{marginBottom:10}}>Current cycle: <b style={{color:'var(--ink)'}}>{cycLabel(cyc(0,cd))}</b>. Hours, fixes and bills follow this range. Bills already saved under older dates stay in their old cycle.</p>
     {owner&&<button className="pri w">Save space</button>}</form></fieldset>

    <h4>Invite code</h4>
    <Row><b style={{fontSize:22,letterSpacing:2}}>{sp.code}</b><span className="row" style={{gap:8}}><button className="sm" onClick={()=>navigator.clipboard?.writeText(sp.code).then(()=>say('Code copied'))}>Copy</button><button className="sm" onClick={share}>Share</button>{owner&&<button className="sm" onClick={newCode}>New</button>}</span></Row>

    <h4>Members</h4>
    {members.map(m=><Row key={m.id}><span className="row" style={{minWidth:0}}><Av m={m}/><span><b>{m.n}</b>{m.id===sp.ownerId&&<span className="mut"> · host</span>}{m.id===u.uid&&<span className="mut"> · you</span>}</span></span>
     {owner&&m.id!==u.uid&&<span className="row" style={{gap:8}}><button className="sm" onClick={()=>makeHost(m)}>Make host</button><button className="sm no" onClick={()=>kick(m)}>✕</button></span>}</Row>)}

    <h4>Spaces</h4>
    <button className="w" style={{marginBottom:8}} onClick={openSpaces}>🔀 Switch, create or join a space{spaces.length>1?` (${spaces.length})`:''}</button>
    <button className="w" style={{marginBottom:8}} onClick={async()=>{if(confirm(`Leave ${sp.name}?`))await leave(sp)}}>Leave “{sp.name}”</button>
    {owner&&<button className="w" style={{color:'var(--bad)'}} onClick={delSpace}>🗑 Delete this space for everyone</button>}
   </Acc></Item>

  <Item className="acc-wrap">
   <Acc id="fixes" open={open} set={setOpen} icon="📝" title="Fix request rules" sub={`${cfg.hostAuto!==false?'Host fixes auto-approved · ':''}${back} · max ${cfg.fixMaxDays||31} days per request`}>
    {hostOnly}
    <fieldset disabled={!owner}><form key={JSON.stringify(cfg)} onSubmit={saveFix}>
     <label className="chk"><input type="checkbox" name="ha" defaultChecked={cfg.hostAuto!==false}/>Host's own fixes are approved instantly</label>
     <label className="chk"><input type="checkbox" name="nr" defaultChecked={cfg.needReason!==false}/>Require a reason on every request</label>
     <label>How far back can members request a fix?</label><select name="fb" defaultValue={cfg.fixBackDays||0}><option value={0}>No limit</option>{[3,7,14,31].map(n=><option key={n} value={n}>{n} days</option>)}</select>
     <label>Most days in one request (batch)</label><input name="fm" type="number" min="1" max="62" inputMode="numeric" defaultValue={cfg.fixMaxDays||31}/>
     <p className="mut" style={{marginBottom:10}}>A request over several days is split into one request per day, so each day can be approved, denied or changed on its own. The deadline for a specific cycle is set in the Fixes tab.</p>
     {owner&&<button className="pri w">Save fix rules</button>}</form></fieldset>
   </Acc></Item>

  <Item className="acc-wrap">
   <Acc id="bills" open={open} set={setOpen} icon="💡" title="Bill defaults" sub={`Base ${pct}% · ${cfg.fixedIds?.length?cfg.fixedIds.length+' fixed member'+(cfg.fixedIds.length>1?'s':''):'no fixed group'} · due on the ${ord(due)}`}>
    {hostOnly}
    <fieldset disabled={!owner}><form key={JSON.stringify([cfg.basePct,cfg.fixedIds,cfg.dueDay])+members.length} onSubmit={saveBills}>
     <label>Base contribution (% of each bill, split equally)</label><input name="p" type="number" min="0" max="100" step="any" inputMode="decimal" defaultValue={pct}/>
     <label>Who pays the base contribution?</label>{members.map(m=><label key={m.id} className="chk"><input type="checkbox" name="f" value={m.id} defaultChecked={(cfg.fixedIds||[]).includes(m.id)}/>{m.n}</label>)}
     <label>Payment due on day of the month after the cycle</label><select name="d" defaultValue={due}>{[...Array(28)].map((_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select>
     <p className="mut" style={{margin:'4px 0 10px'}}>These are the starting values for every new bill period. A period you already saved keeps its own numbers, and you can still change any period in the Bills tab.</p>
     {owner&&<button className="pri w">Save bill defaults</button>}</form></fieldset>
   </Acc></Item>

  <Item className="acc-wrap">
   <Acc id="alerts" open={open} set={setOpen} icon="🔔" title="Notifications & reminders" sub={`${perm==='granted'?'On for this phone':'Off for this phone'} · ${nRem} reminder${nRem===1?'':'s'}`}>
    {perm!=='granted'?<div className="warn">Notifications are off on this phone. <button className="sm" style={{marginLeft:6}} onClick={askNotif}>Enable notifications</button></div>
     :<Row><span>✅ Notifications are on</span><button className="sm" onClick={test}>Send a test</button></Row>}
    <p className="mut" style={{marginBottom:6}}>Get a push at the times you choose. A time-in reminder is skipped if you're already in, and a time-out reminder is skipped if you're already out.</p>
    <label className="chk"><input type="checkbox" checked={!!rp.inOn} onChange={e=>setRp({...rp,inOn:e.target.checked})}/>Remind me to time in</label>{rp.inOn&&<input type="time" value={rp.inAt} onChange={e=>setRp({...rp,inAt:e.target.value})}/>}
    <label className="chk"><input type="checkbox" checked={!!rp.outOn} onChange={e=>setRp({...rp,outOn:e.target.checked})}/>Remind me to time out</label>{rp.outOn&&<input type="time" value={rp.outAt} onChange={e=>setRp({...rp,outAt:e.target.value})}/>}
    <label>Repeat on</label><div className="fchips">{['Su','Mo','Tu','We','Th','Fr','Sa'].map((d,i)=><button key={i} className={`fchip ${rp.days.includes(i)?'on':''}`} onClick={()=>setRp({...rp,days:rp.days.includes(i)?rp.days.filter(x=>x!==i):[...rp.days,i].sort()})}>{d}</button>)}</div>
    <button className="pri w" onClick={savePf}>Save reminders</button>
    <p className="mut" style={{marginTop:10}}>The “confirm you are away” alert at 7:30 PM is automatic and cannot be turned off.</p>
   </Acc></Item>

  {owner&&<Item className="acc-wrap">
   <Acc id="host" open={open} set={setOpen} icon="📣" title="Host tools" sub="Send a message to everyone">
    <p className="mut" style={{marginBottom:8}}>Your message is sent as a push notification to every member and shown in the Dorm tab.</p>
    <input placeholder="e.g. Water will be off at 3 PM" maxLength={140} value={an} onChange={e=>setAn(e.target.value)}/><button className="pri w" disabled={!an.trim()} onClick={sendAn}>Send notification</button>
   </Acc></Item>}

  <Item className="acc-wrap">
   <Acc id="data" open={open} set={setOpen} icon="📦" title="Export data" sub={`Current cycle · ${cycLabel(r)}`}>
    <p className="mut" style={{marginBottom:10}}>Download spreadsheets (CSV) for the current cycle. {owner?'As host you get everyone.':'You get your own.'}</p>
    <button className="w" style={{marginBottom:8}} onClick={expHours}>⬇ Hours & sessions</button><button className="w" onClick={expReq}>⬇ Fix requests</button>
   </Acc></Item>

  <Item className="acc-wrap">
   <Acc id="account" open={open} set={setOpen} icon="👤" title="Account" sub={u.email||'Signed in with Google'}>
    <button className="w" style={{marginBottom:8}} onClick={switchAcc}>🔄 Switch account</button><button className="w" style={{marginBottom:8}} onClick={()=>signOut(auth)}>Sign out</button>
    <button className="no w" onClick={delAcc}>Delete my account</button>
   </Acc></Item>
 </List>}
