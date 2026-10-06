import {getMessaging,getToken,isSupported} from 'firebase/messaging';
import {doc,setDoc} from 'firebase/firestore';
import {app,db} from './firebase';

export async function enablePush(uid){
  if(!(await isSupported()))throw new Error('Push is not supported here. On iPhone, add the app to your Home Screen first.');
  const reg=await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const token=await getToken(getMessaging(app),{vapidKey:import.meta.env.VITE_FB_VAPID_KEY,serviceWorkerRegistration:reg});
  if(!token)throw new Error('No push token received.');
  await setDoc(doc(db,'tokens',token),{uid,at:Date.now(),ua:navigator.userAgent.slice(0,120)});
  return token;
}
