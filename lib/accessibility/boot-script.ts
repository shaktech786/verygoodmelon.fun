import { SENSES } from '@/lib/design/tokens'

export const ACCESSIBILITY_STORAGE_KEY = 'verygoodmelon:accessibility:settings'

const THEMES = ['light', 'dark', 'auto']
const TEXT_SIZES = ['default', 'large', 'larger']
const CONTRASTS = ['normal', 'high', 'extra-high']
const SPACINGS = ['standard', 'roomy']

/**
 * Runs before first paint so a saved theme, text size, contrast, sense, spacing or reduced motion never flashes in (entrance animations would otherwise play until hydration) after React mounts;
 * the settings hook re-applies the full settings once it loads.
 */
export const ACCESSIBILITY_BOOT_SCRIPT = `(function(){var d=document.documentElement,s=null;try{s=JSON.parse(localStorage.getItem(${JSON.stringify(ACCESSIBILITY_STORAGE_KEY)})||'null')}catch(e){}
function pick(v,o,f){return o.indexOf(v)>=0?v:f}
var more=false,calm=false;try{more=matchMedia('(prefers-contrast: more)').matches}catch(e){}
try{calm=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
s=s&&typeof s==='object'?s:{};
d.setAttribute('data-theme',pick(s.theme,${JSON.stringify(THEMES)},'auto'));
d.setAttribute('data-text-size',pick(s.textSize,${JSON.stringify(TEXT_SIZES)},'default'));
d.setAttribute('data-contrast',pick(s.contrast,${JSON.stringify(CONTRASTS)},more?'high':'normal'));
d.setAttribute('data-reduce-motion',String(typeof s.reduceMotion==='boolean'?s.reduceMotion:calm));
d.setAttribute('data-sense',pick(s.sense,${JSON.stringify(SENSES)},'gentle'));
d.setAttribute('data-spacing',pick(s.spacing,${JSON.stringify(SPACINGS)},'standard'));})()`
