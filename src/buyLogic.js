import {shares} from './lib';

// SHARED BUYS (beta): the maths, kept separate from the screen so it is easy to test.

export const METHODS=[
 {k:'stay',n:'By stay (hours at home)',d:'Each person pays in proportion to the hours they were in the dorm during the period you pick. If nobody has any hours in that period it falls back to an equal split.'},
 {k:'days',n:'By days at home',d:'Each person pays in proportion to the days they were home in the period you pick. A day counts when they were in for 1 hour or more.'},
 {k:'equal',n:'Equal split',d:'Everyone who shares the cost pays the same.'},
 {k:'turn',n:"One person's turn",d:'One person pays for all of it. The suggested person is whoever has paid the least in earlier requests.'},
 {k:'custom',n:'Custom amounts',d:"You type each person's amount yourself."}];
export const METHOD_NAME=Object.fromEntries(METHODS.map(m=>[m.k,m.n]));

const r2=x=>Math.round((+x||0)*100)/100;

// -> {ok, msg, amounts:{uid:₱}, basis:{uid:number}, fallback}
// Cents are shared out with the same largest-remainder maths as the bills, so the shares always add up to the total exactly.
export function splitBuy({method,total,ids,stay={},turn,custom={}}){
 total=r2(total);
 if(method==='turn'){
  if(!turn)return{ok:false,msg:'Pick whose turn it is to pay.',amounts:{},basis:{}};
  return{ok:true,msg:'',amounts:{[turn]:total},basis:{}}}
 if(!ids.length)return{ok:false,msg:'Pick at least one person to share the cost.',amounts:{},basis:{}};
 if(method==='custom'){
  const amounts=Object.fromEntries(ids.map(id=>[id,r2(custom[id])])),left=r2(total-ids.reduce((t,id)=>t+amounts[id],0)),ok=Math.abs(left)<.005;
  return{ok,msg:ok?'':left>0?`₱${left.toFixed(2)} is still not assigned to anyone.`:`The amounts are ₱${(-left).toFixed(2)} over the total.`,amounts,basis:{},left}}
 let w,basis={},fallback=false;
 if(method==='stay'){w=ids.map(id=>+stay[id]?.h||0);basis=Object.fromEntries(ids.map((id,i)=>[id,+w[i].toFixed(4)]))}
 else if(method==='days'){w=ids.map(id=>+stay[id]?.d||0);basis=Object.fromEntries(ids.map((id,i)=>[id,w[i]]))}
 else w=ids.map(()=>1);
 if(!w.some(x=>x>0)){w=ids.map(()=>1);fallback=method==='stay'||method==='days'}
 const s=shares(total,ids,w,[],0);
 return{ok:true,msg:'',amounts:Object.fromEntries(ids.map((id,i)=>[id,r2(s.amounts[i].total)])),basis,fallback}}

// Fairness board built from the requests that were SENT.
//  bought = times they were the one who bought · spent = total of their shares · owes = their unpaid shares · toGet = unpaid shares owed to them as buyer
export function fairness(buys,ids){
 const st=Object.fromEntries(ids.map(id=>[id,{bought:0,spent:0,owes:0,toGet:0}]));
 buys.forEach(b=>{
  if(st[b.buyer])st[b.buyer].bought++;
  Object.entries(b.shares||{}).forEach(([id,a])=>{
   if(!st[id])return;st[id].spent=r2(st[id].spent+a);
   if(id!==b.buyer&&a>0&&!b.paid?.[id]){st[id].owes=r2(st[id].owes+a);if(st[b.buyer])st[b.buyer].toGet=r2(st[b.buyer].toGet+a)}})});
 return st}
// who should go and buy next (fewest times so far), and whose turn it is to pay (has paid the least so far)
export const nextBuyer=(st,ids)=>[...ids].sort((a,b)=>st[a].bought-st[b].bought||st[a].spent-st[b].spent)[0];
export const nextPayer=(st,ids)=>[...ids].sort((a,b)=>st[a].spent-st[b].spent||st[a].bought-st[b].bought)[0];

// ITEM TRACKER: one row per thing the dorm buys (matched by name, so "Rice" and "rice " are the same item).
//  times / total / avg = how often and how much (the buyer's real price is used when they entered one)
//  avgGap = average days between purchases · nextAt = when it will probably run out again · status = 'overdue' | 'soon' | 'ok' | 'new'
export function itemStats(buys,now=Date.now()){
 const m=new Map();
 [...buys].sort((a,b)=>(a.sentAt||0)-(b.sentAt||0)).forEach(b=>{
  const k=String(b.title||'').trim().toLowerCase();if(!k)return;
  const x=m.get(k)||{key:k,times:0,total:0,dates:[]};
  x.times++;x.total=r2(x.total+(+(b.actual>0?b.actual:b.total)||0));x.dates.push(b.sentAt||0);x.last=b;x.title=b.title;x.emoji=b.emoji||x.emoji;m.set(k,x)});
 return [...m.values()].map(x=>{
  const gaps=x.dates.slice(1).map((t,i)=>(t-x.dates[i])/864e5),avgGap=gaps.length?+(gaps.reduce((a,c)=>a+c,0)/gaps.length).toFixed(1):null,lastAt=x.dates.at(-1),
   nextAt=avgGap?lastAt+avgGap*864e5:null,left=nextAt?(nextAt-now)/864e5:null;
  return{...x,avg:r2(x.total/x.times),lastAt,avgGap,nextAt,status:left==null?'new':left<0?'overdue':left<=3?'soon':'ok'}})
 .sort((a,b)=>b.lastAt-a.lastAt)}
