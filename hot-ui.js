import {HOT_LISTS,fetchHotList,readHotCache,writeHotCache} from './hot-list.js';

export function initHotList(onPick){
 const tabs=document.getElementById('hot-tabs'),grid=document.getElementById('hot-grid'),status=document.getElementById('hot-status');
 let selected=HOT_LISTS[0].id,controller=null,nonce=0;
 let storage;try{storage=window.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{}};}
 function stamp(time){return new Date(time).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});}
 function render(items){
  grid.replaceChildren();
  for(const item of items){
   const card=document.createElement('button');card.type='button';card.className='card hot-card';
   card.setAttribute('aria-label',`搜索 ${item.title}`);
   const poster=document.createElement('div');poster.className='hot-poster';
   const image=document.createElement('img');image.className='poster';image.alt='';image.loading='lazy';image.referrerPolicy='no-referrer';
   if(item.cover||item.alternate)image.src=item.cover||item.alternate;
   image.onerror=()=>{if(item.alternate&&image.src!==item.alternate)image.src=item.alternate;else{image.onerror=null;image.removeAttribute('src');}};
   const rank=document.createElement('span');rank.className='rank';rank.textContent=String(item.rank);
   poster.append(image,rank);
   if(item.rating){const rating=document.createElement('span');rating.className='rating';rating.textContent=`★ ${item.rating}`;poster.append(rating);}
   const title=document.createElement('span');title.className='title';title.textContent=item.title;
   const hint=document.createElement('span');hint.className='meta';hint.textContent='点击搜索片源';
   card.append(poster,title,hint);card.onclick=()=>onPick(item.title);grid.append(card);
  }
 }
 async function load(force=false){
  controller?.abort();const current=controller=new AbortController(),request=++nonce,id=selected;
  for(const tab of tabs.children)tab.setAttribute('aria-pressed',String(tab.dataset.id===id));
  grid.setAttribute('aria-busy','false');
  const cached=readHotCache(storage,id);
  if(cached){render(cached.items);status.textContent=`本机缓存 · 获取于 ${stamp(cached.updated)}`;if(cached.fresh&&!force)return;}
  else{grid.replaceChildren();status.textContent='正在读取热榜…';}
  if(cached)status.textContent+=' · 正在更新…';
  grid.setAttribute('aria-busy','true');
  try{
   const items=await fetchHotList(id,current.signal);if(request!==nonce)return;
   const updated=Date.now();render(items);writeHotCache(storage,id,items,updated);
   status.textContent=`${items.length} 部 · 获取于 ${stamp(updated)}`;
  }catch(error){
   if(request!==nonce||current.signal.aborted)return;
   status.textContent=cached?`暂时无法更新，显示上次成功数据（${stamp(cached.updated)}）。${error.message}`:`热榜加载失败：${error.message}。仍可使用上方搜索。`;
  }finally{if(request===nonce)grid.setAttribute('aria-busy','false');}
 }
 for(const list of HOT_LISTS){const tab=document.createElement('button');tab.type='button';tab.textContent=list.label;tab.dataset.id=list.id;tab.setAttribute('aria-pressed',String(list.id===selected));tab.onclick=()=>{selected=list.id;void load();};tabs.append(tab);}
 document.getElementById('refresh-hot').onclick=()=>void load(true);
 void load();
}
