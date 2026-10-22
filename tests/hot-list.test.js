import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HOT_LISTS,HOT_CACHE_KEY,HOT_TTL,hotItems,readHotCache,writeHotCache,fetchHotList} from '../hot-list.js';
const fixture={code:200,data:[{title:' 测试影片 ',rank:1,rating:8.5,cover:'https://example.com/a.jpg',cover_proxy:'https://example.com/b.jpg'}]};
function storage(){const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};}

test('six categories use fixed movie/TV/show and Baidu endpoints',()=>{assert.equal(HOT_LISTS.length,6);assert.equal(new Set(HOT_LISTS.map(x=>x.id)).size,6);assert.equal(HOT_LISTS.at(-1).path,'/v2/baidu/teleplay');});
test('normalizes titles, validates images, ratings and duplicate titles',()=>{
 const items=hotItems({data:[...fixture.data,{title:'测试影片'},{title:'无海报',rating:99,rank:-1,cover:'javascript:bad'},{title:''},null]});
 assert.equal(items.length,2);assert.equal(items[0].title,'测试影片');assert.equal(items[0].rating,8.5);assert.equal(items[1].cover,undefined);assert.equal(items[1].rating,null);assert.equal(items[1].rank,3);
 for(const raw of [{code:429,data:fixture.data},{data:[]},{data:{}},null])assert.throws(()=>hotItems(raw));
});
test('cache round trip keeps last-success time and detects stale data',()=>{
 const store=storage(),now=Date.now();writeHotCache(store,'movie',hotItems(fixture),now);
 const cached=readHotCache(store,'movie',now+10);assert.equal(cached.fresh,true);assert.equal(cached.items[0].alternate,'https://example.com/b.jpg');assert.equal(cached.updated,now);
 assert.equal(readHotCache(store,'movie',now+HOT_TTL+1).fresh,false);
 assert.equal(readHotCache(store,'movie',now-120000),null);
});
test('invalid or blocked local cache cannot break the homepage',()=>{
 const store=storage();store.setItem(HOT_CACHE_KEY,'not json');assert.equal(readHotCache(store,'movie'),null);
 writeHotCache(store,'movie',hotItems(fixture),Date.now());assert.ok(readHotCache(store,'movie'));
 const blocked={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
 assert.equal(readHotCache(blocked,'movie'),null);assert.doesNotThrow(()=>writeHotCache(blocked,'movie',hotItems(fixture),Date.now()));
});
test('failed first instance falls back to the second, without changing categories',async()=>{
 const seen=[];const items=await fetchHotList('tv_global',undefined,async url=>{seen.push(url);if(seen.length===1)throw new Error('HTTP 429');return fixture;});
 assert.equal(items.length,1);assert.equal(seen.length,2);assert.ok(seen.every(url=>url.endsWith('/v2/douban/weekly/tv_global')));
 await assert.rejects(()=>fetchHotList('unknown',undefined,()=>{throw new Error('should not request');}),/未知榜单/);
});
test('cancelled category change stops fallback requests',async()=>{
 const controller=new AbortController();let calls=0;
 await assert.rejects(()=>fetchHotList('movie',controller.signal,async()=>{calls++;controller.abort();throw new Error('cancelled');}),/cancelled/);
 assert.equal(calls,1);
});
