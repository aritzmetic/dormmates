import {initializeApp} from 'firebase/app';import {getAuth,GoogleAuthProvider,setPersistence,browserLocalPersistence} from 'firebase/auth';import {getFirestore} from 'firebase/firestore';
const e=import.meta.env;
export const app=initializeApp({apiKey:e.VITE_FB_API_KEY,authDomain:e.VITE_FB_AUTH_DOMAIN,projectId:e.VITE_FB_PROJECT_ID,appId:e.VITE_FB_APP_ID});
export const auth=getAuth(app),db=getFirestore(app),gp=new GoogleAuthProvider();
setPersistence(auth,browserLocalPersistence).catch(()=>{}); // stay logged in
gp.setCustomParameters({prompt:'select_account'});          // lets people pick/switch accounts
