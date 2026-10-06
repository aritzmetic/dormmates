export const fmt=t=>new Date(t).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
export const tm=t=>new Date(t).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
export const dur=h=>`${Math.floor(h)}h ${Math.round(h%1*60)}m`;
export const clock=ms=>{const s=Math.max(0,Math.floor(ms/1e3));return[s/3600|0,s/60%60|0,s%60].map(n=>String(n).padStart(2,'0')).join(':')};
export const peso=n=>'₱'+(+n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
export const d2s=t=>new Date(t-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
export const s2d=v=>{const[y,m,d]=v.split('-');return +new Date(y,m-1,d)};
export const dayAt=(s,i)=>{const d=new Date(s);return new Date(d.getFullYear(),d.getMonth(),d.getDate()+i)};
// cycle = 14th of previous month -> 13th of current month (end exclusive)
export function cyc(off=0){const n=new Date(),m=n.getMonth()-(n.getDate()<14?1:0)+off;return[+new Date(n.getFullYear(),m,14),+new Date(n.getFullYear(),m+1,14)]}
export const cycLabel=r=>`${new Date(r[0]).toLocaleDateString([],{month:'short',day:'numeric'})} – ${new Date(r[1]-1).toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})}`;
// 8:00 PM of the day after t
export const dl=t=>{const d=new Date(t);return +new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,20)};
// punches + virtual auto time-ins: after a time out, if the person doesn't confirm they are away between 7:30-8:00 PM, they are timed in at 8:00 PM
export function norm(uid,P,now=Date.now()){const a=P.filter(p=>p.uid===uid&&p.type!=='away').sort((x,y)=>x.ts-y.ts),aw=P.filter(p=>p.uid===uid&&p.type==='away').map(p=>p.ts),o=[];
 for(let i=0;i<a.length;i++){const p=a[i];o.push(p);
  if(p.type==='out'){let D=dl(p.ts);const n=a[i+1];
   while(D<=now){if(n&&n.type==='in'&&n.ts<=D)break;
    if(aw.some(t=>t>=D-18e5&&t<D)){D=dl(D);continue}
    o.push({uid,type:'in',ts:D,auto:true});while(a[i+1]?.type==='in')i++;break}}}
 return o}
export function away(uid,P,now=Date.now()){const l=norm(uid,P,now).at(-1);if(!l||l.type!=='out')return null;
 const aw=P.filter(p=>p.uid===uid&&p.type==='away').map(p=>p.ts);let D=dl(l.ts);while(aw.some(t=>t>=D-18e5&&t<D))D=dl(D);
 return{D,open:now>=D-18e5&&now<D}}
// sessions; an approved fix OVERWRITES any punch session it overlaps
export function pairs(uid,P,X,now=Date.now()){const out=[];let o=null;
 norm(uid,P,now).forEach(p=>{if(p.type==='in')o=p;else if(p.type==='out'&&o){out.push({a:o.ts,b:p.ts,ip:o,op:p});o=null}});
 if(o)out.push({a:o.ts,b:now,ip:o,live:true});
 const fx=X.filter(x=>x.uid===uid&&x.status==='approved');
 return out.filter(s=>!fx.some(x=>s.a<x.outTs&&s.b>x.inTs)).concat(fx.map(x=>({a:x.inTs,b:x.outTs,fix:true})))}
export function iv(uid,P,X,[s,e]){const a=pairs(uid,P,X).map(x=>[x.a,x.b]).sort((x,y)=>x[0]-y[0]),m=[];
 for(const[b,c]of a){const L=m[m.length-1];if(L&&b<=L[1])L[1]=Math.max(L[1],c);else m.push([b,c])}
 return m.map(([b,c])=>[Math.max(b,s),Math.min(c,e)]).filter(([b,c])=>c>b)}
export const hrs=(uid,P,X,r)=>iv(uid,P,X,r).reduce((t,[b,c])=>t+c-b,0)/36e5;
export function daily(ivs,[s,e]){const d=[];for(let i=0;+dayAt(s,i)<e;i++){const a=+dayAt(s,i),z=+dayAt(s,i+1);d.push(ivs.reduce((t,[b,c])=>t+Math.max(0,Math.min(c,z)-Math.max(b,a)),0)/36e5)}return d}
// a session that crosses 12AM of the 14th stays one session; each cycle only counts its own part
export const sessions=(uid,P,X,[s,e])=>pairs(uid,P,X).filter(x=>x.a<e&&x.b>s).map(x=>({...x,uid,ca:Math.max(x.a,s),cb:Math.min(x.b,e),before:x.a<s,after:x.b>e})).sort((x,y)=>y.a-x.a);
export const shrink=f=>new Promise(res=>{const im=new Image();im.onload=()=>{const s=720/Math.max(im.width,im.height,720),c=document.createElement('canvas');c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.6))};im.src=URL.createObjectURL(f)});
