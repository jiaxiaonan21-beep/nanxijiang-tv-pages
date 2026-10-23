import {test} from 'node:test';
import assert from 'node:assert/strict';
import {categoriesOf,rootOf,pageInfo} from '../library.js';

test('source categories are validated and deduplicated, without omitting supplied genres',()=>{
 const list=categoriesOf([{type_id:1,type_pid:0,type_name:'电影'},{type_id:2,type_pid:1,type_name:'科幻'},{type_id:3,type_pid:1,type_name:'理论片'},{type_id:2,type_name:'重复'},{type_id:'bad',type_name:'错误'},{type_id:4,type_name:''}]);
 assert.equal(list.length,3);assert.equal(list[2].name,'理论片');assert.equal(rootOf(list,'2'),'1');assert.deepEqual(categoriesOf(null),[]);
});
test('nested, orphan and cyclic categories resolve without infinite recursion',()=>{
 const rows=categoriesOf([{type_id:1,type_name:'剧集'},{type_id:2,type_pid:1,type_name:'海外'},{type_id:3,type_pid:2,type_name:'英剧'},{type_id:4,type_pid:99,type_name:'独立'},{type_id:5,type_pid:6,type_name:'A'},{type_id:6,type_pid:5,type_name:'B'}]);
 assert.equal(rootOf(rows,'3'),'1');assert.equal(rootOf(rows,'4'),'4');assert.ok(['5','6'].includes(rootOf(rows,'5')));assert.equal(rootOf(rows,'unknown'),'');
});
test('library pagination retains large source catalogs and rejects invalid counters',()=>{
 assert.deepEqual(pageInfo({pagecount:8305,total:166085}),{pages:8305,total:166085});
 assert.deepEqual(pageInfo({pagecount:Infinity,total:'bad'}),{pages:1,total:null});
 assert.deepEqual(pageInfo({pagecount:0,total:0}),{pages:1,total:0});
});
