export function fullscreenLayout(width,height,videoWidth=16,videoHeight=9){
 const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);
 const rotate=h>w&&videoWidth>=videoHeight;
 return {width:rotate?h:w,height:rotate?w:h,rotate};
}

export function initFullscreen({video,wrap,controls,exitButton,nativeButton,playButton,seek,current,total,rate,mainRate,previous,next,mainPrevious,mainNext,onMessage,env=window,doc=document}){
 let active=false,timer=null,oldControls=true,oldOverflow='',oldRootOverflow='',scroll=[0,0],requestId=0,oldFocus=null,interacting=false;
 function updateLayout(){
  if(!active)return;
  const viewport=env.visualViewport,w=viewport?.width||env.innerWidth,h=viewport?.height||env.innerHeight;
  const box=fullscreenLayout(w,h,video.videoWidth||16,video.videoHeight||9);
  wrap.style.width=box.width+'px';wrap.style.height=box.height+'px';
  wrap.style.left=(Number(viewport?.offsetLeft||0)+w/2)+'px';wrap.style.top=(Number(viewport?.offsetTop||0)+h/2)+'px';
  wrap.style.transform=`translate(-50%,-50%)${box.rotate?' rotate(90deg)':''}`;
  wrap.dataset.landscape=String(box.rotate);
 }
 function clock(seconds){if(!Number.isFinite(seconds)||seconds<0)return '00:00';const n=Math.floor(seconds);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
 function sync(){
  const duration=video.duration,position=video.currentTime;
  const valid=Number.isFinite(duration)&&duration>0;
  seek.disabled=!valid;seek.value=valid?String(Math.round(position/duration*1000)):'0';
  current.textContent=clock(position);total.textContent=valid?clock(duration):'直播';
  playButton.textContent=video.paused?'播放':'暂停';playButton.setAttribute('aria-label',video.paused?'播放视频':'暂停视频');
  rate.value=String(video.playbackRate);mainRate.value=String(video.playbackRate);
  previous.disabled=mainPrevious.disabled;next.disabled=mainNext.disabled;
 }
 function showControls(){
  if(!active)return;clearTimeout(timer);controls.hidden=false;sync();
  if(!interacting&&!video.paused&&!video.ended)timer=setTimeout(()=>{controls.hidden=true;},3500);
 }
 function leave(){
  requestId++;clearTimeout(timer);if(!active)return;active=false;
  wrap.classList.remove('page-fullscreen');delete wrap.dataset.landscape;delete wrap.dataset.systemFullscreen;
  for(const name of ['width','height','left','top','transform'])wrap.style.removeProperty(name);
  controls.hidden=true;video.controls=oldControls;interacting=false;
  wrap.removeAttribute?.('role');wrap.removeAttribute?.('aria-modal');wrap.removeAttribute?.('aria-label');wrap.removeAttribute?.('tabindex');
  doc.body.style.overflow=oldOverflow;doc.documentElement.style.overflow=oldRootOverflow;
  env.scrollTo(scroll[0],scroll[1]);oldFocus?.focus?.({preventScroll:true});
 }
 function enter(){
  if(active){showControls();return;}
  requestId++;active=true;oldControls=video.controls;oldOverflow=doc.body.style.overflow;oldRootOverflow=doc.documentElement.style.overflow;
  scroll=[env.scrollX,env.scrollY];oldFocus=doc.activeElement;video.playsInline=true;video.controls=false;
  wrap.tabIndex=-1;wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','横屏播放器');
  wrap.classList.add('page-fullscreen');doc.body.style.overflow='hidden';doc.documentElement.style.overflow='hidden';
  updateLayout();showControls();wrap.focus?.({preventScroll:true});
 }
 async function systemFullscreen(){
  if(video.readyState<1){onMessage('请先开始播放视频，再打开系统全屏。');return;}
  leave();const token=++requestId;
  if(typeof video.webkitEnterFullscreen==='function'){
   try{video.webkitEnterFullscreen();return;}catch{/* 不支持时继续尝试标准全屏。 */}
  }
  if(typeof video.requestFullscreen==='function'){
   try{await video.requestFullscreen();if(token!==requestId&&doc.fullscreenElement===video)await doc.exitFullscreen?.();return;}catch{/* 系统拒绝时保留网页横屏入口。 */}
  }
  if(token===requestId){enter();onMessage('当前浏览器不支持系统全屏，已使用网页横屏。');}
 }
 async function fullscreen(){
  const wide=env.innerWidth>=900&&env.innerWidth>env.innerHeight;
  const apple=/iPhone|iPad|iPod/.test(env.navigator?.userAgent||'')||(env.navigator?.platform==='MacIntel'&&env.navigator?.maxTouchPoints>1);
  enter();
  if(wide&&!apple&&typeof wrap.requestFullscreen==='function'){
   const token=requestId;
   try{await wrap.requestFullscreen();if(!active||token!==requestId){if(doc.fullscreenElement===wrap)await doc.exitFullscreen?.();}}catch{/* 网页横屏仍然可用。 */}
   updateLayout();
  }
 }
 async function exit(){leave();if(doc.fullscreenElement===wrap)try{await doc.exitFullscreen();}catch{}}
 for(const option of mainRate.options)rate.append(option.cloneNode(true));
 exitButton.onclick=()=>void exit();nativeButton.onclick=()=>void systemFullscreen();
 playButton.onclick=()=>{if(video.paused)video.play().catch(()=>onMessage('请检查视频是否加载成功。'));else video.pause();showControls();};
 seek.oninput=()=>{if(Number.isFinite(video.duration)&&video.duration>0)video.currentTime=Number(seek.value)/1000*video.duration;showControls();};
 rate.onchange=()=>{video.playbackRate=Number(rate.value);showControls();};
 previous.onclick=()=>{mainPrevious.click();sync();showControls();};next.onclick=()=>{mainNext.click();sync();showControls();};
 wrap.addEventListener('pointerdown',event=>{if(!active||event.target.closest('.screen-ui'))return;if(controls.hidden)showControls();else{clearTimeout(timer);controls.hidden=true;}});
 wrap.addEventListener('pointermove',event=>{if(active&&event.pointerType==='mouse')showControls();});
 controls.addEventListener('pointerdown',()=>{interacting=true;showControls();});controls.addEventListener('keydown',showControls);
 for(const name of ['pointerup','pointercancel'])env.addEventListener(name,()=>{if(interacting){interacting=false;showControls();}});
 for(const name of ['timeupdate','durationchange','ratechange','loadedmetadata'])video.addEventListener(name,()=>{sync();if(name==='loadedmetadata')updateLayout();});
 for(const name of ['play','pause','ended'])video.addEventListener(name,showControls);
 env.addEventListener('resize',updateLayout);env.visualViewport?.addEventListener('resize',updateLayout);env.visualViewport?.addEventListener('scroll',updateLayout);
 doc.addEventListener('keydown',event=>{
  if(event.key==='Escape')void exit();
  if(!active)return;
  if(event.key==='Tab'){
   showControls();const targets=[...controls.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')];
   if(targets.length){event.preventDefault();const index=targets.indexOf(doc.activeElement),step=event.shiftKey?-1:1;const next=index<0?(event.shiftKey?targets.length-1:0):(index+step+targets.length)%targets.length;targets[next].focus();}
  }
  if(event.key===' '&&event.target===wrap){event.preventDefault();playButton.click();}
 });
 doc.addEventListener('fullscreenchange',()=>{if(!doc.fullscreenElement&&active&&wrap.dataset.systemFullscreen==='true'){delete wrap.dataset.systemFullscreen;leave();}});
 wrap.addEventListener('fullscreenchange',()=>{if(doc.fullscreenElement===wrap)wrap.dataset.systemFullscreen='true';});
 return {fullscreen,systemFullscreen,exit};
}
