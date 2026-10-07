import {useEffect,useRef} from 'react';
import {motion,animate,useDragControls} from 'framer-motion';
import {cyc,cycLabel} from './lib';

// small shared pieces used by App, Fixes and Settings
export const buzz=()=>navigator.vibrate?.(25);
export function Num({v,d=1}){const r=useRef();useEffect(()=>{const c=animate(0,v,{duration:1,ease:'easeOut',onUpdate:x=>r.current&&(r.current.textContent=x.toFixed(d))});return()=>c.stop()},[v]);return <span ref={r}>0</span>}
export const Av=({m})=>m.p?<img className="av" src={m.p} referrerPolicy="no-referrer"/>:<div className="av">{m.n[0]}</div>;
export const Cycle=({off,set,d})=><div className="row sp" style={{marginBottom:12}}><button className="sm" onClick={()=>set(off-1)}>‹</button><b>{cycLabel(cyc(off,d))}</b><button className="sm" onClick={()=>set(off+1)}>›</button></div>;
export const List=({children})=><motion.div initial="h" animate="s" variants={{s:{transition:{staggerChildren:.05}}}}>{children}</motion.div>;
export const Item=({children,className='card'})=><motion.div className={className} variants={{h:{opacity:0,y:16},s:{opacity:1,y:0}}}>{children}</motion.div>;
export function Sheet({close,children}){const dc=useDragControls();
 return <motion.div className="scrim" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={close}>
  <motion.div className="sheet" initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',damping:30,stiffness:320}} drag="y" dragControls={dc} dragListener={false} dragConstraints={{top:0,bottom:0}} dragElastic={{top:0,bottom:.6}} onDragEnd={(_,i)=>i.offset.y>90&&close()} onClick={e=>e.stopPropagation()}>
   <div className="grab" onPointerDown={e=>dc.start(e)}/>{children}</motion.div></motion.div>}
