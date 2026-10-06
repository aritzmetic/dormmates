export const fmt=t=>new Date(t).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
export const dur=h=>`${Math.floor(h)}h ${Math.round(h%1*60)}m`;
export const clock=ms=>{const s=Math.max(0,Math.floor(ms/1e3));return[s/3600|0,s/60%60|0,s%60].map(n=>String(n).padStart(2,'0')).join(':')};
export const peso=n=>'₱'+(+n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
// cycle = 14th of previous month -> 13th of current month (end exclusive)
export function cyc(off=0){const n=new Date(),m=n.getMonth()-(n.getDate()<14?1:0)+off;return[+new Date(n.getFullYear(),m,14),+new Date(n.getFullYear(),m+1,14)]}
export const cycLabel=r=>`${new Date(r[0]).toLocaleDateString([],{month:'short',day:'numeric'})} – ${new Date(r[1]-1).toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})}`;
export function hrs(uid,punches,exc,[s,e]){const a=[];let o=null;
 punches.filter(p=>p.uid===uid).sort((x,y)=>x.ts-y.ts).forEach(p=>{if(p.type==='in')o=p.ts;else if(o){a.push([o,p.ts]);o=null}});
 if(o)a.push([o,Date.now()]);
 exc.filter(x=>x.uid===uid&&x.status==='approved').forEach(x=>a.push([x.inTs,x.outTs]));
 a.sort((x,y)=>x[0]-y[0]);const m=[];
 for(const[b,c]of a){const L=m[m.length-1];if(L&&b<=L[1])L[1]=Math.max(L[1],c);else m.push([b,c])}
 return m.reduce((t,[b,c])=>t+Math.max(0,Math.min(c,e)-Math.max(b,s)),0)/36e5}
export const shrink=f=>new Promise(res=>{const im=new Image();im.onload=()=>{const s=360/Math.max(im.width,im.height),c=document.createElement('canvas');c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.6))};im.src=URL.createObjectURL(f)});
