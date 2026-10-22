export const DATA_KEY='nanxijiang-pages-v1';
export function safeUrl(value){try{const u=new URL(String(value));return u.protocol==='https:'?u.href:undefined;}catch{return undefined;}}
export function apiUrl(base,params){const value=safeUrl(base);if(!value)throw new Error('接口必须是 HTTPS 地址');const u=new URL(value);for(const [k,v] of Object.entries(params))u.searchParams.set(k,String(v));return u.href;}
export function episodesOf(vod){const groups=String(vod.vod_play_url||'').split('$$$').map(g=>g.split('#').map((ep,i)=>{const at=ep.indexOf('$');const raw=at<0?ep:ep.slice(at+1);return {name:at<0?`第 ${i+1} 集`:ep.slice(0,at),url:safeUrl(raw)};}).filter(ep=>ep.url)).filter(g=>g.length);return groups.find(g=>g.some(ep=>/\.m3u8(?:\?|$)/i.test(ep.url)))||groups[0]||[];}
export function sourcesOf(raw){const rows=Array.isArray(raw)?raw:raw?.sources;if(!Array.isArray(rows))throw new Error('JSON 缺少 sources 数组');const seen=new Set();return rows.slice(0,100).flatMap(s=>{const url=safeUrl(s?.url);if(!url||seen.has(url))return [];seen.add(url);return [{name:String(s.name||'未命名片源').slice(0,60),url,enabled:s.enabled!==false}];});}
export function historyOf(raw){if(!Array.isArray(raw))return [];return raw.slice(0,100).flatMap(h=>{if(!h||typeof h.id!=='string'||!Array.isArray(h.episodes))return [];const episodes=h.episodes.slice(0,1500).map((ep,i)=>({name:String(ep?.name||`第 ${i+1} 集`).slice(0,100),url:safeUrl(ep?.url)})).filter(ep=>ep.url);if(!episodes.length)return [];return [{id:h.id.slice(0,500),title:String(h.title||'视频').slice(0,200),source:String(h.source||'').slice(0,60),episodes,index:Math.min(Math.max(0,Math.floor(Number(h.index)||0)),episodes.length-1),position:Math.max(0,Number(h.position)||0),duration:Math.max(0,Number(h.duration)||0),updated:Math.max(0,Number(h.updated)||0)}];});}
export function resumeTarget(position,duration){if(!Number.isFinite(duration)||duration<=0)return 0;return Number.isFinite(position)&&position>0&&position<duration-5?position:0;}
export function timeLabel(seconds){if(!Number.isFinite(seconds)||seconds<0)return '00:00';const n=Math.floor(seconds);return `${Math.floor(n/60).toString().padStart(2,'0')}:${(n%60).toString().padStart(2,'0')}`;}
export async function fetchJson(url,signal,timeout=8000){
 const controller=new AbortController();let timedOut=false;
 const abort=()=>controller.abort();
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeout);
 try{
  let response;
  try{response=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});}
  catch{throw new Error('无法读取片源：可能是跨域限制、DNS、证书或网络连接失败');}
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  try{const json=await response.json();if(!json||!Array.isArray(json.list))throw new Error();return json;}
  catch{throw new Error('接口没有返回兼容的 JSON 列表');}
 }catch(error){if(signal?.aborted)throw new Error('操作已取消');if(timedOut)throw new Error('连接超时');throw error;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
