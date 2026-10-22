import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
test('HTML and manifest assets exist and remain relative to a Pages project path',async()=>{
 const html=await readFile(new URL('index.html',root),'utf8');
 for(const [,url] of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  assert.ok(url.startsWith('./'),url);
  await access(new URL(url,root));
 }
 const manifest=JSON.parse(await readFile(new URL('manifest.webmanifest',root),'utf8'));
 assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
 for(const icon of manifest.icons)await access(new URL(icon.src,root));
});
test('service worker only caches the local shell, excluding video and API traffic',async()=>{
 const sw=await readFile(new URL('sw.js',root),'utf8');
 const raw=sw.match(/const SHELL=(\[[^;]+\]);/)[1];
 const files=JSON.parse(raw.replaceAll("'",'"'));
 for(const file of files){assert.ok(file.startsWith('./'));await access(new URL(file,root));}
 assert.match(sw,/u.origin!==base.origin/);assert.match(sw,/files.includes\(u.href\)/);assert.match(sw,/headers.has\('range'\)/);
});
