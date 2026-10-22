import {fetchData,safeUrl} from './core.js';

export const HOT_LISTS=[
 {id:'movie',label:'电影周榜',path:'/v2/douban/weekly/movie'},
 {id:'tv_chinese',label:'国产剧周榜',path:'/v2/douban/weekly/tv_chinese'},
 {id:'tv_global',label:'海外剧周榜',path:'/v2/douban/weekly/tv_global'},
 {id:'show_chinese',label:'国内综艺',path:'/v2/douban/weekly/show_chinese'},
 {id:'show_global',label:'海外综艺',path:'/v2/douban/weekly/show_global'},
 {id:'baidu_teleplay',label:'百度热播剧',path:'/v2/baidu/teleplay'},
];
export const HOT_CACHE_KEY='nanxijiang-pages-hot-v1',HOT_TTL=30*60*1000;
const BASES=['https://60s.crystelf.top','https://60s.viki.moe'];

export function hotItems(raw){
 if(!raw||!Array.isArray(raw.data)||(raw.code!==undefined&&Number(raw.code)!==200))throw new Error('榜单接口数据异常');
 const seen=new Set();
 const items=raw.data.slice(0,100).flatMap((item,index)=>{
  if(!item||typeof item.title!=='string'||!item.title.trim())return [];
  const title=item.title.trim().slice(0,200);if(seen.has(title))return [];seen.add(title);
  const rating=Number(item.rating),rank=Number(item.rank);
  return [{title,cover:safeUrl(item.cover),alternate:safeUrl(item.cover_proxy),rating:Number.isFinite(rating)&&rating>0&&rating<=10?rating:null,rank:Number.isInteger(rank)&&rank>0&&rank<=1000?rank:index+1}];
 });
 if(!items.length)throw new Error('榜单暂时没有内容');return items;
}
export function readHotCache(storage,id,now=Date.now()){
 try{
  const raw=JSON.parse(storage.getItem(HOT_CACHE_KEY)||'{}')[id];
  if(!raw||!Number.isFinite(raw.updated)||raw.updated<=0||raw.updated>now+60000)return null;
  const items=hotItems({data:raw.items.map(item=>({...item,cover_proxy:item.alternate}))});
  return {items,updated:raw.updated,fresh:now-raw.updated<HOT_TTL};
 }catch{return null;}
}
export function writeHotCache(storage,id,items,updated){
 try{let raw;try{raw=JSON.parse(storage.getItem(HOT_CACHE_KEY)||'{}');}catch{raw={};}
  const next={};for(const list of HOT_LISTS)if(raw?.[list.id])next[list.id]=raw[list.id];
  next[id]={items,updated};storage.setItem(HOT_CACHE_KEY,JSON.stringify(next));
 }catch{/* 排行榜缓存失败不影响浏览和本机观看记录。 */}
}
export async function fetchHotList(id,signal,request=fetchData){
 const list=HOT_LISTS.find(item=>item.id===id);if(!list)throw new Error('未知榜单');
 let lastError;
 for(const base of BASES){
  if(signal?.aborted)throw new Error('操作已取消');
  try{return hotItems(await request(base+list.path,signal,6000));}
  catch(error){lastError=error;if(signal?.aborted)throw error;}
 }
 throw lastError||new Error('热榜加载失败');
}
