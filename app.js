'use strict';
const $=id=>document.getElementById(id), screens=[$('welcome'),$('game'),$('ending')];
let current=-1, counts=Array(SCENES.length).fill(0), muted=false, selected=false, drag=null, completing=false, toastTimer;
let heard=Array(SCENES.length).fill(false), narrationScene=-1, playAttempt=0;
let newPlayerHold=null;
const audio=$('narration');
const PROGRESS_KEY='cupang-story-puzzle-progress-v1';
function saveProgress(){
 try{localStorage.setItem(PROGRESS_KEY,JSON.stringify({version:1,counts,heard}));}catch(e){}
}
function restoreProgress(){
 try{
  const saved=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'null');
  if(!saved||saved.version!==1||!Array.isArray(saved.counts)||!Array.isArray(saved.heard))return;
  counts=SCENES.map((s,i)=>Number.isInteger(saved.counts[i])?Math.max(0,Math.min(s.pieces.length,saved.counts[i])):0);
  heard=SCENES.map((s,i)=>saved.heard[i]===true&&counts[i]===s.pieces.length);
 }catch(e){}
}

function show(id){cancelNewPlayerHold();screens.forEach(s=>s.hidden=s.id!==id);$('pagesBtn').hidden=id==='ending';if(id!=='game')stopAudio();requestAnimationFrame(fitStage);}
function stopAudio(){playAttempt++;narrationScene=-1;audio.pause();audio.currentTime=0;$('listenBtn').classList.remove('playing');$('listenBtn').setAttribute('aria-label','Listen to this page');$('listenBtn').querySelector('.label').textContent='Listen';}
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3000);}
function isSceneComplete(i){return i>=0&&counts[i]>=SCENES[i].pieces.length;}
function canAdvance(){return isSceneComplete(current)&&heard[current];}
function updateNext(){
 $('nextBtn').disabled=!canAdvance();
 if(!isSceneComplete(current))return;
 $('status').textContent=heard[current]?'Listen again, or turn the page.':muted?'Turn sound on and listen to the story.':'Listen to the whole story to turn the page.';
}
function canChooseScene(i){return heard[i]===true&&isSceneComplete(i);}
function canEnterScene(i){return i===0||canChooseScene(i)||heard.slice(0,i).every((h,j)=>h&&isSceneComplete(j));}

