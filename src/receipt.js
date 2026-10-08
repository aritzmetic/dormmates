// PDF receipts (generated on the device from the receipt data the host saved; jsPDF is loaded only when needed)
const C={bg:[23,15,46],lamp:[255,194,75],peri:[140,145,255],ok:[91,227,168],bad:[255,107,139],ink:[28,20,60],mut:[116,108,158],soft:[244,241,255],line:[222,217,243],amber:[255,244,214],white:[255,255,255]};
const php=n=>'PHP '+(+n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const dt=t=>new Date(t).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});
const dur=h=>{const m=Math.round((+h||0)*60);return `${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}m`};

function page(doc,r,i,n){
 const W=210,L=14,R=196;
 const T=(s,x,y,{size=10,bold=false,color=C.ink,align='left',style}={})=>{doc.setFont('helvetica',style||(bold?'bold':'normal'));doc.setFontSize(size);doc.setTextColor(...color);doc.text(String(s),x,y,{align})};
 const fill=c=>doc.setFillColor(...c),box=(x,y,w,h,c,rd=0)=>{fill(c);rd?doc.roundedRect(x,y,w,h,rd,rd,'F'):doc.rect(x,y,w,h,'F')};

 // ----- brand header -----
 box(0,0,W,38,C.bg);
 doc.setGState(new doc.GState({opacity:.45}));fill([91,63,214]);doc.circle(196,6,30,'F');
  doc.setGState(new doc.GState({opacity:1}));
 box(L,10,12,12,C.lamp,3.2);box(L,19,3.6,3,C.lamp);                    // logo mark
 T('DormMate',L+16,18.5,{size:21,bold:true,color:C.white});
 T("Who's home? Who owes?",L+16,24.5,{size:8,color:[157,147,201]});
 T('BILLING RECEIPT',R,15,{size:10,bold:true,color:C.lamp,align:'right'});
 T('No. '+String(r.cyc).slice(-6)+'-'+String(r.uid).slice(0,4).toUpperCase(),R,21,{size:8,color:[200,193,235],align:'right'});
 T('Issued '+dt(r.issuedAt),R,26.5,{size:8,color:[200,193,235],align:'right'});

 // ----- who / when -----
 let y=49;
 T('BILLED TO',L,y,{size:7.5,bold:true,color:C.mut});T(r.name,L,y+7,{size:16,bold:true});
 T(`${r.space}  |  Host: ${r.host}`,L,y+13,{size:9,color:C.mut});
 T('BILLING PERIOD',112,y,{size:7.5,bold:true,color:C.mut});T(`${dt(r.ps)} to ${dt(r.pe)}`,112,y+6.5,{size:10,bold:true});
 T(`${r.days} days`,112,y+11.5,{size:8.5,color:C.mut});
 T('PAY BY',112,y+19,{size:7.5,bold:true,color:C.mut});T(r.due?dt(r.due):'-',112,y+25,{size:10,bold:true});
 const paid=!!r.paid;box(R-26,y+17,26,8,paid?C.ok:C.lamp,4);T(paid?'PAID':'UNPAID',R-13,y+22.4,{size:8.5,bold:true,color:paid?[6,40,27]:[59,38,0],align:'center'});

 // ----- total card -----
 y=80;box(L,y,R-L,25,C.soft,4);box(L,y,2.6,25,C.lamp);
 T('TOTAL AMOUNT',L+9,y+8,{size:7.5,bold:true,color:C.mut});
 T(php(r.total),L+9,y+19,{size:24,bold:true});
 T('Electricity',R-6,y+7,{size:7.5,bold:true,color:C.mut,align:'right'});T(php(r.eBase+r.eUse),R-6,y+12,{size:10,bold:true,align:'right'});
 T('Water',R-6,y+17,{size:7.5,bold:true,color:C.mut,align:'right'});T(php(r.wBase+r.wUse),R-6,y+22,{size:10,bold:true,align:'right'});

 // ----- computation table -----
 y=114;box(L,y-4.2,1.6,6,C.lamp);T('How your bill was computed',L+5,y,{size:11.5,bold:true});
 const ep=r.nFixed?r.pct:0,cx=[L+3,126,160,R-3];
 y+=6;box(L,y,R-L,8,C.bg,2);
 T('ITEM',cx[0],y+5.3,{size:7.5,bold:true,color:C.white});['ELECTRICITY','WATER','TOTAL'].forEach((h,k)=>T(h,cx[k+1],y+5.3,{size:7.5,bold:true,color:C.white,align:'right'}));
 const rows=[
  ['Bill total',r.elec,r.water,r.elec+r.water],
  [r.nFixed?`Base pool (${ep}% of the bill)`:'Base pool (none selected)',r.poolEBase,r.poolWBase,r.poolEBase+r.poolWBase,r.nFixed?`Split equally among ${r.nFixed} fixed member${r.nFixed>1?'s':''}`:'No fixed members, so 100% is split by hours'],
  ['Your base share',r.eBase,r.wBase,r.eBase+r.wBase,r.inFixed?`Pool / ${r.nFixed}`:'You are not in the fixed group'],
  [`Usage pool (${100-ep}% of the bill)`,r.poolEUse,r.poolWUse,r.poolEUse+r.poolWUse,'Split by hours among everyone'],
  ['Your usage share',r.eUse,r.wUse,r.eUse+r.wUse,`${dur(r.hours)} / ${dur(r.totalHours)} of the usage pool`],
 ];
 y+=8;rows.forEach((row,k)=>{const h=row[4]?12:9;if(k%2)box(L,y,R-L,h,[250,248,255]);
  T(row[0],cx[0],y+(row[4]?5:6),{size:9,bold:k===2||k===4});if(row[4])T(row[4],cx[0],y+9.3,{size:7.3,color:C.mut});
  [1,2,3].forEach(c=>T(php(row[c]).replace('PHP ',''),cx[c],y+(row[4]?5:6),{size:9,align:'right',bold:k===2||k===4}));y+=h});
 box(L,y+1,R-L,11,C.amber,3);box(L,y+1,2.4,11,C.lamp);
 T('YOUR SHARE',cx[0]+2,y+8.2,{size:9.5,bold:true});
 [r.eBase+r.eUse,r.wBase+r.wUse,r.total].forEach((v,c)=>T(php(v).replace('PHP ',''),cx[c+1],y+8.2,{size:c===2?11:9.5,bold:true,align:'right'}));
 y+=22;

 // ----- hours tiles -----
 box(L,y-4.2,1.6,6,C.peri);T('Your time in the dorm',L+5,y,{size:11.5,bold:true});y+=5;
 const pct=r.totalHours?r.hours/r.totalHours*100:100/(r.nAll||1),rateE=r.totalHours?r.poolEUse/r.totalHours:0,rateW=r.totalHours?r.poolWUse/r.totalHours:0;
 [[dur(r.hours),'YOUR HOURS'],[dur(r.totalHours),'EVERYONE\'S HOURS'],[pct.toFixed(1)+'%','YOUR SHARE OF HOURS']].forEach(([v,l],k)=>{const x=L+k*61;box(x,y,60,19,C.soft,3);T(v,x+5,y+9,{size:14,bold:true});T(l,x+5,y+15,{size:7,bold:true,color:C.mut})});
 y+=23;
 T(`Usage rate:  ${php(rateE)} per hour (electricity)   |   ${php(rateW)} per hour (water)`,L,y,{size:8.5,color:C.mut});
 T(`Usage share = your hours / everyone's hours x usage pool.${r.nFixed?' Base share = base pool / fixed members.':''}`,L,y+5,{size:8.5,color:C.mut});
 y+=11;

 // ----- daily bars -----
 T('Your hours, day by day',L,y,{size:9,bold:true});y+=3;
 const d=r.daily||[],mx=Math.max(1,...d),bw=(R-L)/Math.max(d.length,1),base=y+21;
 box(L,y,R-L,25,[250,248,255],3);
 d.forEach((v,k)=>{const h=v/mx*16;if(v>0){fill(C.peri);doc.roundedRect(L+k*bw+.6,base-h-2,Math.max(bw-1.2,.8),h,.6,.6,'F')}
  if(k%5===0)T(new Date(r.ps+k*864e5).getDate(),L+k*bw+bw/2,base+3.2,{size:6.5,color:C.mut,align:'center'})});
 T(`peak ${dur(mx)}`,R-2,y+4,{size:6.8,color:C.mut,align:'right'});

 // ----- footer -----
 doc.setDrawColor(...C.line);doc.line(L,281,R,281);
 T("Cents are rounded so all tenants' shares add up exactly to the bills. Approved time fixes are included. Amounts in PHP.",L,286,{size:7.3,color:C.mut});
 T(`Confidential: visible only to ${r.name} and the host (${r.host}).`,L,290.5,{size:7.3,color:C.mut});
 T('DormMate',R,286,{size:8,bold:true,color:C.ink,align:'right'});T(`Page ${i+1} of ${n}`,R,290.5,{size:7.3,color:C.mut,align:'right'});
}

export async function buildDoc(list){
 const {jsPDF}=await import('jspdf'),doc=new jsPDF({unit:'mm',format:'a4'});
 list.forEach((r,i)=>{if(i)doc.addPage();page(doc,{nAll:list.length,...r},i,list.length)});
 doc.setProperties({title:`DormMate receipt - ${list[0].space}`,author:'DormMate'});
 return doc;
}

// share sheet on phones (works in installed apps), normal download elsewhere
export async function downloadReceipts(list){
 if(!list.length)throw new Error('No receipt data yet.');
 const doc=await buildDoc(list),slug=s=>String(s).replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();
 const name=list.length===1?`receipt-${slug(list[0].name)}-${new Date(list[0].ps).toISOString().slice(0,10)}.pdf`:`receipts-${slug(list[0].space)}-${new Date(list[0].ps).toISOString().slice(0,10)}.pdf`;
 const file=new File([doc.output('blob')],name,{type:'application/pdf'});
 if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:name});return}catch(e){if(e?.name==='AbortError')return}}
 doc.save(name);
}
