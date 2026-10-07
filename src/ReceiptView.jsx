import {motion} from 'framer-motion';

const php=n=>'PHP '+(+n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const num=n=>(+n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const dt=t=>new Date(t).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});
const dur=h=>{const m=Math.round((+h||0)*60);return `${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}m`};

// In-app receipt viewer: same numbers and layout as the PDF, opens as a full-screen pop-up.
export default function ReceiptView({list,i,setI,paid,onClose,onDownload}){
 const r=list[i],isPaid=paid(r),ep=r.nFixed?r.pct:0,d=r.daily||[],mx=Math.max(1,...d),
  pc=r.totalHours?r.hours/r.totalHours*100:100/list.length,rateE=r.totalHours?r.poolEUse/r.totalHours:0,rateW=r.totalHours?r.poolWUse/r.totalHours:0;
 const rows=[
  ['Bill total',r.elec,r.water,r.elec+r.water],
  [r.nFixed?`Base pool (${ep}% of the bill)`:'Base pool (none selected)',r.poolEBase,r.poolWBase,r.poolEBase+r.poolWBase,r.nFixed?`Split equally among ${r.nFixed} fixed member${r.nFixed>1?'s':''}`:'No fixed members, so 100% is split by hours'],
  ['Your base share',r.eBase,r.wBase,r.eBase+r.wBase,r.inFixed?`Pool ÷ ${r.nFixed}`:'You are not in the fixed group',1],
  [`Usage pool (${100-ep}% of the bill)`,r.poolEUse,r.poolWUse,r.poolEUse+r.poolWUse,'Split by hours among everyone'],
  ['Your usage share',r.eUse,r.wUse,r.eUse+r.wUse,`${dur(r.hours)} / ${dur(r.totalHours)} of the usage pool`,1],
 ];
 return <motion.div className="rv" initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} exit={{opacity:0,y:40}} transition={{type:'spring',damping:30,stiffness:320}}>
  <div className="rvbar">
   <button className="sm" onClick={onClose}>✕ Close</button>
   {list.length>1?<div className="row" style={{gap:8}}><button className="sm" disabled={i===0} onClick={()=>setI(i-1)}>‹</button><span className="mut">{i+1} / {list.length}</span><button className="sm" disabled={i===list.length-1} onClick={()=>setI(i+1)}>›</button></div>:<span/>}
   <button className="pri sm" onClick={()=>onDownload([r])}>⬇ Download PDF</button>
  </div>
  <div className="rvbody"><div className="paper">
   <div className="ph"><div className="row sp"><div className="row" style={{gap:10}}><span className="pmark"/><div><b className="pname">DormMates</b><div className="psub">Who's home? Who owes?</div></div></div>
    <div style={{textAlign:'right'}}><b style={{color:'var(--lamp)',fontSize:12}}>BILLING RECEIPT</b><div className="psub">No. {String(r.cyc).slice(-6)}-{String(r.uid).slice(0,4).toUpperCase()}</div><div className="psub">Issued {dt(r.issuedAt)}</div></div></div></div>
   <div className="pb">
    <div className="row sp" style={{alignItems:'flex-start'}}>
     <div><div className="pl">BILLED TO</div><div className="pwho">{r.name}</div><div className="pm">{r.space} · Host: {r.host}</div></div>
     <span className={`ptag ${isPaid?'paid':''}`}>{isPaid?'PAID':'UNPAID'}</span></div>
    <div className="row sp" style={{marginTop:12,alignItems:'flex-start'}}>
     <div><div className="pl">BILLING PERIOD</div><b style={{fontSize:13}}>{dt(r.ps)} to {dt(r.pe)}</b><div className="pm">{r.days} days</div></div>
     <div style={{textAlign:'right'}}><div className="pl">PAY BY</div><b style={{fontSize:13}}>{r.due?dt(r.due):'-'}</b></div></div>
    <div className="ptotal"><div className="pl">TOTAL AMOUNT</div><div className="pamt">{php(r.total)}</div>
     <div className="row sp pm" style={{marginTop:6}}><span>Electricity <b>{php(r.eBase+r.eUse)}</b></span><span>Water <b>{php(r.wBase+r.wUse)}</b></span></div></div>

    <div className="ph2"><i/>How your bill was computed</div>
    <div className="ptab"><div className="prow phd"><span>ITEM</span><span>ELECTRIC</span><span>WATER</span><span>TOTAL</span></div>
     {rows.map((x,k)=><div key={k} className={`prow ${k%2?'alt':''} ${x[5]?'bold':''}`}><span>{x[0]}{x[4]&&<em>{x[4]}</em>}</span><span>{num(x[1])}</span><span>{num(x[2])}</span><span>{num(x[3])}</span></div>)}
     <div className="prow tot"><span>YOUR SHARE</span><span>{num(r.eBase+r.eUse)}</span><span>{num(r.wBase+r.wUse)}</span><span>{num(r.total)}</span></div></div>

    <div className="ph2"><i style={{background:'var(--peri)'}}/>Your time in the dorm</div>
    <div className="ptiles"><div><b>{dur(r.hours)}</b><span>YOUR HOURS</span></div><div><b>{dur(r.totalHours)}</b><span>EVERYONE'S HOURS</span></div><div><b>{pc.toFixed(1)}%</b><span>YOUR SHARE</span></div></div>
    <p className="pm" style={{marginTop:10}}>Usage rate: {php(rateE)} per hour (electricity) · {php(rateW)} per hour (water)</p>
    <p className="pm">Usage share = your hours ÷ everyone's hours × usage pool.{r.nFixed?' Base share = base pool ÷ fixed members.':''}</p>

    <div className="pl" style={{marginTop:16}}>YOUR HOURS, DAY BY DAY</div>
    <div className="pchart">{d.map((v,k)=><div key={k} className="pcol"><div className="pbar" style={{height:Math.max(v>0?4:0,v/mx*100)+'%'}}/><span>{k%5===0?new Date(r.ps+k*864e5).getDate():''}</span></div>)}</div>
    <p className="pm" style={{marginTop:12,fontSize:11}}>Cents are rounded so all tenants' shares add up exactly to the bills. Approved time fixes are included. Visible only to {r.name} and the host.</p>
   </div></div></div></motion.div>
}
