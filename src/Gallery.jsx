import {useEffect,useState} from 'react';
import {collection,query,orderBy,limit,onSnapshot} from 'firebase/firestore';
import {db} from './firebase';
import {Av} from './ui';
import {tm} from './lib';

// GALLERY: every picture and location ever sent, read straight from the punch records.
// It does NOT depend on fix requests: a fix can hide a session from History, but it never touches the punch,
// so the picture / location is still here. (firestore.rules also stops anyone from editing or deleting a punch that has proof.)
const STEP=300,TYPE={in:'Time in',out:'Time out',away:'Still away'};
const dayKey=t=>new Date(t).toDateString();

export default function Gallery({sp,members,nm,zoom,onClose}){
 const [rows,setRows]=useState([]),[lim,setLim]=useState(STEP),[ready,setReady]=useState(false),[more,setMore]=useState(false),[err,setErr]=useState(''),
  [who,setWho]=useState('all'),[kind,setKind]=useState('all');

 // newest punches first; "Load older" raises the limit. Only the ones that carry a picture or a location are shown.
 useEffect(()=>onSnapshot(query(collection(db,'spaces',sp.id,'punches'),orderBy('ts','desc'),limit(lim)),
  d=>{setRows(d.docs.map(x=>({id:x.id,...x.data()})));setMore(d.size>=lim);setReady(true)},
  e=>{setErr(e.message);setReady(true)}),[sp.id,lim]);

 const proof=rows.filter(p=>p.photo||p.loc),
  nPhoto=proof.filter(p=>p.photo).length,nLoc=proof.filter(p=>!p.photo&&p.loc).length,
  items=proof.filter(p=>(who==='all'||p.uid===who)&&(kind==='all'||(kind==='photo'?p.photo:!p.photo&&p.loc))),
  days=[...new Set(items.map(p=>dayKey(p.ts)))];
 const first=id=>(nm(id)||'Former member').split(' ')[0];

 return <div className="rv">
  <div className="rvbar"><b style={{fontSize:17}}>🖼 Gallery</b><button className="sm" onClick={onClose}>✕ Close</button></div>
  <div className="rvbody"><div style={{maxWidth:560,margin:'auto'}}>
   <div className="note" style={{border:0,margin:'0 0 12px',padding:0}}>
    <p className="mut">🔒 Pictures and locations are kept for good. Fix requests, edits and removals only change hours, they never delete these. They are removed only if the host deletes the whole space.</p></div>
   <div className="fchips">{[{id:'all',n:'Everyone'},...members].map(m=><button key={m.id} className={`fchip ${who===m.id?'on':''}`} onClick={()=>setWho(m.id)}>{m.n.split(' ')[0]}</button>)}</div>
   <div className="seg">{[['all',`All · ${nPhoto+nLoc}`],['photo',`📸 Pictures · ${nPhoto}`],['loc',`📍 Locations · ${nLoc}`]].map(([k,l])=><button key={k} className={kind===k?'on':''} onClick={()=>setKind(k)}>{l}</button>)}</div>
   {err&&<div className="warn">Could not load the gallery: {err}</div>}
   {!ready&&!rows.length&&<p className="mut">Loading…</p>}
   {ready&&!err&&!items.length&&<div className="card"><span className="mut">{proof.length?'Nothing matches this filter.':'No pictures or locations yet. They appear here as soon as someone times in or out with a picture or their location.'}</span></div>}
   {days.map(k=>{const L=items.filter(p=>dayKey(p.ts)===k);
    return <div key={k} style={{marginBottom:14}}>
     <h3 style={{margin:'6px 0 8px',fontSize:15}}>{new Date(L[0].ts).toLocaleDateString([],{weekday:'long',month:'short',day:'numeric',year:'numeric'})}</h3>
     <div className="gal-grid">{L.map(p=>{const cap=<span className="gcap">{first(p.uid)} · {TYPE[p.type]||p.type}<br/>{tm(p.ts)}</span>;
      return p.photo
       ?<button key={p.id} className="gtile" onClick={()=>zoom(p.photo)} aria-label={`${first(p.uid)} ${TYPE[p.type]||''} picture`}><img src={p.photo} loading="lazy" alt=""/>{cap}</button>
       :<a key={p.id} className="gtile gloc" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${p.loc.lat},${p.loc.lng}`}><b>📍</b><small>{(+p.loc.lat).toFixed(4)}, {(+p.loc.lng).toFixed(4)}<br/>tap to open the map</small>{cap}</a>})}</div>
     {L.some(p=>p.note)&&L.filter(p=>p.note).map(p=><div key={p.id} className="pnote">💬 <b>{first(p.uid)}</b>: {p.note}</div>)}
    </div>})}
   {more&&<button className="w" onClick={()=>setLim(lim+STEP)}>Load older ({lim} checked so far)</button>}
   {!more&&ready&&rows.length>0&&<p className="mut" style={{textAlign:'center',marginTop:8}}>That's everything ✓</p>}
  </div></div></div>}
