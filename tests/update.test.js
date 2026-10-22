import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
test('entry, stylesheet and every local module import use the release version',async()=>{
 const version=JSON.parse(await readFile(new URL('package.json',root),'utf8')).version;
 const html=await readFile(new URL('index.html',root),'utf8');
 for(const asset of ['app.js','style.css','vendor/hls.min.js'])assert.ok(html.includes(`./${asset}?v=${version}`),asset);
 for(const file of ['app.js','hot-ui.js','hot-list.js','fullscreen.js']){
  const code=await readFile(new URL(file,root),'utf8');
  for(const [,path] of code.matchAll(/from '(\.\/[^']+)'/g))assert.equal(new URL(path,'https://example.com/project/').searchParams.get('v'),version,`${file}: ${path}`);
 }
 const sw=await readFile(new URL('sw.js',root),'utf8');
 for(const asset of ['app.js','core.js','hot-ui.js','hot-list.js','fullscreen.js','style.css','vendor/hls.min.js'])assert.ok(sw.includes(`./${asset}?v=${version}`));
});
test('all literal DOM IDs referenced by scripts exist in the same release HTML',async()=>{
 const html=await readFile(new URL('index.html',root),'utf8');
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]));
 for(const file of ['app.js','hot-ui.js']){
  const code=await readFile(new URL(file,root),'utf8');
  for(const [,id] of code.matchAll(/(?:\$|getElementById)\('([^']+)'\)/g))assert.ok(ids.has(id),`${file} references missing #${id}`);
 }
 assert.ok(!ids.has('welcome'),'removed legacy section must not be required');
});
async function worker(fetch,cacheMatch){
 const handlers={},opened=[];
 const self={registration:{scope:'https://example.com/project/'},addEventListener:(name,handler)=>{handlers[name]=handler;}};
 const code=await readFile(new URL('sw.js',root),'utf8');
 vm.runInNewContext(code,{self,URL,Request,Response,fetch,caches:{open:async name=>{opened.push(name);return {match:cacheMatch||(()=>undefined),put:async()=>{}};}}});
 return {handlers,opened};
}
test('worker revalidates HTML and does not intercept remote sources or video ranges',async()=>{
 let options;
 const {handlers}=await worker(async(request,init)=>{options=init;return new Response('current HTML');});
 let response;
 handlers.fetch({request:new Request('https://example.com/project/'),respondWith:value=>{response=value;}});
 assert.equal(await (await response).text(),'current HTML');assert.equal(options.cache,'no-cache');
 for(const request of [new Request('https://example.net/api'),new Request('https://example.com/project/movie.mp4',{headers:{Range:'bytes=0-100'}})]){
  handlers.fetch({request,respondWith:()=>assert.fail('must bypass worker')});
 }
});
test('offline fallback is scoped to the current release cache',async()=>{
 const {handlers,opened}=await worker(async()=>{throw new Error('offline');},()=>new Response('current cached HTML'));
 let response;handlers.fetch({request:new Request('https://example.com/project/'),respondWith:value=>{response=value;}});
 assert.equal(await (await response).text(),'current cached HTML');assert.deepEqual(opened,['nanxijiang-pages-1.0.3']);
});
