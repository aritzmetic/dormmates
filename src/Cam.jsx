import {useEffect,useRef,useState} from 'react';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// In-app camera with FLASH.
//  - back camera: uses the phone's torch (where the browser supports it, e.g. Android Chrome)
//  - front camera: "screen flash", the screen turns bright white for a moment while the picture is taken
// The front camera preview and the saved picture are mirrored (selfie look); the back camera is saved normally.
export default function Cam({onShot,onClose,onFallback}){
 const v=useRef(),st=useRef(),[face,setFace]=useState('user'),[err,setErr]=useState(''),[ready,setReady]=useState(false),[shot,setShot]=useState(null),
  [flash,setFlash]=useState(localStorage.getItem('camFlash')==='1'),[torch,setTorch]=useState(false),[lit,setLit]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{let dead=false;setReady(false);setErr('');setTorch(false);
  (async()=>{try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('nocam');
   st.current?.getTracks().forEach(t=>t.stop());
   const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:face},width:{ideal:1280},height:{ideal:960}},audio:false});
   if(dead){s.getTracks().forEach(t=>t.stop());return}
   st.current=s;v.current.srcObject=s;await v.current.play();
   setTorch(!!s.getVideoTracks()[0]?.getCapabilities?.().torch);setReady(true)
  }catch(e){if(!dead)setErr(e?.name==='NotAllowedError'?'Camera permission was denied. Allow the camera for this site, or use your phone camera app instead.':'The in-app camera is not available on this device.')}})();
  return()=>{dead=true;st.current?.getTracks().forEach(t=>t.stop())}},[face]);
 const toggleFlash=()=>{const n=!flash;setFlash(n);localStorage.setItem('camFlash',n?'1':'0')};
 const snap=async()=>{const el=v.current,tr=st.current?.getVideoTracks()[0];if(busy||!el?.videoWidth)return;setBusy(true);let tOn=false;
  try{
   if(flash){
    if(face==='user'){setLit(true);await sleep(550)}                                                   // screen flash
    else if(torch&&tr){try{await tr.applyConstraints({advanced:[{torch:true}]});tOn=true;await sleep(550)}catch{}}   // torch
   }
   const w=el.videoWidth,h=el.videoHeight,k=720/Math.max(w,h,720),c=document.createElement('canvas');c.width=Math.round(w*k);c.height=Math.round(h*k);const x=c.getContext('2d');
   if(face==='user'){x.translate(c.width,0);x.scale(-1,1)}      // front camera: mirrored, same as the preview
   x.drawImage(el,0,0,c.width,c.height);setShot(c.toDataURL('image/jpeg',.6))
  }finally{if(tOn){try{await tr.applyConstraints({advanced:[{torch:false}]})}catch{}}setLit(false);setBusy(false)}};
 const noTorch=face==='environment'&&!torch;
 return <div className="cam">
  {err?<div className="cam-err"><p>{err}</p><button className="pri w" onClick={onFallback}>Use my phone camera app</button><button className="w" style={{marginTop:8}} onClick={onClose}>Cancel</button></div>
  :<>
   <video ref={v} className="cam-v" playsInline muted style={{transform:face==='user'?'scaleX(-1)':'none',display:shot?'none':'block'}}/>
   {shot&&<img className="cam-v" src={shot} alt=""/>}
   {lit&&<div className="cam-flash"><span>Hold still…</span></div>}
   {shot?<div className="cam-bar"><button className="w" onClick={()=>setShot(null)}>Retake</button><button className="pri w" onClick={()=>onShot(shot)}>Use photo</button></div>
   :<><div className="cam-top"><button className="sm" onClick={onClose}>✕ Close</button>
      <button className={`sm cam-fl ${flash&&!noTorch?'on':''}`} disabled={noTorch} onClick={toggleFlash} title={noTorch?'This phone does not allow flash for the back camera in a browser':''}>{noTorch?'⚡ No flash':flash?'⚡ Flash on':'⚡ Flash off'}</button>
      <button className="sm" onClick={()=>setFace(face==='user'?'environment':'user')}>🔄 Flip</button></div>
     {flash&&face==='user'&&<div className="cam-hint">Screen flash: the screen lights up when you take the picture</div>}
     <div className="cam-bar"><button className="cam-shot" disabled={!ready||busy} onClick={snap} aria-label="Take picture"/></div></>}</>}
 </div>}
