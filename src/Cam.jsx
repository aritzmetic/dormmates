import {useEffect,useRef,useState} from 'react';

// In-app camera. The FRONT camera preview and the saved picture are both mirrored (like a selfie). The back camera is saved normally.
export default function Cam({onShot,onClose,onFallback}){
 const v=useRef(),st=useRef(),[face,setFace]=useState('user'),[err,setErr]=useState(''),[ready,setReady]=useState(false),[shot,setShot]=useState(null);
 useEffect(()=>{let dead=false;setReady(false);setErr('');
  (async()=>{try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('nocam');
   st.current?.getTracks().forEach(t=>t.stop());
   const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:face},width:{ideal:1280},height:{ideal:960}},audio:false});
   if(dead){s.getTracks().forEach(t=>t.stop());return}
   st.current=s;v.current.srcObject=s;await v.current.play();setReady(true)
  }catch(e){if(!dead)setErr(e?.name==='NotAllowedError'?'Camera permission was denied. Allow the camera for this site, or use your phone camera app instead.':'The in-app camera is not available on this device.')}})();
  return()=>{dead=true;st.current?.getTracks().forEach(t=>t.stop())}},[face]);
 const snap=()=>{const el=v.current,w=el.videoWidth,h=el.videoHeight;if(!w)return;
  const k=720/Math.max(w,h,720),c=document.createElement('canvas');c.width=Math.round(w*k);c.height=Math.round(h*k);const x=c.getContext('2d');
  if(face==='user'){x.translate(c.width,0);x.scale(-1,1)}      // front camera: mirrored, same as the preview
  x.drawImage(el,0,0,c.width,c.height);setShot(c.toDataURL('image/jpeg',.6))};
 return <div className="cam">
  {err?<div className="cam-err"><p>{err}</p><button className="pri w" onClick={onFallback}>Use my phone camera app</button><button className="w" style={{marginTop:8}} onClick={onClose}>Cancel</button></div>
  :shot?<>
   <img className="cam-v" src={shot} alt=""/>
   <div className="cam-bar"><button className="w" onClick={()=>setShot(null)}>Retake</button><button className="pri w" onClick={()=>onShot(shot)}>Use photo</button></div></>
  :<>
   <video ref={v} className="cam-v" playsInline muted style={{transform:face==='user'?'scaleX(-1)':'none'}}/>
   <div className="cam-top"><button className="sm" onClick={onClose}>✕ Close</button><button className="sm" onClick={()=>setFace(face==='user'?'environment':'user')}>🔄 Flip</button></div>
   <div className="cam-bar"><button className="cam-shot" disabled={!ready} onClick={snap} aria-label="Take picture"/></div></>}
 </div>}
