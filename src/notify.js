import {auth} from './firebase';

// Tell the server to push a notification to the other members. Fire-and-forget: never blocks or breaks the app.
export async function ping(body){
  try{
    const t=await auth.currentUser?.getIdToken();if(!t)return;
    await fetch('/api/notify',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify(body)});
  }catch{}
}
