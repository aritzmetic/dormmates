import {auth} from './firebase';

async function call(body){
  const t=await auth.currentUser?.getIdToken();if(!t)throw new Error('Not signed in');
  const r=await fetch('/api/notify',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('Server error '+r.status));return j;
}
// Tell the server to push a notification to the other members. Fire-and-forget: never blocks or breaks the app.
export async function ping(body){try{await call(body)}catch{}}
// Same call, but returns the server's answer (used by "Test server push" in Settings)
export const pingWait=call;