function playAudio(resume=false){
 if(muted){updateNext();toast('Sound is off. Tap the sound button to listen.');return;}
 if(!isSceneComplete(current))return;
 const continuing=resume&&narrationScene===current&&audio.currentTime>0&&!audio.ended;
 if(!continuing){stopAudio();audio.src=SCENES[current].audio;}
 narrationScene=current;updateNext();
 const attempt=++playAttempt, scene=current;
 audio.play().then(()=>{if(attempt!==playAttempt||scene!==current)return;$('listenBtn').classList.add('playing');$('listenBtn').setAttribute('aria-label','Pause narration');$('listenBtn').querySelector('.label').textContent='Pause';}).catch(()=>{if(attempt!==playAttempt)return;updateNext();toast('Tap Listen to hear the whole story.');});
}
audio.onended=()=>{
 $('listenBtn').classList.remove('playing');$('listenBtn').setAttribute('aria-label','Listen to this page');$('listenBtn').querySelector('.label').textContent='Listen';
 // Listening completion is retained for this playthrough, including revisits and replays.
 if(narrationScene===current&&isSceneComplete(current)&&!muted&&!audio.muted&&audio.ended){heard[current]=true;saveProgress();updateNext();}
};
audio.onerror=()=>{if(audio.getAttribute('src')){updateNext();toast('The audio could not load. Tap Listen to try again.');$('listenBtn').classList.remove('playing');}};
function chime(){if(muted)return;try{const ctx=new (window.AudioContext||window.webkitAudioContext)();[523.25,659.25,783.99].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.08;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+.26);});setTimeout(()=>ctx.close(),700);}catch(e){}}
function fitStage(){if($('game').hidden)return;const r=$('stageSpace').getBoundingClientRect(),ratio=2628/1856;const w=Math.max(0,Math.min(r.width-10,(r.height-10)*ratio));$('stage').style.width=w+'px';$('stage').style.height=w/ratio+'px';}
new ResizeObserver(fitStage).observe($('stageSpace'));
window.addEventListener('resize',fitStage);
function renderProgress(){$('progress').replaceChildren(...SCENES.map((s,i)=>{const el=document.createElement('span');el.className=i===current?'active':counts[i]===s.pieces.length?'done':'';return el;}));}
function renderScene(){const s=SCENES[current],n=counts[current],done=n>=s.pieces.length;selected=false;completing=false;
 $('background').src=s.background;$('background').alt=s.title+' picture book scene';$('completed').src=s.completed;$('completed').hidden=!done;$('placedLayer').replaceChildren();
 for(let i=0;i<n;i++){const im=document.createElement('img');im.src=s.pieces[i].overlay;im.className='placed';im.alt='';$('placedLayer').append(im);}
 $('pageNumber').textContent=`SCENE ${String(current+1).padStart(2,'0')} / ${SCENES.length}`;$('sceneTitle').textContent=s.title;$('backBtn').disabled=current===0;
 $('nextBtn').disabled=!canAdvance();$('nextBtn').innerHTML=current===SCENES.length-1?'Finish <span>★</span>':'Next <span>➜</span>';
 $('tray').hidden=done;$('target').hidden=done;$('helpBtn').hidden=done;$('listenBtn').hidden=!done;
 $('pieceCard').classList.remove('selected','dragging');$('target').classList.remove('pulse');
 if(!done){const p=s.pieces[n];$('piece').src=p.image;$('piece').alt=p.name+' mosaic';$('pieceCard').setAttribute('aria-label','Select '+p.name+' mosaic');$('target').setAttribute('aria-label','Place '+p.name+' here');
 const b=p.target;$('target').style.left=b[0]*100+'%';$('target').style.top=b[1]*100+'%';$('target').style.width=b[2]*100+'%';$('target').style.height=b[3]*100+'%';$('target').style.backgroundImage=`url("${p.image}")`;
 $('pieceCount').textContent=`${n+1} of ${s.pieces.length} pieces`;$('instruction').textContent='Drag the piece!';
 $('pieceDots').replaceChildren(...s.pieces.map((p,i)=>{const e=document.createElement('span');e.className=i<n?'done':i===n?'active':'';return e;}));
 $('status').textContent='Or tap the piece, then its place.';
 }else{$('status').textContent='Our picture is complete. Let’s listen!';}
 renderProgress();updateNext();fitStage();
 // Preload the following page, keeping only this and the next scene warm.
 if(current+1<SCENES.length){for(const url of [SCENES[current+1].background,SCENES[current+1].completed]){const im=new Image();im.src=url;}}
}
function openScene(n,listen=true){if(!canEnterScene(n))return;cancelDrag();stopAudio();current=Math.max(0,Math.min(SCENES.length-1,n));show('game');renderScene();if(listen&&counts[current]>=SCENES[current].pieces.length)playAudio();}
function celebrate(){const host=$('celebration');host.replaceChildren();if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;for(let i=0;i<24;i++){const e=document.createElement('i');e.className='confetti';e.style.left=(Math.random()*100)+'%';e.style.background=['#ffcf48','#78bb94','#ef9eb3','#58a8d2'][i%4];e.style.animationDelay=(Math.random()*.25)+'s';host.append(e);}setTimeout(()=>host.replaceChildren(),2000);}
function place(){if(current<0||completing)return;const s=SCENES[current];if(counts[current]>=s.pieces.length)return;counts[current]++;saveProgress();const done=counts[current]===s.pieces.length;renderScene();chime();if(done){celebrate();playAudio();}}
function cancelDrag(){if(drag?.ghost)drag.ghost.remove();drag=null;$('pieceCard').classList.remove('dragging');}
$('pieceCard').addEventListener('pointerdown',e=>{if(e.button!==0)return;const card=$('pieceCard');card.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,ghost:null};});
$('pieceCard').addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7){drag.moved=true;const ghost=new Image();ghost.src=$('piece').src;ghost.className='drag-ghost';ghost.style.width='150px';ghost.style.height='110px';document.body.append(ghost);drag.ghost=ghost;$('pieceCard').classList.add('dragging');}if(drag.ghost){drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';}});
$('pieceCard').addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved;if(moved){const r=$('target').getBoundingClientRect(),sr=$('stage').getBoundingClientRect();const margin=Math.max(28,Math.min(55,sr.width*.05));const hit=e.clientX>=r.left-margin&&e.clientX<=r.right+margin&&e.clientY>=r.top-margin&&e.clientY<=r.bottom+margin;cancelDrag();if(hit)place();else{$('target').classList.add('pulse');$('status').textContent='Try the glowing space.';}}else{cancelDrag();selectPiece();}});
$('pieceCard').addEventListener('pointercancel',cancelDrag);
$('pieceCard').addEventListener('click',e=>{if(e.detail===0)selectPiece();});
function selectPiece(){selected=true;$('pieceCard').classList.add('selected');$('target').classList.add('pulse');$('instruction').textContent='Tap its place!';}
$('target').onclick=()=>{if(selected)place();else{$('target').classList.add('pulse');$('status').textContent='Choose the piece below first.';}};
$('helpBtn').onclick=()=>{$('target').classList.add('pulse');$('status').textContent='Put the piece in the glowing space.';};
$('listenBtn').onclick=()=>{if(!audio.paused){audio.pause();$('listenBtn').classList.remove('playing');$('listenBtn').setAttribute('aria-label','Listen to this page');$('listenBtn').querySelector('.label').textContent='Listen';}else playAudio(true);};
$('nextBtn').onclick=()=>{if(!canAdvance())return;if(current+1<SCENES.length)openScene(current+1);else{stopAudio();show('ending');}};
$('backBtn').onclick=()=>{if(current>0)openScene(current-1);};
$('homeBtn').onclick=$('endingHome').onclick=()=>{cancelDrag();show('welcome');};
$('startBtn').onclick=()=>{openScene(0);if(!muted&&!isSceneComplete(0)){audio.src='assets/00.mp3';audio.play().catch(()=>{});}};
$('againBtn').onclick=()=>{counts.fill(0);heard.fill(false);saveProgress();openScene(0);};
$('soundBtn').onclick=()=>{muted=!muted;audio.muted=muted;if(muted)stopAudio();updateNext();$('soundBtn').style.background=muted?'#f4dfdd':'';$('soundBtn').setAttribute('aria-label',muted?'Turn sound on':'Turn sound off');$('soundBtn').setAttribute('aria-pressed',String(muted));$('soundBtn').querySelector('svg').style.opacity=muted?'.4':'1';toast(muted?'Sound off':'Sound on');};
$('fullBtn').onclick=async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();}else if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();}else{toast('Fullscreen is unavailable in this browser. Use landscape mode.');}}catch(e){toast('Fullscreen is unavailable here. Open the game in a browser tab.');}};
document.addEventListener('fullscreenchange',()=>{$('fullBtn').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');fitStage();});
$('pagesBtn').onclick=()=>{
 $('pagesGrid').replaceChildren(...SCENES.map((s,i)=>{
  const read=canChooseScene(i), b=document.createElement('button');
  b.className='page-choice '+(read?'is-read':'is-locked')+(i===current?' current':'');
  b.disabled=!read;b.setAttribute('aria-label',`Scene ${i+1}: ${s.title}. ${read?'Read — open scene':'Locked — finish the story first'}`);
  const art=document.createElement('span');art.className='page-art';
  const im=new Image();im.src=read?s.completed:s.background;im.alt='';art.append(im);
  const badge=document.createElement('span');badge.className='page-badge';badge.setAttribute('aria-hidden','true');
  badge.innerHTML=read?'<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>':'<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>';
  art.append(badge);
  const label=document.createElement('span');label.className='page-title';label.textContent=(i+1)+'. '+s.title;
  const state=document.createElement('span');state.className='page-state';state.textContent=read?'READ · OPEN':'LOCKED';
  b.append(art,label,state);
  b.onclick=()=>{if(!canChooseScene(i))return;$('pagesDialog').close();openScene(i);};
  return b;
 }));
 $('pagesDialog').showModal();
};
$('closePages').onclick=()=>$('pagesDialog').close();
$('pagesDialog').addEventListener('click',e=>{if(e.target===$('pagesDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio();});

restoreProgress();

// A short tap never resets progress. Support pointer and keyboard holds.
function cancelNewPlayerHold(){
 if(newPlayerHold){cancelAnimationFrame(newPlayerHold.frame);newPlayerHold=null;}
 const button=$('newPlayerBtn');button.classList.remove('is-holding');button.style.setProperty('--hold','0');
 $('newPlayerHint').textContent='Release early to cancel.';
}
function resetForNewPlayer(){
 cancelNewPlayerHold();cancelDrag();stopAudio();counts.fill(0);heard.fill(false);current=-1;saveProgress();
 $('placedLayer').replaceChildren();$('pagesGrid').replaceChildren();show('welcome');
 toast('Ready for a new player!');
}
function startNewPlayerHold(kind,id){
 if($('welcome').hidden||newPlayerHold)return;
 const hold={kind,id,start:performance.now(),frame:0,lastSeconds:null};newPlayerHold=hold;
 $('newPlayerBtn').classList.add('is-holding');
 function tick(now){
  if(newPlayerHold!==hold)return;
  const progress=Math.min(1,(now-hold.start)/3000);
  $('newPlayerBtn').style.setProperty('--hold',String(progress));
  const seconds=Math.max(0,Math.ceil((3000-(now-hold.start))/1000));
  if(seconds!==hold.lastSeconds){$('newPlayerHint').textContent=`Keep holding… ${seconds}s`;hold.lastSeconds=seconds;}
  if(progress>=1){resetForNewPlayer();return;}
  hold.frame=requestAnimationFrame(tick);
 }
 hold.frame=requestAnimationFrame(tick);
}
$('newPlayerBtn').addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();$('newPlayerBtn').setPointerCapture(e.pointerId);startNewPlayerHold('pointer',e.pointerId);});
$('newPlayerBtn').addEventListener('pointermove',e=>{
 if(!newPlayerHold||newPlayerHold.kind!=='pointer'||newPlayerHold.id!==e.pointerId)return;
 const r=$('newPlayerBtn').getBoundingClientRect();
 if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)cancelNewPlayerHold();
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('newPlayerBtn').addEventListener(name,cancelNewPlayerHold);
$('newPlayerBtn').addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)startNewPlayerHold('keyboard',e.key);}});
$('newPlayerBtn').addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();cancelNewPlayerHold();}});
$('newPlayerBtn').addEventListener('blur',cancelNewPlayerHold);
$('newPlayerBtn').addEventListener('contextmenu',e=>e.preventDefault());
$('newPlayerBtn').addEventListener('click',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelNewPlayerHold();});
window.addEventListener('blur',cancelNewPlayerHold);
