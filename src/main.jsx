import React from 'react';import {createRoot} from 'react-dom/client';import App from './App.jsx';import './styles.css';import {applyTheme} from './theme';
applyTheme();matchMedia('(prefers-color-scheme: light)').addEventListener?.('change',()=>applyTheme());
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
createRoot(document.getElementById('root')).render(<App/>);
