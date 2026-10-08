// Light / dark / system theme. Stored per device. index.html also applies it before React loads (no flash).
const K='theme';
export const getTheme=()=>localStorage.getItem(K)||'dark';
export function applyTheme(m=getTheme()){
  const light=m==='light'||(m==='system'&&matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.dataset.theme=light?'light':'dark';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content',light?'#f6f3ff':'#170f2e');
}
export function setTheme(m){localStorage.setItem(K,m);applyTheme(m)}
