import {apiUrl,fetchData,fetchJson,safeUrl} from './core.js?v=1.0.4';

export function categoriesOf(raw){
 const seen=new Set();return (Array.isArray(raw)?raw:[]).slice(0,1000).flatMap(row=>{
  const id=String(row?.type_id??'');if(!/^[1-9]\d{0,11}$/.test(id)||seen.has(id)||typeof row.type_name!=='string'||!row.type_name.trim())return [];
  seen.add(id);return [{id,name:row.type_name.trim().slice(0,100),parent:String(row.type_pid??0)}];
 });
}
export function rootOf(categories,id){
 const byId=new Map(categories.map(item=>[item.id,item]));const seen=new Set();let item=byId.get(id);
 while(item&&byId.has(item.parent)&&item.parent!==item.id&&!seen.has(item.parent)){seen.add(item.id);item=byId.get(item.parent);}
 return item?.id||'';
}
export function pageInfo(data){
 const integer=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>=1?Math.min(1000000,Math.floor(Number(value))):fallback;
 return {pages:integer(data.pagecount,1),total:Number.isFinite(Number(data.total))&&Number(data.total)>=0?Math.floor(Number(data.total)):null};
}
export function initLibrary({getSources,onPick,doc=document}){
 const $=id=>doc.getElementById(id),select=$('library-source'),groups=$('library-groups'),children=$('library-children'),grid=$('library-grid'),status=$('library-status'),pager=$('library-pager');
 const states=new Map();let source=null,state=null,controller=null,nonce=0;
 const node=(tag,text)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 function button(label,action){const e=node('button',label);e.type='button';e.onclick=action;return e;}
 function cancel(){nonce++;controller?.abort();controller=null;}
 function renderCategories(){
  groups.replaceChildren();children.replaceChildren();if(!state)return;
  const categories=state.categories,root=state.category?rootOf(categories,state.category):'';
  const roots=[...new Set(categories.map(c=>rootOf(categories,c.id)))];
  const add=(box,label,id,selected)=>{const b=button(label,()=>{state.category=id;state.page=1;renderCategories();void load(false);});b.setAttribute('aria-pressed',String(selected));box.append(b);};
  add(groups,'全部分类','',!state.category);
  for(const id of roots){const category=categories.find(c=>c.id===id);if(category)add(groups,category.name,id,root===id);}
  if(root){const descendants=categories.filter(c=>c.id!==root&&rootOf(categories,c.id)===root);if(descendants.length){add(children,'全部'+(categories.find(c=>c.id===root)?.name||''),root,state.category===root);for(const c of descendants)add(children,c.name,c.id,state.category===c.id);}}
 }
 function renderItems(data){
  grid.replaceChildren();
  for(const vod of data.list.slice(0,100)){
   if(vod?.vod_id===undefined||vod.vod_id===null)continue;
   const currentSource=source,card=button('',()=>onPick(vod,currentSource));card.className='card';
   const image=node('img');image.alt='';image.className='poster';image.loading='lazy';image.referrerPolicy='no-referrer';const pic=safeUrl(vod.vod_pic);if(pic)image.src=pic;image.onerror=()=>{image.onerror=null;image.removeAttribute('src');};
   const title=node('span',String(vod.vod_name||'未命名'));title.className='title';
   const meta=node('span',[vod.type_name,vod.vod_year,vod.vod_remarks].filter(Boolean).join(' · '));meta.className='meta';
   card.append(image,title,meta);grid.append(card);
  }
 }
 function renderPager(pages){
  pager.replaceChildren();pager.hidden=pages<=1;if(pages<=1)return;
  const go=p=>{if(!Number.isInteger(p)||p<1||p>pages){status.textContent=`页码需在 1 至 ${pages} 之间。`;return;}state.page=p;void load(false);};
  for(const [label,p] of [['首页',1],['上一页',state.page-1]]){const b=button(label,()=>go(p));b.disabled=state.page<=1;pager.append(b);}
  const start=Math.max(1,Math.min(state.page-2,pages-4));for(let p=start;p<=Math.min(pages,start+4);p++){const b=button(String(p),()=>go(p));if(p===state.page){b.setAttribute('aria-current','page');b.disabled=true;}pager.append(b);}
  for(const [label,p] of [['下一页',state.page+1],['末页',pages]]){const b=button(label,()=>go(p));b.disabled=state.page>=pages;pager.append(b);}
  const form=node('form');form.className='page-jump';const input=node('input');input.type='number';input.min='1';input.max=String(pages);input.required=true;input.value=String(state.page);input.setAttribute('aria-label','片源库页码');const submit=node('button','跳转');submit.type='submit';form.append(input,submit,node('span',`/ ${pages} 页`));form.onsubmit=e=>{e.preventDefault();go(Number(input.value));};pager.append(form);
 }
 async function load(metadata){
  cancel();if(!source||!state)return;const request=nonce,current=controller=new AbortController(),target=state,selected=source;
  grid.replaceChildren();pager.hidden=true;groups.setAttribute('aria-busy','true');grid.setAttribute('aria-busy','true');status.textContent=`正在读取 ${selected.name}…`;
  try{
   if(metadata){const raw=await fetchData(apiUrl(selected.url,{ac:'list',wd:'',pg:1}),current.signal);if(!Array.isArray(raw?.class)&&!Array.isArray(raw?.list))throw new Error('此接口没有返回兼容的分类或影片列表');if(request!==nonce)return;target.categories=categoriesOf(raw.class);if(target.category&&!target.categories.some(c=>c.id===target.category)){target.category='';target.page=1;}renderCategories();}
   const params={ac:'detail',wd:'',pg:target.page};if(target.category)params.t=target.category;
   const data=await fetchJson(apiUrl(selected.url,params),current.signal);if(request!==nonce)return;
   const info=pageInfo(data);if(target.page>info.pages){target.page=info.pages;void load(false);return;}
   renderItems(data);renderPager(info.pages);target.loaded=true;
   const name=target.categories.find(c=>c.id===target.category)?.name||'全部分类';
   status.textContent=`${selected.name} · ${name} · 第 ${target.page} / ${info.pages} 页${info.total!==null?' · 共 '+info.total+' 条':''}${data.list.length?'':' · 此分类暂无影片'}${target.categories.length?'':'（片源未提供分类，仅展示全部列表）'}`;
  }catch(error){if(request!==nonce||current.signal.aborted)return;target.loaded=false;status.textContent=`${selected.name} 加载失败：${error.message}。可重试或切换片源。`;}
  finally{if(request===nonce){groups.setAttribute('aria-busy','false');grid.setAttribute('aria-busy','false');}}
 }
 function choose(){
  cancel();source=getSources().find(s=>s.url===select.value)||null;
  if(!source){state=null;groups.replaceChildren();children.replaceChildren();grid.replaceChildren();pager.hidden=true;status.textContent='暂无启用的片源，请到设置添加或启用片源。';return;}
  if(!states.has(source.url))states.set(source.url,{categories:[],category:'',page:1,loaded:false});state=states.get(source.url);renderCategories();void load(!state.categories.length);
 }
 function open(){
  const sources=getSources(),selected=source?.url;select.replaceChildren();for(const s of sources){const option=node('option',s.name);option.value=s.url;select.append(option);}select.disabled=!sources.length;
  if(sources.some(s=>s.url===selected))select.value=selected;choose();
 }
 select.onchange=choose;$('library-refresh').onclick=()=>void load(true);
 return {open,cancel};
}
