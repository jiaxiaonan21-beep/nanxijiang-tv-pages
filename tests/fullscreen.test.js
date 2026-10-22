import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fullscreenLayout,initFullscreen} from '../fullscreen.js';

function element(){
 const listeners=new Map(),classes=new Set();
 return {hidden:false,disabled:false,value:'',textContent:'',dataset:{},attrs:{},options:[],style:{removeProperty(key){delete this[key];}},
  classList:{add:key=>classes.add(key),remove:key=>classes.delete(key),contains:key=>classes.has(key)},
  setAttribute(key,value){this.attrs[key]=value;},append(){},
  addEventListener(key,fn){if(!listeners.has(key))listeners.set(key,[]);listeners.get(key).push(fn);},
  emit(key,event={}){for(const fn of listeners.get(key)||[])fn(event);},click(){this.onclick?.();}};
}
function setup({wide=false}={}){
 const keys=['video','wrap','controls','exitButton','nativeButton','playButton','seek','current','total','rate','mainRate','previous','next','mainPrevious','mainNext'];
 const parts=Object.fromEntries(keys.map(key=>[key,element()]));
 Object.assign(parts.video,{videoWidth:1920,videoHeight:1080,readyState:4,duration:120,currentTime:40,playbackRate:1,controls:true,paused:false,ended:false,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}});
 const doc=Object.assign(element(),{body:{style:{overflow:'auto'}},documentElement:{style:{overflow:''}},fullscreenElement:null,async exitFullscreen(){this.fullscreenElement=null;}});
 const env=Object.assign(element(),{innerWidth:wide?1440:375,innerHeight:wide?900:700,scrollX:0,scrollY:200,navigator:{userAgent:wide?'desktop':'iPhone'},scrollTo(x,y){this.restored=[x,y];},visualViewport:Object.assign(element(),{width:wide?1440:375,height:wide?900:700,offsetLeft:0,offsetTop:0})});
 const messages=[];
 return {...parts,doc,env,messages,player:initFullscreen({...parts,doc,env,onMessage:message=>messages.push(message)})};
}
test('landscape content fills a portrait viewport by swapping axes, without stretching video',()=>{
 assert.deepEqual(fullscreenLayout(375,700,1920,1080),{width:700,height:375,rotate:true});
 assert.deepEqual(fullscreenLayout(844,390,1920,1080),{width:844,height:390,rotate:false});
 assert.deepEqual(fullscreenLayout(375,700,1080,1920),{width:375,height:700,rotate:false});
});
test('iPhone page mode does not call the native portrait player; exit restores controls and scroll',async()=>{
 const s=setup();let nativeCalls=0;s.video.webkitEnterFullscreen=()=>{nativeCalls++;};
 await s.player.fullscreen();assert.equal(nativeCalls,0);assert.equal(s.wrap.style.width,'700px');assert.equal(s.wrap.style.height,'375px');assert.match(s.wrap.style.transform,/rotate\(90deg\)/);assert.equal(s.video.controls,false);assert.equal(s.seek.value,'333');
 await s.player.exit();assert.equal(s.video.controls,true);assert.equal(s.wrap.classList.contains('page-fullscreen'),false);assert.equal(s.env.restored[1],200);assert.equal(s.doc.body.style.overflow,'auto');assert.equal(s.video.currentTime,40);
});
test('controls hide during playback and return on tap or pause',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const s=setup();await s.player.fullscreen();
 assert.equal(s.controls.hidden,false);t.mock.timers.tick(3600);assert.equal(s.controls.hidden,true);
 s.wrap.emit('pointerdown',{target:{closest:()=>null}});assert.equal(s.controls.hidden,false);
 s.video.paused=true;s.video.emit('pause');t.mock.timers.tick(4000);assert.equal(s.controls.hidden,false);await s.player.exit();
});
test('page controls seek and change speed; viewport changes recalculate orientation',async()=>{
 const s=setup();await s.player.fullscreen();s.seek.value='500';s.seek.oninput();assert.equal(s.video.currentTime,60);
 s.rate.value='1.5';s.rate.onchange();assert.equal(s.video.playbackRate,1.5);
 s.env.visualViewport.width=844;s.env.visualViewport.height=390;s.env.visualViewport.emit('resize');assert.equal(s.wrap.style.width,'844px');assert.equal(s.wrap.dataset.landscape,'false');await s.player.exit();
});
test('system full screen is an explicit action and preserves playback position',async()=>{
 const s=setup();let called=0;s.video.webkitEnterFullscreen=()=>{called++;};await s.player.fullscreen();await s.player.systemFullscreen();
 assert.equal(called,1);assert.equal(s.video.currentTime,40);assert.equal(s.video.controls,true);assert.equal(s.wrap.classList.contains('page-fullscreen'),false);
});
test('a late desktop fullscreen response cannot trap the page after the user exits',async()=>{
 const s=setup({wide:true});let complete;
 s.wrap.requestFullscreen=()=>new Promise(resolve=>{complete=()=>{s.doc.fullscreenElement=s.wrap;resolve();};});
 const entering=s.player.fullscreen();await s.player.exit();complete();await entering;
 assert.equal(s.doc.fullscreenElement,null);assert.equal(s.wrap.classList.contains('page-fullscreen'),false);
});
