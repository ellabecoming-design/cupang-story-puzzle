'use strict';
const $=id=>document.getElementById(id), screens=[$('welcome'),$('game'),$('ending')];
let current=-1, counts=Array(SCENES.length).fill(0), muted=false, selected=false, drag=null, completing=false, toastTimer;
let heard=Array(SCENES.length).fill(false), narrationScene=-1, playAttempt=0;
const audio=$('narration');
function show(id){screens.forEach(s=>s.hidden=s.id!==id);$('pagesBtn').hidden=id==='ending';if(id!=='game')stopAudio();requestAnimationFrame(fitStage);}
function stopAudio(){playAttempt++;narrationScene=-1;audio.pause();audio.currentTime=0;$('listenBtn').classList.remove('playing');$('listenBtn').setAttribute('aria-label','Listen to this page');$('listenBtn').querySelector('.label').textContent='Listen';}
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3000);}
function isSceneComplete(i){return i>=0&&counts[i]>=SCENES[i].pieces.length;}
function canAdvance(){return isSceneComplete(current)&&heard[current]&&!muted;}
function updateNext(){
 $('nextBtn').disabled=!canAdvance();
 if(!isSceneComplete(current))return;
 $('status').textContent=muted?'Turn sound on and listen to the story.':heard[current]?'Listen again, or turn the page.':'Listen to the whole story to turn the page.';
}
function canChooseScene(i){return heard.slice(0,i).every((h,j)=>h&&isSceneComplete(j));}
function playAudio(resume=false){
 if(muted){updateNext();toast('Sound is off. Tap the sound button to listen.');return;}
 if(!isSceneComplete(current))return;
 const continuing=resume&&narrationScene===current&&audio.currentTime>0&&!audio.ended;
 if(!continuing){stopAudio();heard[current]=false;audio.src=SCENES[current].audio;}
 narrationScene=current;updateNext();
 const attempt=++playAttempt, scene=current;
 audio.play().then(()=>{if(attempt!==playAttempt||scene!==current)return;$('listenBtn').classList.add('playing');$('listenBtn').setAttribute('aria-label','Pause narration');$('listenBtn').querySelector('.label').textContent='Pause';}).catch(()=>{if(attempt!==playAttempt)return;updateNext();toast('Tap Listen to hear the whole story.');});
}
audio.onended=()=>{
 $('listenBtn').classList.remove('playing');$('listenBtn').setAttribute('aria-label','Listen to this page');$('listenBtn').querySelector('.label').textContent='Listen';
 // Only the completed page's own uninterrupted, audible narration unlocks Next.
 if(narrationScene===current&&isSceneComplete(current)&&!muted&&!audio.muted&&audio.ended){heard[current]=true;updateNext();}
};
audio.onerror=()=>{if(audio.getAttribute('src')){if(narrationScene===current&&current>=0)heard[current]=false;updateNext();toast('The audio could not load. Tap Listen to try again.');$('listenBtn').classList.remove('playing');}};
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
function openScene(n,listen=true){if(n>current&&!canChooseScene(n))return;cancelDrag();stopAudio();current=Math.max(0,Math.min(SCENES.length-1,n));show('game');renderScene();if(listen&&counts[current]>=SCENES[current].pieces.length)playAudio();}
function celebrate(){const host=$('celebration');host.replaceChildren();if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;for(let i=0;i<24;i++){const e=document.createElement('i');e.className='confetti';e.style.left=(Math.random()*100)+'%';e.style.background=['#ffcf48','#78bb94','#ef9eb3','#58a8d2'][i%4];e.style.animationDelay=(Math.random()*.25)+'s';host.append(e);}setTimeout(()=>host.replaceChildren(),2000);}
function place(){if(current<0||completing)return;const s=SCENES[current];if(counts[current]>=s.pieces.length)return;counts[current]++;const done=counts[current]===s.pieces.length;renderScene();chime();if(done){celebrate();playAudio();}}
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
$('againBtn').onclick=()=>{counts.fill(0);heard.fill(false);openScene(0);};
$('soundBtn').onclick=()=>{muted=!muted;audio.muted=muted;if(muted){if(narrationScene===current&&current>=0&&!audio.ended)heard[current]=false;stopAudio();}updateNext();$('soundBtn').style.background=muted?'#f4dfdd':'';$('soundBtn').setAttribute('aria-label',muted?'Turn sound on':'Turn sound off');$('soundBtn').setAttribute('aria-pressed',String(muted));$('soundBtn').querySelector('svg').style.opacity=muted?'.4':'1';toast(muted?'Sound off':'Sound on');};
$('fullBtn').onclick=async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();}else if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();}else{toast('Fullscreen is unavailable in this browser. Use landscape mode.');}}catch(e){toast('Fullscreen is unavailable here. Open the game in a browser tab.');}};
document.addEventListener('fullscreenchange',()=>{$('fullBtn').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');fitStage();});
$('pagesBtn').onclick=()=>{$('pagesGrid').replaceChildren(...SCENES.map((s,i)=>{const b=document.createElement('button');b.className='page-choice'+(i===current?' current':'');const im=new Image();im.src=s.background;im.alt='';const label=document.createElement('span');label.textContent=(i+1)+'. '+s.title;b.disabled=!canChooseScene(i);if(b.disabled)b.title='Listen to the earlier scenes first';b.append(im,label);b.onclick=()=>{$('pagesDialog').close();openScene(i);};return b;}));$('pagesDialog').showModal();};
$('closePages').onclick=()=>$('pagesDialog').close();
$('pagesDialog').addEventListener('click',e=>{if(e.target===$('pagesDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio();});
