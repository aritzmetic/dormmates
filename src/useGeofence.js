import {useEffect,useRef,useState} from 'react';
import {dist} from './lib';

// Watches the phone's location WHILE THE APP IS OPEN and calls onPrompt('arrived'|'left') when it makes sense to time in / out.
// (Browsers cannot read location in the background. For a closed app, use the phone-automation links in Settings.)
const gap=(k,ms)=>{const t=+localStorage.getItem(k)||0;if(Date.now()-t<ms)return false;localStorage.setItem(k,Date.now());return true};
export default function useGeofence({geo,on,isIn,onPrompt}){
 const [st,setSt]=useState(null),inRef=useRef(isIn),cb=useRef(onPrompt);inRef.current=isIn;cb.current=onPrompt;
 useEffect(()=>{
  if(!geo||!on||!navigator.geolocation){setSt(null);return}
  let prev=null,first=true;
  const ok=pos=>{const{latitude:la,longitude:ln,accuracy:ac}=pos.coords,d=dist(la,ln,geo.lat,geo.lng);
   setSt({d:Math.round(d),ac:Math.round(ac),inside:d<=geo.r,at:Date.now()});
   if(ac>200)return;                                        // too vague to trust
   const inside=prev===true?d<=geo.r+30:d<=geo.r;           // small buffer so GPS jitter at the edge does not flip it back and forth
   if(prev!==inside||first){
    if(inside&&!inRef.current&&gap('geo-in',30*6e4))cb.current('arrived',geo,Math.round(d));
    if(!inside&&inRef.current&&gap('geo-out',60*6e4))cb.current('left',geo,Math.round(d))}
   prev=inside;first=false};
  const bad=e=>setSt({err:e.code===1?'denied':'unavailable'});
  const id=navigator.geolocation.watchPosition(ok,bad,{enableHighAccuracy:true,maximumAge:20000,timeout:60000});
  return()=>navigator.geolocation.clearWatch(id)},[geo?.lat,geo?.lng,geo?.r,on]);
 return st}
