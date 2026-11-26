(()=>{'use strict';
const $=id=>document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false});
const overlay=$('overlay'),hud=$('hud'),dialog=$('dialog'),toastEl=$('toast'),interEl=$('interaction');
const ORIGINAL_MENU=overlay.innerHTML;
let FLOOR=462;const GRAVITY=1780, FIXED_DT=1/60;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fract=x=>x-Math.floor(x);
const hash=x=>fract(Math.sin(x*129.713+12.543)*43758.5453);
const assetURL=path=>path;
const images={};
const names=[];
for(const who of ['luli','chris'])names.push(`${who}_sheet`);
const portraitMoods={luli:['normal','feliz','pensando','seria','surpresa'],chris:['normal','sorrindo','pensando','irritado','agradecido'],narrator:['serio','feliz','suspirando']};
for(const [who,ms] of Object.entries(portraitMoods))for(const m of ms)names.push(`${who}_${m}`);
for(const npc of ['guardian','apple','melon','strawberry','guard','healer'])names.push('npc_'+npc);
for(const npc of ['guardian','apple','melon','strawberry','guard','healer'])names.push('npc_sheet_'+npc);
for(const enemy of ['plum','lemon','pepper','pumpkin','bat','vine'])names.push('enemy_sheet_'+enemy);
function assetPath(name){
 let m=/^(luli|chris)_sheet$/.exec(name);
 if(m)return `assets/characters/${m[1]}/spritesheet.png`;
 m=/^(luli|chris|narrator)_(.+)$/.exec(name);
 if(m)return m[1]==='narrator'?`assets/narrador/narrador-${m[2]}.png`:`assets/characters/${m[1]}/emotes/${m[1]}-${m[2]}.png`;
 m=/^npc_sheet_(.+)$/.exec(name);if(m)return `assets/npcs/sheets/${m[1]}_sheet.png`;
 m=/^npc_(.+)$/.exec(name);if(m)return `assets/npcs/${m[1]}.png`;
 m=/^enemy_sheet_(.+)$/.exec(name);if(m)return `assets/enemies/sheets/${m[1]}_sheet.png`;
 return name;
}
for(const name of names){const im=new Image(); im.src=assetURL(assetPath(name));images[name]=im;}
const SPRITE_STANDARD={width:64,height:64,anchorX:32,anchorY:61,runFPS:10,idleFPS:3,jumpFrames:4};
// Sprites importados no editor são armazenados no JSON do projeto, sem depender de arquivos avulsos.
let studioSpriteAssets={};let studioHeroOverrides={};
function restoreDefaultHeroSheets(){for(const who of ['luli','chris']){images[who+'_sheet'].src=assetPath(who+'_sheet');}}
function activateStudioSprites(payload){
 studioSpriteAssets=payload.spriteAssets||{};studioHeroOverrides=payload.heroSprites||{};
 for(const [id,asset] of Object.entries(studioSpriteAssets)){
   if(typeof asset?.data!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(asset.data)||asset.data.length>2900000)continue;
   const im=new Image();im.src=asset.data;images['custom_'+id]=im;
 }
 restoreDefaultHeroSheets();
 for(const who of ['luli','chris']){const id=studioHeroOverrides[who];if(id&&images['custom_'+id])images[who+'_sheet']=images['custom_'+id];}
}
function spriteForEntity(kind,type,entity){const key=entity?.spriteId;if(key&&images['custom_'+key])return images['custom_'+key];return images[(kind==='npc'?'npc_sheet_':'enemy_sheet_')+type]}


const ACTORS={luli:'Luli',chris:'Chris',narrator:'Narrador',guardian:'Guardião da Lanterna',apple:'Maçã Sábia',melon:'Melão Conselheiro',strawberry:'Moranguete',guard:'Capitã Pétala',healer:'Alejandra'};
const DIALOG={"intro": [["narrator", "história", "Luli e Chris se perderam durante um passeio. Quando perceberam, já estavam longe de casa, cercados por criaturas estranhas."], ["luli", "surpresa", "Chris... você sabe onde a gente está?"], ["chris", "neutro", "Eu ia perguntar a mesma coisa."], ["luli", "feliz", "Bom, vamos juntos. A gente dá um jeito!"]], "recover": [["chris", "feliz", "Luli! Consegui te trazer de volta!"], ["luli", "feliz", "Obrigada, amor! Vamos continuar juntos."]], "ending": [["narrator", "história", "Depois de oito desafios, os dois derrotaram a abóbora e encontraram o caminho para casa."], ["luli", "feliz", "Conseguimos, amor! Finalmente em casa!"], ["chris", "feliz", "Viu? Juntos a gente dá conta de tudo."], ["luli", "confiante", "Da próxima vez, eu escolho o caminho."], ["chris", "surpresa", "Mas não foi você que escolheu dessa vez?"], ["narrator", "fim", "FIM — O melhor da aventura foi chegar até aqui juntos. ♡"]]};
const LEVELS=window.LULI_CAMPAIGN.levels.map(studioLevel);
// Adapter from the standalone visual level editor (384×320 asset template, 64px frame).
function studioLevel(raw,i){
 const ents=(raw.entities||[]),find=k=>ents.find(e=>e.kind===k);
 const ground=ents.filter(e=>e.kind==='ground').map(e=>[+e.x,(+e.width||64)]).sort((a,b)=>a[0]-b[0]);
 const platforms=ents.filter(e=>e.kind==='platform').map(e=>[+e.x,+e.y,+e.width]);
 const npcs=ents.filter(e=>e.kind==='npc').map(e=>[e.type,+e.x]);
 const enemies=ents.filter(e=>e.kind==='enemy').map(e=>[e.type,+e.x]);
 const gate=find('gate'),check=find('checkpoint'),spawn=find('spawn');
 return {name:String(raw.name||'Fase do Editor').slice(0,80),tag:String(raw.tag||''),width:clamp(+raw.width||2740,480,32000),height:clamp(+raw.height||540,540,2160),theme:Math.min(2,Math.max(0,+raw.theme||0)),ground,platforms,npcs,enemies,checkpoints:ents.filter(e=>e.kind==='checkpoint').map(e=>({id:e.id,x:+e.x,y:+e.y})),checkpoint:check?+check.x:null,checkpointY:check&&Number.isFinite(+check.y)?+check.y:null,gate:gate?+gate.x:null,gateY:gate&&Number.isFinite(+gate.y)?+gate.y:null,spawn:spawn?+spawn.x:95,spawnY:spawn&&Number.isFinite(+spawn.y)?+spawn.y:null,intro:i===0?'intro':null,editorEntities:ents,editorRequiresBoss:!!gate?.requiresBoss};
}
const STATE_KEY='luli_chris_de_volta_para_casa_v1';
let progress={unlocked:0,completed:false,best:0,muted:false};
try{const p=JSON.parse(localStorage.getItem(STATE_KEY)||'null');if(p&&typeof p==='object')progress={...progress,...p}}catch{}
const save=()=>{try{localStorage.setItem(STATE_KEY,JSON.stringify(progress))}catch{}};
progress.unlocked=clamp(Math.floor(Number(progress.unlocked)||0),0,LEVELS.length-1);
let mode='menu',levelIndex=0,level=null, player=null,companion=null,active='luli',luliPresent=true,heart=3,score=0,levelFruit=0;
let puzzle=[], parked=false, duoPress=null;
let checkpointState=null,startState=null,activatedCheckpoints=new Set(),gateRequiresBoss=false,levelStartScore=0;
let storySeen=new Set(),storyCooldown=0;const STORY=window.LULI_STORY||[];
const asSpeech=ls=>speech(...ls.map(l=>[l.speaker,l.mood,l.text]));
let fruits=[],enemies=[],npcList=[],editorEvents=[],particles=[],rescue=null,history=[],lastFrame=0,accumulator=0,clock=0,cameraX=0,cameraY=0;
let checkpointX=90,checkpointY=462,invulnerable=0,coyote=0,jumpBuffer=0,dialogue=[],dialogIndex=0,dialogReturn='playing',dialogAction=null,nearNPC=null,toastClock=0,playerTime=0,finishOnce=false;
let view={w:960,h:540},muted=!!progress.muted,audioCtx=null;
const keys={left:false,right:false,jump:false};
const keySources={left:new Set(),right:new Set(),jump:new Set()},pointerOwners=new Map();let duoOwner=null;
const controlIds={left:'leftBtn',right:'rightBtn',jump:'jumpBtn',interact:'interactBtn',duo:'duoBtn'};
function setInputSource(key,source,down){const sources=keySources[key];if(!sources)return;const before=sources.size>0;if(down)sources.add(source);else sources.delete(source);keys[key]=sources.size>0;if(key==='jump'&&down&&!before)jump();}
function releaseInputs(){for(const set of Object.values(keySources))set.clear();keys.left=keys.right=keys.jump=false;pointerOwners.clear();duoOwner=null;duoEnd(true);for(const id of Object.values(controlIds))$(id).classList.remove('down');}
function syncControls(){const controls=$('touchControls');controls.dataset.mode=mode;const b=$('duoBtn');b.dataset.parked=String(parked);b.dataset.unavailable=String(!luliPresent);$('duoButtonLabel').textContent=parked?'REUNIR':'DUPLA';$('duoHoldFill').style.width=duoPress===null||parked?'0%':Math.round(clamp((performance.now()-duoPress)/600,0,1)*100)+'%';$('interactBtn').dataset.near=String(!!nearNPC);$('interactLabel').textContent=nearNPC?.type==='healer'&&!nearNPC.used?'CURAR':'FALAR';}
const npcText={
 guardian:[['guardian','dica','A luz da minha lanterna aponta o caminho para a ponte! Sigam em frente e pulem sobre as criaturas para espantá-las.'],['chris','surpreso','Você sabe como podemos voltar para casa?'],['guardian','feliz','Sigam juntos, e logo encontrarão o caminho de casa.']],
 apple:[['apple','dica','Frutas brilhantes recuperam sua energia. Junte 12 para ganhar um coração, se precisar.'],['apple','dica','E os monstrinhos só podem ser derrotados pulando bem em cima deles. Nada de encostar de lado!']],
 melon:[['melon','dica','Esta é a Ponte Prismática, o último caminho para casa.'],['melon','dica','A Abóbora Casca-Dura precisa de vários pulos na cabeça. Não é das mais amigáveis...']],
 strawberry:[['strawberry','feliz','Luli! Chris! Que bom encontrar vocês! O bosque é perigoso.'],['luli','surpresa','Obrigada pelo aviso!'],['strawberry','dica','Cuidado com os limões elétricos e as pimentas saltitantes!']],
 guard:[['guard','dica','Atenção, viajantes! As frutas hostis tomaram conta da ponte.'],['guard','dica','A Capitã Pétala recomenda usar os saltos e evitar a investida das ameixas.']],
 healer:[['healer','feliz','Oi, queridos! Posso curar os machucados com minhas flores mágicas.'],['healer','dica','E, se a Luli desaparecer, posso ajudar a trazê-la de volta uma vez nesta fase.']]
};
function speech(){return [...arguments].map(a=>({who:a[0],mood:a[1],text:a[2]}))}
function beep(f=600,d=.09,wave='sine',vol=.045,slide=0){if(muted)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;if(!audioCtx)audioCtx=new A;if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=wave;o.frequency.setValueAtTime(f,audioCtx.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(80,f+slide),audioCtx.currentTime+d);g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.0005,audioCtx.currentTime+d);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d+.01)}catch{}}
function chime(){beep(700,.1,'sine',.045,350);setTimeout(()=>beep(1050,.13,'sine',.035,230),95)}
function toast(s,dur=2.8){toastEl.textContent=s;toastEl.classList.add('shown');toastClock=dur}
function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));view.h=540;view.w=clamp(540*r.width/Math.max(1,r.height),320,1700);ctx.setTransform(canvas.width/view.w,0,0,canvas.height/view.h,0,0);ctx.imageSmoothingEnabled=true}
window.addEventListener('resize',resize);if(window.ResizeObserver)new ResizeObserver(resize).observe(canvas);
function groundAt(x){return level.ground.some(([gx,w])=>x>=gx+10&&x<gx+w-10)}
function safeX(x){let v=clamp(x,45,level.width-150);if(groundAt(v))return v;for(let d=8;d<240;d+=8){if(groundAt(v+d))return v+d;if(groundAt(v-d))return v-d}return 120}
function makeObjects(){parked=false;duoPress=null;puzzle=(level.editorEntities||[]).filter(o=>LuliPuzzles.kinds.includes(o.kind)).map(o=>{const n=LuliPuzzles.normalize(o,level.width,level.height||540);return {...n,w:n.width,h:n.height,homeX:n.x,homeY:n.y,vy:0,onGround:false,open:false,pressed:false}});fruits=[];enemies=[];npcList=[];editorEvents=[];particles=[];rescue=null;history=[];levelFruit=0;
 if(!level.editorEntities){
 for(const [gx,w] of level.ground)for(let x=gx+170;x<gx+w-85;x+=100){if(Math.abs(x-level.gate)<120)continue;fruits.push({x,y:FLOOR-42-hash(x)*15,found:false,type:Math.floor(hash(x*.2)*4),phase:x*.02})}
 for(const [x,y,w] of level.platforms){fruits.push({x:x+w*.45,y:y-32,found:false,type:Math.floor(hash(x*2)*4),phase:x*.03});if(w>158)fruits.push({x:x+w*.76,y:y-32,found:false,type:Math.floor(hash(x*2.3)*4),phase:x*.024})}
 }
 if(level.editorEntities){for(const f of level.editorEntities.filter(o=>o.kind==='fruit'))fruits.push({x:f.x,y:f.y,found:false,type:0,phase:0,value:f.value||1});editorEvents=level.editorEntities.filter(o=>o.kind==='event').map(o=>({...o,used:false}));}
 enemies=level.enemies.map(([type,x],i)=>{const boss=type==='pumpkin';const data=level.editorEntities?.find(o=>o.kind==='enemy'&&o.type===type&&Math.abs(o.x-x)<1);return {type,x,home:x,homeY:data?.y,y:type==='bat'?FLOOR-126:type==='pepper'?FLOOR-58:type==='vine'?FLOOR-58:boss?FLOOR-80:FLOOR-49,w:boss?85:type==='bat'?61:type==='vine'?67:50,h:boss?80:type==='bat'?54:type==='vine'?59:type==='pepper'?55:48,phase:i*.8,dir:i%2?1:-1,range:boss?55:70+hash(i+10)*35,hp:Number.isInteger(data?.hp)&&data.hp>0?data.hp:(boss?3:1),ai:data?.ai||null,spriteId:data?.spriteId||'',alive:true,stun:0,attack:0}});
 const world=enemyWorld();for(const e of enemies)LuliEnemies.initialize(e,world);
 npcList=level.npcs.map(([type,x])=>({type,x,used:false,phase:hash(x)*10,studio:level.editorEntities?.find(o=>o.kind==='npc'&&o.type===type&&Math.abs(o.x-x)<1)}));
}
function otherHero(){return active==='luli'?'chris':'luli'}
function bodyAt(x,y,face=1){return {x,y,w:39,h:65,vx:0,vy:0,onGround:false,face,anim:0,landTimer:0,talkTimer:0,airJump:false};}
function surfaces(){return [...level.ground.map(([x,w])=>({x,y:FLOOR,w,h:120})),...level.platforms.map(([x,y,w])=>({x,y,w,h:12})),...puzzle.filter(o=>o.kind==='plate')];}
function solids(except){return [...puzzle.filter(o=>o!==except&&(o.kind==='solid'||o.kind==='crate'||(o.kind==='door'&&!o.open))),...level.ground.map(([x,w])=>({x,y:FLOOR,w,h:120}))];}
function enemyWorld(){return {width:level.width,height:level.height||540,floor:FLOOR,solids:solids(),surfaces:surfaces()};}
function clearBody(b){return b.x>=1&&b.x+b.w<=level.width&&b.y>=0&&b.y+b.h<=(level.height||540)&&!solids().some(o=>LuliPuzzles.overlap(b,o));}
function nearbyBody(x,y,face){for(const dy of [0,-16,-32,-64,-96])for(const dx of [0,-48,48,-96,96]){const b=bodyAt(clamp(x+dx,1,level.width-39),y+dy,face);if(clearBody(b)&&!LuliPuzzles.overlap(b,player))return b;}return null;}
function safeReunion(){
 const pair=pairAt(player,!!player.onGround)||pairAt(player,false);
 if(!pair)return null;
 const b=pair.companion;b.onGround=supported(b);b.airJump=!b.onGround;b.vx=0;b.vy=0;return b;
}
function recall(){
 const b=safeReunion();if(!b){toast('Sem espaço para chamar o companheiro.');return false;}
 companion=b;parked=false;history=[];spawnBurst(b.x+19,b.y+28,'#bde9ff',12);toast('Dupla reunida!');return true;
}
function duoStart(){if(mode==='playing'&&luliPresent&&companion&&duoPress===null)duoPress=performance.now();}
function duoEnd(cancel=false){
 if(duoPress===null)return;const held=performance.now()-duoPress;duoPress=null;
 if(cancel||mode!=='playing'||!luliPresent||!companion)return;
 if(parked){recall();return;}
 if(!clearBody(companion)||LuliPuzzles.overlap(companion,player)){
  const b=safeReunion();if(!b){toast('Sem espaço seguro para a dupla.');return;}companion=b;
 }
 if(held>=600){
  companion.vx=0;companion.vy=0;companion.onGround=supported(companion);companion.airJump=!companion.onGround;parked=true;history=[];
  toast(otherHero()+' aguardando aqui. Q para chamar.');return;
 }
 const old=player;player=companion;companion=old;active=otherHero();
 player.onGround=supported(player);player.airJump=!player.onGround;player.vx=0;player.vy=clamp(player.vy||0,-735,900);
 if(player.onGround)player.vy=0;
 coyote=player.onGround?.10:0;jumpBuffer=0;history=[];
 toast(active==='luli'?'Luli • salto duplo':'Chris • empurrar caixas');
}
function animateBody(b,dt,wasGrounded){
 b.landTimer=Math.max(0,(b.landTimer||0)-dt);b.talkTimer=Math.max(0,(b.talkTimer||0)-dt);
 if(b.onGround&&!wasGrounded)b.landTimer=.15;
 const state=!b.onGround?'jump':b.landTimer>0?'landing':b.talkTimer>0?'talk':Math.abs(b.vx)>30?'run':'idle';
 if(b.animState!==state){b.animState=state;b.anim=0;}
 b.anim=(b.anim||0)+dt*(state==='run'?10:state==='talk'?4:3);
}
function followCompanion(dt){
 if(!luliPresent||!companion||parked)return;
 const b=companion,oldX=b.x,oldY=b.y,wasGrounded=!!b.onGround;
 history.unshift({x:player.x,y:player.y,face:player.face,ground:player.onGround});
 if(history.length>32)history.pop();
 const target=history[Math.min(history.length-1,11)];
 const moving=Math.abs(player.vx)>15||Math.abs(target.x-player.x)>12;
 const desired=clamp(target.x-(moving?0:player.face*56),1,level.width-b.w);
 const blocks=solids(),P=LuliPuzzles;
 // A delayed replay keeps the cooperative double jump possible, but never
 // moves through a solid, closed door, or crate.
 P.sweep(b,clamp((desired-b.x)*12,-380,380)*dt,'x',blocks);
 const dy=clamp((target.y-b.y)*12,-850,850)*dt;
 P.moveY(b,dy,blocks,surfaces());
 b.x=clamp(b.x,1,level.width-b.w);b.y=Math.max(0,b.y);
 b.vx=(b.x-oldX)/dt;b.vy=(b.y-oldY)/dt;
 b.onGround=supported(b);b.airJump=!b.onGround;
 if(Math.abs(b.vx)>15)b.face=Math.sign(b.vx);else b.face=target.face;
 animateBody(b,dt,wasGrounded);
 // Repair only when the assist is invalid, not merely separated by a puzzle.
 if(!clearBody(b)||b.y>(level.height||540)+80){
  const replacement=safeReunion();if(replacement){companion=replacement;history=[];}
 }
}
function movePuzzles(dt){const P=LuliPuzzles;for(const c of puzzle.filter(o=>o.kind==='crate')){c.vy=Math.min(1000,c.vy+GRAVITY*dt);P.moveY(c,c.vy*dt,[...solids(c),player,...(parked&&companion?[companion]:[])],surfaces());if(c.y>(level.height||540)+80){c.x=c.homeX;c.y=c.homeY;c.vy=0;}}if(parked&&companion){const was=companion.onGround;companion.vy=Math.min(1000,companion.vy+GRAVITY*dt);P.moveY(companion,companion.vy*dt,solids(),surfaces());companion.vx=0;animateBody(companion,dt,was);if(companion.y>(level.height||540)+80)recall();}}
function moveHeroX(dx){const P=LuliPuzzles;const blocks=solids();const r=P.sweep(player,dx,'x',blocks);if(r.hit?.kind==='crate'&&active==='chris'){const crate=r.hit;const remaining=dx-r.travel;const pushed=P.sweep(crate,remaining,'x',[...solids(crate),...(parked&&companion?[companion]:[]),{x:-1000,y:-10000,w:1000,h:20000},{x:level.width,y:-10000,w:1000,h:20000}]);P.sweep(player,pushed.travel,'x',solids());}player.x=clamp(player.x,1,level.width-player.w);}
function startLevel(ix,keepHearts=false){levelStartScore=score;checkpointState=null;startState=null;activatedCheckpoints=new Set();levelIndex=ix;level=LEVELS[ix];gateRequiresBoss=level.editorRequiresBoss;FLOOR=(level.height||540)-78;mode='playing';active='luli';luliPresent=true;heart=keepHearts?Math.min(3,heart+1):3;
 player={x:level.spawn??95,y:Math.max(0,(level.spawnY??FLOOR)-65),vx:0,vy:0,w:39,h:65,onGround:true,face:1,anim:0,landTimer:0,talkTimer:0};companion=bodyAt(Math.max(1,player.x-50),player.y,1);
 cameraX=clamp(player.x-view.w*.35,0,Math.max(0,level.width-view.w));cameraY=clamp(player.y-view.h*.55,0,Math.max(0,(level.height||540)-view.h));checkpointX=level.spawn??95;checkpointY=level.spawnY??FLOOR;invulnerable=0;finishOnce=false;nearNPC=null;coyote=.1;jumpBuffer=0;playerTime=0;makeObjects();
 overlay.classList.add('hidden');hud.classList.remove('hidden');$('rescueBanner').classList.add('hidden');$('bossHud').classList.add('hidden');interEl.classList.add('hidden');
 releaseInputs();storySeen=new Set();storyCooldown=1.2;const initial=safeStartPair();player=initial.player;companion=initial.companion;for(const b of [player,companion]){b.onGround=supported(b);b.airJump=!b.onGround;}cameraX=clamp(player.x-view.w*.35,0,Math.max(0,level.width-view.w));cameraY=clamp(player.y-view.h*.55,0,Math.max(0,level.height-view.h));startState=captureState('start',initial);updateHUD();const opening=STORY[ix]?.intro;if(opening?.length)showDialogue(asSpeech(opening));else if(level.intro)showDialogue(speech(...DIALOG[level.intro]));else toast(level.name+' • '+level.tag,3);
}
function updateHUD(){if(!level)return;$('levelText').textContent=(levelIndex+1)+'. '+level.name;$('duoText').textContent=active.toUpperCase();$('duoStatus').textContent=!luliPresent?'Sozinho • resgate Luli':parked?otherHero()+' aguarda':'Dupla reunida';$('duoText').parentElement.parentElement?.dataset&&($('duoText').parentElement.parentElement.dataset.active=active);
 const status=$('duoDot').parentElement;status.classList.toggle('rescuing',!luliPresent);if(status.dataset)status.dataset.active=active;$('heartText').textContent='♥ '.repeat(heart).trim()+' ♡'.repeat(3-heart);
 $('fruitText').textContent=levelFruit;const advance=Math.round(clamp((player.x-(level.spawn??95))/Math.max(1,(level.gate??level.width)-(level.spawn??95)),0,1)*100);$('progressFill').style.width=advance+'%';const meter=$('phaseProgress');if(meter.setAttribute)meter.setAttribute('aria-valuenow',String(advance));$('objectiveText').textContent=!luliPresent?'Resgate Luli':bossBlocksPortal()?'Derrote o guardião':parked?'Reúna a dupla para o portal':'Alcance o portal';
 $('rescueBanner').classList.toggle('hidden',luliPresent);const boss=enemies.find(e=>e.type==='pumpkin'&&e.alive);$('bossHud').classList.toggle('hidden',!boss||Math.abs(player.x-boss.x)>650);if(boss){$('bossHearts').textContent='♥ '.repeat(boss.hp).trim()+'  '+boss.hp+'/'+boss.maxHp;$('bossFill').style.width=Math.round(LuliEnemies.healthRatio(boss)*100)+'%';}
}
function showDialogue(lines,returnTo='playing',after=null){if(!lines?.length)return;releaseInputs();jumpBuffer=0;if(player)player.talkTimer=.5;dialogue=lines;dialogIndex=0;dialogReturn=returnTo;dialogAction=after;mode='dialog';dialog.classList.remove('hidden');interEl.classList.add('hidden');renderDialogue()}
const moods={sorrindo:'♥',agradecido:'♥',pensando:'?',seria:'✦',serio:'✦',irritado:'!',suspirando:'…',feliz:'♥',surpresa:'!',surpreso:'!',dica:'✧',história:'✦',confiante:'★',preocupado:'?',determinado:'⚡',fim:'♡'};
const normalizeMood=m=>String(m||'normal').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
function renderDialogue(){const d=dialogue[dialogIndex];if(!d)return;if(player)player.talkTimer=d.who===active?.5:0;if(companion)companion.talkTimer=d.who===otherHero()?.5:0;
 $('dialogSpeaker').textContent=npcList.find(n=>n.type===d.who&&n.studio?.customName)?.studio.customName||ACTORS[d.who]||d.who;$('dialogMood').textContent=d.mood;$('dialogText').textContent=d.text;$('emotionSticker').textContent=moods[d.mood]||'✦';
 const im=$('dialogPortrait');const who=d.who;dialog.dataset.speaker=who;const mood=normalizeMood(d.mood);const map={luli:{neutro:'normal',sorrindo:'feliz',agradecido:'feliz',preocupado:'pensando',preocupada:'pensando',confiante:'feliz',determinado:'seria',serio:'seria',irritado:'seria',surpreso:'surpresa'},chris:{neutro:'normal',feliz:'sorrindo',confiante:'sorrindo',surpresa:'pensando',surpreso:'pensando',preocupado:'pensando',preocupada:'pensando',serio:'normal',seria:'normal',determinado:'normal'},narrator:{historia:'serio',dica:'serio',fim:'feliz',neutro:'serio',normal:'serio'}};
 const chosen=portraitMoods[who]?.includes(mood)?mood:(map[who]?.[mood]|| (who==='narrator'?'serio':'normal'));
 const src=portraitMoods[who]?assetPath(who+'_'+chosen):assetPath('npc_'+who);
 const fallback=who==='narrator'?'serio':'normal';im.onerror=()=>{im.onerror=null;if(portraitMoods[who]&&chosen!==fallback)im.src=assetPath(who+'_'+fallback);else im.style.visibility='hidden';};im.style.visibility='visible';im.src=assetURL(src);im.alt=`Retrato de ${ACTORS[who]||who}`;
 const box=im.parentElement;box.style.background=d.mood==='preocupado'?'radial-gradient(circle at 50% 30%,#65799e,#3a2f63 78%)':'radial-gradient(circle at 50% 30%,#a4799a,#4a3264 78%)';beep(500,.035,'sine',.025,120);
}
function nextDialogue(){if(mode!=='dialog')return;dialogIndex++;if(dialogIndex<dialogue.length){renderDialogue();return}dialog.classList.add('hidden');if(player)player.talkTimer=0;if(companion)companion.talkTimer=0;const cb=dialogAction;dialogAction=null;mode=dialogReturn;if(cb)cb();if(mode==='playing')storyCooldown=1.2;if(mode==='won')showEndingPanel()}
function showMenu(){releaseInputs();mode='menu';dialog.classList.add('hidden');hud.classList.add('hidden');overlay.classList.remove('hidden');overlay.innerHTML=ORIGINAL_MENU;
 $('rescueBanner').classList.add('hidden');$('bossHud').classList.add('hidden');interEl.classList.add('hidden');toastEl.classList.remove('shown');const cont=$('continueBtn');if(progress.unlocked>0){cont.classList.remove('hidden');cont.textContent=`Continuar • fase ${progress.unlocked+1}`;}const status=$('campaignStatus');if(status)status.textContent=progress.completed?'Aventura concluída • 8/8':`${Math.min(progress.unlocked,7)} de 8 fases concluídas`;}
function panel(kicker,title,description,buttons){overlay.classList.remove('hidden');overlay.innerHTML=`<div class="overlay-bg-stars"></div><section class="menu-panel"><div class="menu-eyebrow">${kicker}</div><h1>${title}</h1><p class="menu-description" style="max-width:510px;font-size:15px;margin:16px auto 20px">${description}</p><div class="menu-buttons">${buttons.map((b,i)=>`<button class="${i?'secondary-btn':'primary-btn'}" data-action="${b.action}">${b.label}</button>`).join('')}</div></section>`}
function pause(){if(mode!=='playing')return;releaseInputs();mode='paused';panel('✦ A JORNADA PODE ESPERAR','Pausa','Luli e Chris estão esperando para continuar a aventura.',[{action:'resume',label:'▶ CONTINUAR'},{action:'restart',label:'RECOMEÇAR A FASE'},{action:'menu',label:'MENU PRINCIPAL'}])}
function resume(){if(mode!=='paused')return;overlay.classList.add('hidden');mode='playing'}
function gameOver(){mode='gameover';releaseInputs();beep(250,.35,'triangle',.09,-160);panel('✦ O CAMINHO AINDA EXISTE','Tente de novo!',checkpointState?'Os três corações acabaram. Retorne ao último checkpoint ou recomece a fase.':'Os três corações acabaram. Recomece esta fase.',[...(checkpointState?[{action:'checkpoint',label:'↻ VOLTAR AO CHECKPOINT'}]:[]),{action:'restart',label:checkpointState?'RECOMEÇAR A FASE':'↻ TENTAR NOVAMENTE'},{action:'menu',label:'VOLTAR AO MENU'}])}
function completeLevel(){if(mode!=='playing'||finishOnce||portalBlockReason())return;finishOnce=true;releaseInputs();mode='levelend';chime();progress.unlocked=Math.max(progress.unlocked,Math.min(LEVELS.length-1,levelIndex+1));progress.best=Math.max(progress.best,score);save();const isLast=levelIndex===LEVELS.length-1;
 if(isLast){overlay.classList.add('hidden');showDialogue(speech(...DIALOG.ending),'won');return;}
 panel('✦ MAIS PERTO DE CASA','Fase concluída!',`Luli e Chris atravessaram <b>${String(level.name).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</b>.<br>Você coletou <b>${levelFruit} frutas</b>. Mais um passo no caminho de casa.`,[{action:'next',label:'▶ PRÓXIMA FASE'},{action:'menu',label:'VOLTAR AO MENU'}]);}
function showEndingPanel(){progress.completed=true;progress.unlocked=LEVELS.length-1;save();panel('✧ VOCÊ CHEGOU AO FIM ✧','De volta ao lar! ♡','O caminho foi difícil, mas eles chegaram juntos.<br><br><b>Parabéns! Você concluiu as 8 fases.</b><br>Para Luli, com carinho. ♡',[{action:'all',label:'↻ JOGAR NOVAMENTE'},{action:'menu',label:'VOLTAR AO MENU'}]);}
function spawnBurst(x,y,color='#ffb2db',n=15){for(let i=0;i<n;i++){const a=Math.PI*2*i/n+(hash(clock+i)-.5)*.45;const speed=70+hash(i*43+clock)*130;particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-60,t:.6+hash(i*23)*.5,max:1,color,r:3+hash(i+10)*3})}}
/* In-memory attempt snapshots; persistent save format is unchanged. */
const copyState=value=>JSON.parse(JSON.stringify(value));
function supported(b){return [...solids(),...surfaces()].some(o=>Math.abs(b.y+b.h-o.y)<1&&b.x<o.x+o.w-.1&&b.x+b.w>o.x+.1);}
function stableBody(b){return clearBody(b)&&supported(b);}
function clearPath(a,b){const probe={...a},blocks=solids();LuliPuzzles.sweep(probe,b.x-a.x,'x',blocks);LuliPuzzles.sweep(probe,b.y-a.y,'y',blocks);return Math.abs(probe.x-b.x)<.1&&Math.abs(probe.y-b.y)<.1;}
function pairAt(b,grounded=true){
 if(!(grounded?stableBody(b):clearBody(b)))return null;
 for(const dx of [-48,48,-40,40,-65,65,-85,85])for(const dy of [0,-16,16,-32,32,-64]){
  const c=bodyAt(clamp(b.x+dx,1,level.width-39),b.y+dy,b.face);
  if((grounded?stableBody(c):clearBody(c))&&!LuliPuzzles.overlap(b,c)&&clearPath(b,c))return {player:{...b},companion:c};
 }
 return null;
}
function safeStartPair(){
 const candidates=[];
 for(const o of [...solids(),...surfaces()])if(o.y>=65&&o.w>=39)for(const dx of [0,48,-48,80,-80]){
  const x=clamp(player.x+dx,Math.max(1,o.x),Math.min(level.width-39,o.x+o.w-39));
  const b=bodyAt(x,o.y-65,1),pair=pairAt(b,true);
  if(pair)candidates.push({pair,cost:Math.abs(x-player.x)+Math.abs(b.y-player.y)*2});
 }
 candidates.sort((a,b)=>a.cost-b.cost);
 return candidates[0]?.pair||pairAt(player,false)||{player:{...player},companion:{...companion}};
}
function captureState(id,pair){return copyState({id,levelIndex,player:pair.player,companion:pair.companion,active,score,levelFruit,puzzle,fruits,enemies,npcList,editorEvents,storySeen:[...storySeen],activated:[...activatedCheckpoints],gateRequiresBoss,playerTime});}
function activateCheckpoint(cp){
 if(mode!=='playing'||!luliPresent||parked||!player.onGround||!companion||activatedCheckpoints.has(cp.id))return false;
 if(enemies.some(e=>e.alive&&Math.abs(e.x-player.x)<100&&Math.abs(e.y-player.y)<85))return false;
 const pair=pairAt(player,true);if(!pair)return false;
 activatedCheckpoints.add(cp.id);checkpointX=pair.player.x;checkpointY=pair.player.y+pair.player.h;
 checkpointState=captureState(cp.id,pair);toast('✦ Checkpoint ativado!',3);chime();return true;
}
function restoreSnapshot(snapshot,options={}){
 if(!snapshot||snapshot.levelIndex!==levelIndex)return false;
 const s=copyState(snapshot);puzzle=s.puzzle;fruits=s.fruits;enemies=s.enemies;npcList=s.npcList;editorEvents=s.editorEvents;
 storySeen=new Set(s.storySeen);activatedCheckpoints=new Set(s.activated);gateRequiresBoss=s.gateRequiresBoss;
 score=s.score;levelFruit=s.levelFruit;playerTime=s.playerTime;player=s.player;companion=s.companion;active=s.active;
 luliPresent=true;parked=false;rescue=null;history=[];particles=[];
 for(const b of [player,companion])if(b){b.vx=0;b.vy=0;b.onGround=supported(b);b.airJump=false;b.landTimer=0;b.talkTimer=0;}
 heart=options.heart??3;if(options.solo){active='chris';luliPresent=false;companion=null;}
 checkpointX=player.x;checkpointY=player.y+player.h;if(snapshot.id==='start')checkpointState=null;
 invulnerable=2.3;coyote=player.onGround?.1:0;jumpBuffer=0;releaseInputs();
 nearNPC=null;storyCooldown=1.2;dialogue=[];dialogAction=null;dialogIndex=0;finishOnce=false;mode='playing';
 cameraX=clamp(player.x-view.w*.35,0,Math.max(0,level.width-view.w));cameraY=clamp(player.y-view.h*.55,0,Math.max(0,level.height-view.h));
 overlay.classList.add('hidden');dialog.classList.add('hidden');hud.classList.remove('hidden');interEl.classList.add('hidden');
 if(options.solo)summonCrystal();updateHUD();return true;
}
function restartCheckpoint(){if(mode==='gameover'&&checkpointState){restoreSnapshot(checkpointState);toast('✦ De volta ao checkpoint!',3);}}
function fallRecovery(){restoreSnapshot(checkpointState||startState,{heart,solo:true});}
function bossBlocksPortal(){return gateRequiresBoss&&enemies.some(e=>e.type==='pumpkin'&&e.alive);}
function portalBlockReason(){
 if(bossBlocksPortal())return '🎃 Derrote o Guardião Casca-Dura para abrir o portal!';
 if(!luliPresent)return '💎 Resgate Luli antes de atravessar o portal!';
 if(!clearBody(player)||parked||!companion||!clearBody(companion)||!clearPath(player,companion)||Math.abs(companion.x-player.x)>120||Math.abs(companion.y-player.y)>105)return 'Reúna Luli e Chris para atravessar o portal!';
 return '';
}
function checkPortal(){
 if(level.gate===null||Math.abs(player.x-level.gate)>=50||Math.abs(player.y+player.h-(level.gateY??FLOOR))>=85)return false;
 if(luliPresent&&!parked&&companion&&(Math.abs(companion.x-player.x)>120||Math.abs(companion.y-player.y)>105||!clearBody(companion)||!clearPath(player,companion))){
  const pair=pairAt(player,false);if(pair){companion=pair.companion;history=[];}
 }
 const reason=portalBlockReason();if(reason){if(toastClock<1)toast(reason,2.3);return false;}
 completeLevel();return true;
}
function summonCrystal(){
 const center=player.x+player.w/2,feet=player.y+player.h,blocks=solids(),spots=[];
 for(const dx of [70,-70,100,-100,55,-55]){
  const b=bodyAt(clamp(player.x+dx,1,level.width-39),player.y,player.face);
  if(!stableBody(b)||!clearPath(player,b))continue;
  const x=b.x+b.w/2,y=feet-38;
  if(!blocks.some(o=>LuliPuzzles.overlap({x:x-14,y:y-25,w:28,h:50},o)))spots.push({x,y});
 }
 rescue={...(spots[0]||{x:center,y:player.y+player.h*.5}),phase:0,age:0,emergency:!spots.length};
}
function restoreLuli(autoTalk=false){
 if(luliPresent)return true;
 const pair=pairAt(player,false);
 if(!pair){
  if(!restoreSnapshot(checkpointState||startState,{heart}))return false;
  active='luli';toast('✦ Luli voltou! A dupla retornou a um local seguro.',4);
 }else{
  luliPresent=true;active='luli';companion=pair.companion;parked=false;history=[];invulnerable=2.3;
  player.landTimer=0;player.anim=0;spawnBurst(player.x+18,player.y+20,'#ffc3ec',24);chime();toast('✦ LULI VOLTOU! Chris voltou a acompanhá-la.',4);
 }
 rescue=null;updateHUD();if(autoTalk)showDialogue(speech(...DIALOG.recover));return true;
}
function updateRescue(dt){
 if(!rescue||luliPresent)return;rescue.phase+=dt;rescue.age+=dt;
 if(rescue.age>=8||rescue.emergency){
  rescue.emergency=true;rescue.x=player.x+player.w/2;rescue.y=player.y+player.h*.5;
  if(player.onGround&&rescue.age>=.65)restoreLuli(true);return;
 }
 const pc=player.x+player.w/2,py=player.y+player.h/2;
 if(Math.abs(pc-rescue.x)<34&&Math.abs(py-(rescue.y+Math.sin(clock*4)*10))<66)restoreLuli(true);
}
function hurt(reason,amount=1){
 if(mode!=='playing'||invulnerable>0)return;
 heart=Math.max(0,heart-amount);invulnerable=2;beep(210,.21,'sawtooth',.07,-110);
 if(heart===0){updateHUD();gameOver();return;}
 if(reason==='fall'){fallRecovery();toast('💔 Chris voltou ao ponto seguro. Resgate Luli!',4);return;}
 if(luliPresent){
  const candidate=active==='chris'?player:companion;
  if(candidate&&!parked&&Math.abs(candidate.x-player.x)<120&&Math.abs(candidate.y-player.y)<100&&clearBody(candidate)&&clearPath(player,candidate))player={...candidate};
  luliPresent=false;active='chris';spawnBurst(player.x+17,player.y+22,'#ff7dd2',25);player.vx=0;player.vy=0;player.onGround=supported(player);companion=null;parked=false;duoPress=null;history=[];
  summonCrystal();toast('💔 Luli desapareceu! Chris assumiu o controle. Procure o cristal rosa!',5);
 }else{player.vy=-380;player.vx=-(player.face*165);toast('Chris perdeu um coração! Cuidado!',2.6);}
 updateHUD();
}
function triggerStudioEvent(trigger,x=player?.x,only=null){
 for(const ev of editorEvents){if((only&&only!==ev)||ev.trigger!==trigger||(ev.once&&ev.used)||Math.abs(x-ev.x)>Math.max(80,ev.width||120))continue;ev.used=true;
 if(ev.action==='toast')toast(String(ev.message||'Evento ativado!').slice(0,300),4);
 if(ev.action==='dialog'){const lines=(ev.dialogue||[]).map(l=>[l.speaker||'narrator',l.mood||'dica',l.text||'']);if(lines.length)showDialogue(speech(...lines));}
 if(ev.action==='heal'){heart=Math.min(3,heart+1);if(!luliPresent)restoreLuli(false);updateHUD();toast(ev.message||'Coração recuperado!')}
 if(ev.action==='checkpoint'){if(activateCheckpoint({id:'event:'+ev.id,x:ev.x,y:player.y+player.h}))toast(ev.message||'Novo checkpoint!');else if(!activatedCheckpoints.has('event:'+ev.id))ev.used=false;}
 if(ev.action==='gate'){if(!bossBlocksPortal()){gateRequiresBoss=false;toast(ev.message||'Portal liberado!')}else toast('Derrote o Guardião primeiro!');}
 }
}
function interact(){if(player&&mode==='playing')player.talkTimer=.8;if(mode==='dialog'){nextDialogue();return}if(mode!=='playing')return;
 if(!nearNPC){toast('Aproxime-se de um NPC para conversar.');return}
 const npc=nearNPC;let lines=npc.studio?.dialogue?.length?npc.studio.dialogue.map(l=>[l.speaker||npc.type,l.mood||'feliz',l.text||'']):npcText[npc.type],heal=false;triggerStudioEvent('talk',npc.x);
 if((npc.studio?npc.studio.heal:npc.type==='healer')&&!npc.used){npc.used=true;heal=true;heart=Math.min(3,heart+(npc.studio?.healAmount||1));if(!luliPresent)restoreLuli(false);lines=npc.studio?.dialogue?.length?npc.studio.dialogue.map(l=>[l.speaker||npc.type,l.mood||'feliz',l.text||'']):[['healer','feliz','Flores prismáticas para vocês! Curei um coração e ajudei Luli a recuperar as forças.'],['luli','feliz','Obrigada, Alejandra! Voltamos para o caminho!'],['healer','dica','Cuidado: esta cura especial só funciona uma vez por fase.']];chime();updateHUD();}
 else if(npc.type==='healer'&&npc.used)lines=[['healer','dica','Minhas flores especiais desta fase já foram usadas. Mas vocês podem recuperar Luli com o cristal prismático!']];
 showDialogue(speech(...lines));}
function jump(){if(mode==='dialog'){nextDialogue();return}if(mode!=='playing')return;jumpBuffer=.15}
function inputKey(event,down){if(down&&(mode==='menu'||mode==='paused'||mode==='levelend'||mode==='gameover'||mode==='won')&&event.target?.tagName==='BUTTON'&&['Space','Enter'].includes(event.code))return;if(event.code==='KeyQ'){event.preventDefault();if(down&&!event.repeat&&mode==='playing'&&duoOwner===null){duoOwner='keyboard';duoStart();}else if(!down&&duoOwner==='keyboard'){duoOwner=null;duoEnd();}return;}const codes={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',ArrowUp:'jump',KeyW:'jump'};
 if(codes[event.code]){event.preventDefault();const k=codes[event.code];if(down&&mode!=='playing'&&mode!=='dialog')return;if(down&&mode==='dialog'){if(k==='jump'&&!event.repeat)jump();return;}setInputSource(k,'key:'+event.code,down);return;}
 if(!down||event.repeat)return;
 if(['KeyE','Enter'].includes(event.code)){event.preventDefault();interact();return}
 if(['Escape','KeyP'].includes(event.code)){event.preventDefault();mode==='paused'?resume():pause()}
 if(event.code==='KeyM'){muted=!muted;progress.muted=muted;save();$('soundBtn').textContent=muted?'♪̸':'♫'}
}
window.addEventListener('keydown',e=>inputKey(e,true));window.addEventListener('keyup',e=>inputKey(e,false));
window.addEventListener('blur',releaseInputs);
window.addEventListener('orientationchange',()=>{releaseInputs();resize();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseInputs();if(mode==='playing')pause();}});
function touch(id,key){
 const b=$(id);
 b.addEventListener('pointerdown',event=>{
  event.preventDefault();if(mode!=='playing'||pointerOwners.has(event.pointerId))return;
  const token='ptr:'+event.pointerId;
  if(key==='duo'){if(duoOwner!==null||!luliPresent||!companion)return;duoOwner=token;duoStart();}
  pointerOwners.set(event.pointerId,key);b.classList.add('down');
  if(key==='interact')interact();else if(key!=='duo')setInputSource(key,token,true);
  try{b.setPointerCapture(event.pointerId)}catch{}
 });
 function release(event,cancel=false){
  event.preventDefault?.();if(pointerOwners.get(event.pointerId)!==key)return;
  pointerOwners.delete(event.pointerId);const token='ptr:'+event.pointerId;
  if(key==='duo'&&duoOwner===token){duoOwner=null;duoEnd(cancel);}
  else if(key!=='interact'&&key!=='duo')setInputSource(key,token,false);
  if(![...pointerOwners.values()].includes(key))b.classList.remove('down');
 }
 b.addEventListener('pointerup',e=>release(e));b.addEventListener('pointercancel',e=>release(e,true));b.addEventListener('lostpointercapture',e=>release(e,true));
}
for(const [id,key] of Object.entries(controlIds).map(([key,id])=>[id,key]))touch(id,key);
$('dialogNext').addEventListener('click',nextDialogue);dialog.addEventListener('click',e=>{if(!e.target.closest('button'))nextDialogue()});
$('soundBtn').textContent=muted?'♪̸':'♫';$('soundBtn').addEventListener('click',()=>{muted=!muted;progress.muted=muted;save();$('soundBtn').textContent=muted?'♪̸':'♫';if(!muted)chime()});
$('pauseBtn').addEventListener('click',()=>{if(mode==='paused')resume();else pause()});
overlay.addEventListener('click',e=>{
 if(e.target.closest('#startBtn')){score=0;startLevel(0);return}if(e.target.closest('#continueBtn')){score=0;startLevel(clamp(progress.unlocked,0,LEVELS.length-1));return}
 if(e.target.closest('#howBtn')){panel('✧ GUIA DE AVENTURA ✧','Como jogar','<b>Luli começa no controle</b>. Q rápido alterna; segure Q por 0,6 s para deixar o companheiro esperando; pressione Q para chamá-lo. Luli salta duas vezes; Chris empurra caixas. Placas de pressão abrem portas do mesmo canal.<br>Se Luli sofrer dano, ela desaparece: você passa a controlar Chris. Encontre o <b>cristal rosa</b> ou converse com a curandeira para restaurá-la.<br><br><b>← →</b> para andar; <b>ESPAÇO</b> para pular; <b>E</b> para falar; <b>P</b> para pausar.<br>Toque nos botões ao jogar no celular. Pule sobre os inimigos, ative checkpoints e reúna Luli e Chris para atravessar o portal de cada fase.',[{action:'menu',label:'ENTENDI! VOLTAR AO MENU'}]);return}
 const stage=e.target.closest('[data-stage]');if(stage){const ix=Number(stage.dataset.stage);if(Number.isInteger(ix)&&ix>=0&&ix<=progress.unlocked&&ix<LEVELS.length){score=0;startLevel(ix);}return;}if(e.target.closest('#chaptersBtn')){overlay.innerHTML='<div class="overlay-bg-stars"></div><section class="menu-panel chapter-panel"><div class="menu-eyebrow">O CAMINHO DE VOLTA</div><h2>Capítulos</h2><div class="chapter-list">'+LEVELS.map((l,i)=>`<button class="chapter-btn" data-stage="${i}" ${i>progress.unlocked?'disabled':''}><span>${String(i+1).padStart(2,'0')}</span>${l.name}<small>${i>progress.unlocked?'Bloqueada':'Jogar'}</small></button>`).join('')+'</div><button class="secondary-btn" data-action="menu">Voltar</button></section>';return;}const act=e.target.closest('[data-action]')?.dataset.action;
 switch(act){case 'resume':resume();break;case 'checkpoint':restartCheckpoint();break;case 'restart':score=levelStartScore;startLevel(levelIndex);break;case 'next':startLevel(levelIndex+1,true);break;case 'all':score=0;startLevel(0);break;case 'menu':showMenu();break;}
});
function update(dt){clock+=dt;if(toastClock>0){toastClock-=dt;if(toastClock<=0)toastEl.classList.remove('shown')}
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=200*dt;p.t-=dt}particles=particles.filter(p=>p.t>0);
 if(mode!=='playing'||!player||!level)return;
 playerTime+=dt;invulnerable=Math.max(0,invulnerable-dt);coyote=Math.max(0,coyote-dt);jumpBuffer=Math.max(0,jumpBuffer-dt);
 const input=Number(keys.right)-Number(keys.left);const speed=active==='luli'?296:315;
 if(input)player.face=input;
 const targetV=input*speed;
 const accel=input?(player.onGround?2400:1550):(player.onGround?2700:950);
 player.vx+=clamp(targetV-player.vx,-accel*dt,accel*dt);
 if(!input&&Math.abs(player.vx)<2)player.vx=0;
 
 const previousBottom=player.y+player.h; const wasAirborne=!player.onGround;

 movePuzzles(dt);const previousX=player.x;moveHeroX(player.vx*dt);if(Math.abs(player.x-previousX)<.001)player.vx=0;
 if(jumpBuffer>0&&(player.onGround||coyote>0)){player.vy=active==='luli'?-735:-707;jumpBuffer=0;coyote=0;player.onGround=false;beep(460,.11,'sine',.045,225)}
 else if(jumpBuffer>0&&active==='luli'&&!player.airJump&&!player.onGround){player.airJump=true;player.vy=-660;jumpBuffer=0;spawnBurst(player.x+19,player.y+50,'#ffc3ec',8);}
 if(!keys.jump&&player.vy<-250)player.vy+=GRAVITY*dt*.6;
 player.vy=clamp(player.vy+GRAVITY*dt,-900,1200);LuliPuzzles.moveY(player,player.vy*dt,solids(),surfaces());if(player.onGround){coyote=.10;player.airJump=false;}
 animateBody(player,dt,!wasAirborne);
 followCompanion(dt);
 LuliPuzzles.signal(puzzle.filter(o=>o.kind==='plate'),puzzle.filter(o=>o.kind==='door'),[player,...(parked&&companion?[companion]:[]),...puzzle.filter(o=>o.kind==='crate')]);
 if(player.y>(level.height||540)+95){if(invulnerable>0)fallRecovery();else hurt('fall');return}
 // Enemy AI and collisions: same world geometry as the heroes.
 const world=enemyWorld();
 for(const e of enemies){if(!e.alive)continue;e.phase+=dt;e.stun=Math.max(0,e.stun-dt);e.attack=Math.max(0,e.attack-dt);
 if(!LuliEnemies.step(e,dt,world,player))continue;
 // Preserve existing fallback attack visuals; combat rules are unchanged.
 if(!e.ai&&e.type==='lemon'&&Math.abs(player.x-e.x)<155&&Math.sin(e.phase*5)>0.85)e.attack=.4;
 if(!e.ai&&e.type==='vine')e.attack=(Math.sin(e.phase*2.7)>.35)?0.25:0;
 if(invulnerable>0)continue;
 const px=player.x,py=player.y,ex=e.x,ey=e.y;
 const overlap=px+player.w>ex+8&&px<ex+e.w-7&&py+player.h>ey+7&&py<ey+e.h-5;
 if(overlap){if(player.vy>90&&previousBottom<=ey+24&&e.type!=='vine'){e.hp--;player.vy=-540;invulnerable=.2;beep(e.hp<=0?790:420,.11,'triangle',.06,240);spawnBurst(ex+e.w/2,ey+15,e.type==='pumpkin'?'#ffae75':'#ffdb99',10);if(e.hp<=0){triggerStudioEvent('enemyDefeated',e.x);e.alive=false;score+=3;levelFruit+=3;toast(e.type==='pumpkin'?'🎃 Guardião derrotado! O portal está livre!':'Boa! Monstrinho derrotado! +3 frutas',3)}else{e.stun=1.1;toast(`Abóbora Casca-Dura: faltam ${e.hp} pulos!`)}updateHUD()}
 else {hurt('enemy',e.ai?.damage||1);return}}
 }
 for(const f of fruits){if(f.found)continue;const fy=f.y+Math.sin(clock*3+f.phase)*5;const pc=player.x+player.w/2,py=player.y+player.h/2;if(Math.abs(pc-f.x)<27&&Math.abs(py-fy)<43){f.found=true;const val=f.value||1;score+=val;levelFruit+=val;triggerStudioEvent('collect',f.x);beep(670,.06,'sine',.028,400);if(levelFruit%12===0){if(heart<3){heart++;toast('♥ 12 frutas! Você ganhou um coração!')}else toast('✦ 12 frutas coletadas!');chime()}}}
 updateRescue(dt);
 if(mode!=='playing')return;
 storyCooldown=Math.max(0,storyCooldown-dt);
 if(storyCooldown===0&&luliPresent&&!parked&&player.onGround&&invulnerable===0&&!enemies.some(e=>e.alive&&Math.abs(e.x-player.x)<100&&Math.abs(e.y-player.y)<90)){
  const scenes=STORY[levelIndex]?.scenes||[];const feet=player.y+player.h;
  const ix=scenes.findIndex((sc,i)=>!storySeen.has(i)&&player.x>=sc.x&&player.x<=(sc.xmax??sc.x+420)&&feet>=sc.ymin&&feet<=sc.ymax);
  if(ix>=0){storySeen.add(ix);showDialogue(asSpeech(scenes[ix].lines));return;}
 }
 if(editorEvents.length)for(const ev of editorEvents){if(ev.trigger!=='enter')continue;const inside=player.x+player.w>=ev.x&&player.x<=ev.x+(ev.width||160)&&player.y+player.h>=ev.y&&player.y<=ev.y+100;if(inside&&!ev.inside){ev.inside=true;triggerStudioEvent('enter',player.x,ev);if(mode!=='playing')return;}else ev.inside=inside;}
 for(const cp of level.checkpoints||[])if(Math.abs(player.x-cp.x)<60&&Math.abs(player.y+player.h-cp.y)<38)activateCheckpoint(cp);
 if(checkPortal())return;
 nearNPC=npcList.find(n=>Math.abs(player.x-n.x)<93&&Math.abs(player.y+player.h-(n.studio?.y??FLOOR))<100)||null;interEl.classList.toggle('hidden',!nearNPC);
 if(nearNPC){interEl.style.left=clamp((nearNPC.x-cameraX)/view.w*canvas.clientWidth,65,canvas.clientWidth-65)+'px';interEl.innerHTML='E <span>'+(nearNPC.type==='healer'&&!nearNPC.used?'CURAR':'CONVERSAR')+'</span>'}
 const nextCamera=clamp(player.x-view.w*.35,0,Math.max(0,level.width-view.w));cameraX+=(nextCamera-cameraX)*Math.min(1,dt*5.6);const nextY=clamp(player.y-view.h*.55,0,Math.max(0,(level.height||540)-view.h));cameraY+=(nextY-cameraY)*Math.min(1,dt*5.6);updateHUD();
}

/* Cenários pintados e obstáculos da edição anterior, reutilizados no novo jogo. */
function fillRoundRect(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function strokeRoundRect(x,y,w,h,r,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.stroke()}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
function drawSky(){
 const palette=[['#513c89','#ed8297','#ffd294'],['#2c2b66','#c16b8c','#ffd68e'],['#191d55','#785388','#dba078']][level?.theme||0];
 const grad=ctx.createLinearGradient(0,0,0,view.h);grad.addColorStop(0,palette[0]);grad.addColorStop(.48,palette[1]);grad.addColorStop(1,palette[2]);ctx.fillStyle=grad;ctx.fillRect(0,0,view.w,view.h);
 for(let i=0;i<65;i++){const x=fract(hash(i*79)*3+clock*.0006)*view.w,y=hash(i*98)*210;
  const a=.24+.35*hash(i+20);ellipse(x,y,1+hash(i)*1.4,1+hash(i)*1.4,`rgba(255,236,188,${a})`);}
 const sunX=view.w*.78-cameraX*.014,sunY=157;
 let glow=ctx.createRadialGradient(sunX,sunY,2,sunX,sunY,190);glow.addColorStop(0,'#ffeacaa8');glow.addColorStop(.25,'#fff3b66b');glow.addColorStop(1,'#ffe6b000');ctx.fillStyle=glow;ctx.fillRect(sunX-200,sunY-200,400,400);
 ellipse(sunX,sunY,49,49,'#ffefbf');
 // soft fluffy clouds
 for(let i=0;i<11;i++){const bx=(i*337-cameraX*.085)%((view.w+750));const x=(bx+view.w+750)%(view.w+750)-320;let y=70+(i%4)*58+Math.sin(i*7)*16;
  ctx.globalAlpha=.13;ellipse(x,y,74,17,'#fff4db');ellipse(x+30,y-10,41,18,'#fff4db');ellipse(x-38,y-7,37,16,'#fff4db');ctx.globalAlpha=1;
 }
 // distant mountains, several layers of hand-drawn silhouettes
 for(let l=0;l<3;l++){
  const par=.12+l*.12,base=270+l*53;
  ctx.fillStyle=['#7e6691','#926784','#7b6480'][l];ctx.globalAlpha=.54+l*.13;
  ctx.beginPath();ctx.moveTo(-10,view.h);
  for(let sx=-20;sx<view.w+40;sx+=18){const wx=sx+cameraX*par;const y=base-65*Math.abs(Math.sin(wx*.0034+l*.5))-20*Math.sin(wx*.011+l);ctx.lineTo(sx,y);}
  ctx.lineTo(view.w+20,view.h);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
 }
 drawFarCastle(view.w*.79-cameraX*.11,225-(level?.theme||0)*14,.8);
}
function drawFarCastle(x,y,scale=1){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 // hill under a fairytale castle
 ctx.fillStyle='#62647b';ctx.beginPath();ctx.ellipse(0,123,210,70,0,0,Math.PI*2);ctx.fill();
 const towers=[[-100,36,28,85],[-55,0,24,119],[-15,31,40,97],[34,-25,22,151],[73,14,27,114],[122,43,25,80]];
 for(const [tx,ty,tw,th] of towers){ctx.fillStyle='#655376';ctx.fillRect(tx,ty,tw,th);ctx.fillStyle='#4a456b';ctx.beginPath();ctx.moveTo(tx-10,ty+3);ctx.lineTo(tx+tw*.5,ty-32);ctx.lineTo(tx+tw+10,ty+3);ctx.fill();
  for(let k=0;k<Math.floor(th/30);k++){fillRoundRect(tx+tw*.5-3,ty+14+k*28,6,12,3,'#ffcf829e');}
 }
 fillRoundRect(-88,69,192,58,2,'#5b4c70');for(let i=0;i<8;i++)fillRoundRect(-80+i*22,85,8,16,2,'#f4bd769c');
 ctx.restore();
}
function drawTrees(){
 const start=Math.floor((cameraX-200)/230)-1,end=Math.ceil((cameraX+view.w+200)/230)+1;
 for(let i=start;i<=end;i++){if(i<0)continue;const x=i*230+60+(hash(i+99)-.5)*55,y=FLOOR+10;
  ctx.save();ctx.translate(x,y);ctx.globalAlpha=.8;
  // Trunk
  fillRoundRect(-11,-137,21,137,8,'#72566b');fillRoundRect(-6,-135,5,110,3,'#a67a77');
  const colors=['#416d68','#4c8468','#5a8b73','#55876a'];
  for(let n=0;n<6;n++){const ox=(hash(i*15+n)-.5)*90,oy=-125+hash(i*29+n)*35;
   ellipse(ox,oy,39+hash(i+n*7)*14,31,colors[(i+n)%4]);}
  for(let n=0;n<12;n++){const ox=(hash(i*39+n*5)-.5)*110,oy=-153+hash(i*45+n)*55;ellipse(ox,oy,2.4,2.4,n%2?'#ffd1aa':'#ffe5b0');}
  ctx.restore();
 }
}
function drawStoneBridge(){
 if((level?.theme||0)!==2)return;
 // A complete bridge, visibly unbroken, spans the river in the painted background.
 ctx.save();ctx.translate(-cameraX*.27+150,0);ctx.globalAlpha=.72;
 const width=level.width*.64,by=385;
 let g=ctx.createLinearGradient(0,by,0,540);g.addColorStop(0,'#818294');g.addColorStop(1,'#393951');ctx.fillStyle=g;
 ctx.fillRect(0,by,width,37);
 for(let x=0;x<width;x+=130){ctx.beginPath();ctx.arc(x+64,494,51,Math.PI,Math.PI*2);ctx.lineTo(x+115,540);ctx.lineTo(x+13,540);ctx.fill();}
 for(let x=0;x<width;x+=40){ctx.fillStyle='#c4a58b';ctx.fillRect(x,by+2,3,20)}
 for(let x=0;x<width;x+=11){ctx.fillStyle='#e8b99a';ctx.fillRect(x,by-18,7,17)}
 ctx.globalAlpha=1;ctx.restore();
}
function drawTerrain(){
 // Segmented floor; holes are deliberate game obstacles (not broken background bridge).
 for(const [x,w] of level.ground){
  const y=FLOOR;
  const dirt=ctx.createLinearGradient(0,y+10,0,700);dirt.addColorStop(0,'#9d6a62');dirt.addColorStop(.3,'#755267');dirt.addColorStop(1,'#423d59');ctx.fillStyle=dirt;ctx.fillRect(x,y,w,600);
  fillRoundRect(x,y-13,w,23,9,'#577a54');fillRoundRect(x,y-15,w,10,5,'#86b66f');
  ctx.save();ctx.beginPath();ctx.rect(x,y+10,w,200);ctx.clip();
  for(let bx=x;bx<x+w;bx+=66){for(let row=0;row<4;row++){
    const sx=bx+(row%2)*33,sy=y+18+row*39;
    strokeRoundRect(sx,sy,64,38,7,'#d5a2833f',2);
    if(hash(sx*2+row)>.65)ellipse(sx+18,sy+12,3,2,'#e6a87e55');
  }}
  ctx.restore();
  for(let px=x+35;px<x+w-20;px+=42){const h=hash(px*3.35);if(h>.6){
    ctx.strokeStyle='#326957';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px,y-15);ctx.lineTo(px,y-21-h*12);ctx.stroke();
    ellipse(px-4,y-22-h*12,5,3,'#4e8f6e');ellipse(px+4,y-20-h*12,5,3,'#5d9e78');
    if(h>.84){ellipse(px,y-25-h*12,4,4,'#ffb3c6');ellipse(px,y-25-h*12,1.8,1.8,'#f9e2a0')}
  }}
 }
 for(const [x,y,w] of level.platforms){
  fillRoundRect(x,y,w,18,7,'#86687c');fillRoundRect(x,y-7,w,12,6,'#7ca775');
  ctx.fillStyle='#d5b294';ctx.fillRect(x+12,y+10,w-24,2);
  for(let k=0;k<w;k+=35)strokeRoundRect(x+k,y+4,34,14,3,'#452e55a0',2);
 }
}
function drawFlower(x,y,pink=true){
 const c=pink?'#f5a2c0':'#fbd98a';ctx.save();ctx.translate(x,y);
 for(let i=0;i<5;i++){const a=i*1.257;ellipse(Math.cos(a)*6,Math.sin(a)*6,5.4,5.4,c)}ellipse(0,0,4.2,4.2,'#ffecbc');ctx.restore();
}
function drawDecor(){
 const a=Math.floor((cameraX-160)/115),b=Math.ceil((cameraX+view.w+160)/115);
 for(let i=a;i<=b;i++){if(i<0)continue;const x=i*115+hash(i)*45;
  const grounded=level.ground.find(([gx,w])=>x>gx+18&&x<gx+w-18);if(!grounded)continue;
  if(hash(i*65)>.38)drawFlower(x,FLOOR-22,hash(i+8)>.38);
  if(hash(i*71)>.75){ellipse(x+15,FLOOR-15,12,9,'#e09e74');ellipse(x+15,FLOOR-17,8,4,'#f0c99f');}
 }
}
function drawFruit(x,y,type=0,r=14,phase=0){
 const colors=['#ff716b','#f8b85e','#df83a0','#acd977'];const c=colors[type%4];
 ctx.save();ctx.translate(x,y+Math.sin(clock*3+phase)*5);ctx.rotate(Math.sin(clock*2+phase)*.09);
 ctx.shadowColor='#fff3b2';ctx.shadowBlur=13;
 ellipse(0,0,r,r*1.05,c);ctx.shadowBlur=0;
 ellipse(-r*.3,-r*.37,r*.22,r*.3,'#ffffff65');
 ctx.strokeStyle='#537b4f';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(0,-r*.85);ctx.lineTo(0,-r*1.27);ctx.stroke();
 ctx.fillStyle='#6eb26b';ctx.beginPath();ctx.ellipse(r*.29,-r*1.11,r*.42,r*.18,-.45,0,Math.PI*2);ctx.fill();
 ellipse(-r*.3,r*.02,1.7,2.6,'#54394b');ellipse(r*.3,r*.02,1.7,2.6,'#54394b');
 ctx.strokeStyle='#784957';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,r*.24,3,0,Math.PI);ctx.stroke();
 ctx.restore();
}
function drawSprite(key,cx,bottom,w,h,face=1,tilt=0,alpha=1){const im=images[key];ctx.save();ctx.translate(cx,bottom);ctx.globalAlpha=alpha;if(face<0)ctx.scale(-1,1);if(tilt)ctx.rotate(tilt);ellipse(0,3,w*.25,4,'#382a4260');
 if(im&&im.complete&&im.naturalWidth){const iw=im.naturalWidth,ih=im.naturalHeight;const ratio=iw/ih;let dw=w,dh=h;if(dw/dh>ratio)dw=dh*ratio;else dh=dw/ratio;ctx.drawImage(im,-dw/2,-dh+7,dw,dh)}
 else{ellipse(0,-h*.65,w*.3,h*.23,'#f5e4ce');ellipse(0,-h*.22,w*.25,h*.24,key.includes('luli')?'#8e587d':'#2d2b35')}
 ctx.restore()}
function drawSheetImage(im,cx,bottom,w,h,face,row,frame){
 if(!LuliSheets.ready(im))return false;
 ctx.save();ctx.translate(cx,bottom);
 ellipse(0,3,w*.25,4,'#382a4260');
 const painted=LuliSheets.paint(ctx,im,row,frame,-w/2,-h+4,w,h,face<0);
 ctx.restore();return painted;
}
function drawPlayable(char,body,translucent=1){
 const {x,y,face,anim}=body;const walking=Math.abs(body.vx)>30,airborne=!body.onGround;
 // All hero frames are exactly 64×64 px with anchor (32,61). World-space feet do not move between frames.
 const hero=(char==='luli');
 let key;
 if(airborne){const vy=body.vy||0;key='jump'+(vy<-500?0:vy<-150?1:vy<100?2:3);}
 else if((body.landTimer||0)>0)key='landing'+(body.landTimer>.07?0:1);
 else if((body.talkTimer||0)>0)key='talk'+(Math.floor(clock*4)%4);
 else if(walking)key='run'+(Math.floor(anim)%6);
 else key='idle'+(Math.floor(anim)%4);
 const im=images[char+'_sheet'];
 const scale=hero?1.48:1.43, dw=64*scale,dh=64*scale;
 const footX=x+body.w/2,footY=y+body.h;
 const match=/^(idle|run|jump|landing|talk)([0-9]+)$/.exec(key);
 const state=match?.[1]||'idle',frame=Number(match?.[2]||0);
 const row=LuliSheets.HERO[state].row;
 ctx.save();ctx.globalAlpha=translucent;
 ellipse(footX,footY,19,3.5,'#382a4260');
 // Âncora do pé (32,61) permanece idêntica em todos os 30 slots.
 const ok=LuliSheets.paint(ctx,im,row,frame,footX-32*scale,footY-61*scale,dw,dh,face<0);
 if(!ok){ellipse(footX,footY-58,28,39,hero?'#d9a6da':'#e9dcc8');}
 ctx.restore();
}
function drawNPCNew(n){const bY=n.studio?.y??FLOOR;let size={guardian:[105,116],apple:[90,89],melon:[95,92],strawberry:[102,102],guard:[94,110],healer:[102,113]}[n.type];
 if(!drawSheetImage(spriteForEntity('npc',n.type,n.studio),n.x,bY+Math.sin(clock*2+n.phase)*1.6,size[0],size[1],-1,0,Math.floor(clock*3+n.phase)%4))drawSprite('npc_'+n.type,n.x,bY,size[0],size[1],-1);
 if(Math.abs(player.x-n.x)<150){ctx.save();ctx.fillStyle='#fff4dabd';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(n.studio?.customName||ACTORS[n.type],n.x,bY-size[1]-15);ctx.restore()}
 if(n.type==='healer'&&!n.used){ctx.save();ctx.shadowBlur=14;ctx.shadowColor='#ffb5da';drawFlower(n.x+37,bY-116+Math.sin(clock*4)*3,true);ctx.restore()}
}
function drawEnemyNew(e){if(!e.alive)return;ctx.save();const wobble=Math.sin(e.phase*4)*1.3;
 const dim=e.type==='pumpkin'?[112,107]:e.type==='bat'?[84,74]:e.type==='vine'?[103,92]:[70,72];
 const frame=Math.floor(e.phase*6)%3;ctx.globalAlpha=e.stun>0&&Math.floor(clock*13)%2? .55:1;
 const row=e.attack>0?2:1;if(!drawSheetImage(spriteForEntity('enemy',e.type,e),e.x+e.w/2,e.y+e.h+wobble,dim[0],dim[1],e.dir,row,Math.floor(e.phase*7)%(row===2?3:4)))ellipse(e.x+e.w/2,e.y+e.h/2,dim[0]*.33,dim[1]*.34,'#9a5b99');
 if(e.type==='lemon'&&(e.attack>0||Math.sin(e.phase*5)>.9)){ctx.strokeStyle='#ffef65b8';ctx.lineWidth=3;const x=e.x+e.w/2,y=e.y+e.h/2;ctx.beginPath();ctx.moveTo(x-35,y-20);ctx.lineTo(x-46,y-8);ctx.lineTo(x-35,y-4);ctx.moveTo(x+35,y-20);ctx.lineTo(x+46,y-8);ctx.lineTo(x+35,y-4);ctx.stroke()}
 if(e.type==='vine'&&e.attack>0){ctx.strokeStyle='#87b361';ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(e.x+e.w/2,e.y+35);ctx.quadraticCurveTo(e.x+e.w/2+Math.sin(e.phase*4)*28,e.y-25,e.x+e.w/2+Math.sin(e.phase*4)*51,e.y-9);ctx.stroke()}
 if(e.type==='pumpkin'){ctx.fillStyle='#362946aa';ctx.fillRect(e.x-2,e.y-18,89,7);ctx.fillStyle='#ffbf73';ctx.fillRect(e.x-1,e.y-18,87*LuliEnemies.healthRatio(e),6)}
 ctx.restore()}
function drawRescue(){if(!rescue)return;const x=rescue.x,y=rescue.y+Math.sin(clock*4.5)*9;
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(clock*1.8)*.17);ctx.shadowColor='#ff82d6';ctx.shadowBlur=28;
 ctx.fillStyle='#ff84d4';ctx.beginPath();ctx.moveTo(0,-35);ctx.lineTo(23,-6);ctx.lineTo(0,33);ctx.lineTo(-23,-6);ctx.closePath();ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#fff4c7';ctx.stroke();ctx.shadowBlur=0;
 ctx.fillStyle='#ffe9f7';ctx.beginPath();ctx.moveTo(0,-27);ctx.lineTo(7,-6);ctx.lineTo(0,18);ctx.lineTo(-6,-6);ctx.closePath();ctx.fill();ctx.restore();
 for(let i=0;i<4;i++){const th=clock*2+i*Math.PI/2;ellipse(x+Math.cos(th)*41,y+Math.sin(th)*26,2.6,2.6,'#ffd4f0')}
 ctx.save();ctx.fillStyle='#ffe3f5';ctx.textAlign='center';ctx.font='900 12px system-ui';ctx.fillText('RESGATAR LULI',x,y-48);ctx.restore();
 if(x<cameraX+30||x>cameraX+view.w-40||y<cameraY+25||y>cameraY+view.h-25){const sx=clamp(x-cameraX,45,view.w-45),sy=clamp(y-cameraY,90,view.h-45);const arrow=y<cameraY+25?'↑':y>cameraY+view.h-25?'↓':x<cameraX+30?'◀':'▶';ctx.save();ctx.fillStyle='#ffcdf0';ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillText(arrow+' LULI',cameraX+sx,cameraY+sy);ctx.restore()}
}
function drawPortal(){if(level.gate===null)return;const x=level.gate,bossActive=bossBlocksPortal();const text=levelIndex===LEVELS.length-1?'CASA':'PRÓXIMA FASE';
 ctx.save();ctx.translate(x,level.gateY??FLOOR);ctx.shadowColor=bossActive?'#d18d9e':'#ffe5ba';ctx.shadowBlur=23;
 ctx.strokeStyle=bossActive?'#a16e82':'#f3c998';ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(-42,0);ctx.lineTo(-42,-96);ctx.quadraticCurveTo(0,-156,42,-96);ctx.lineTo(42,0);ctx.stroke();ctx.shadowBlur=0;
 ctx.strokeStyle=bossActive?'#78516f':'#8f6180';ctx.lineWidth=4;ctx.stroke();
 let g=ctx.createRadialGradient(0,-65,3,0,-65,79);g.addColorStop(0,bossActive?'#aaa0bb99':'#f4e1ffdd');g.addColorStop(.6,bossActive?'#ac748455':'#ffb9df99');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(-85,-154,170,160);
 ctx.fillStyle='#ffefc4';ctx.font='900 14px system-ui';ctx.textAlign='center';ctx.fillText(bossActive?'BLOQUEADO':!luliPresent?'RESGATE LULI':parked?'REÚNA A DUPLA':text,0,-167);ctx.restore();}
function drawEnvironmentExtra(){// colorful fruit kingdom islands: small mushrooms, banners and flowers
 const a=Math.floor((cameraX-100)/430),b=Math.ceil((cameraX+view.w+100)/430);
 for(let i=a;i<=b;i++){if(i<0)continue;const x=240+i*430;
 if(!groundAt(x))continue;
 ctx.save();ctx.translate(x,FLOOR);ctx.globalAlpha=.65;
 fillRoundRect(-43,-86,84,71,23,i%2?'#c48898':'#d59d72');
 ellipse(0,-81,61,28,i%2?'#e3a5b5':'#e6b07b');
 fillRoundRect(-13,-53,27,37,7,'#755371');ellipse(-20,-88,7,6,'#fff2d9');ellipse(20,-93,7,6,'#fff2d9');ctx.restore();}
 if(levelIndex===2){const x=1300-cameraX*.3;
 ctx.save();ctx.globalAlpha=.5;ctx.fillStyle='#79a4a1';ctx.fillRect(x,338,view.w,90);ctx.globalAlpha=1;ctx.restore();}
}
function drawParticles(){for(const p of particles){ctx.globalAlpha=clamp(p.t/p.max,0,1);ellipse(p.x,p.y,p.r,p.r,p.color)}ctx.globalAlpha=1}
function drawCheckpoint(){for(const cp of level.checkpoints||[]){const x=cp.x;
 ctx.save();ctx.translate(x,cp.y??FLOOR);
 ctx.strokeStyle='#735866';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-115);ctx.stroke();
 ctx.fillStyle='#efb1a9';ctx.beginPath();ctx.moveTo(2,-114);ctx.quadraticCurveTo(40,-116,60,-105);ctx.lineTo(60,-66);ctx.quadraticCurveTo(29,-84,2,-71);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#fff0bd';ctx.lineWidth=2;ctx.stroke();
 ellipse(30,-93,6,6,'#ffefbd');
 if(activatedCheckpoints.has(cp.id)){ctx.shadowColor='#ffe2b8';ctx.shadowBlur=20;ellipse(30,-93,9,9,'#ffecba');ctx.shadowBlur=0;}
 ctx.restore();
}}

function drawForeground(){
 // tiny golden dust particles, original ambient effect
 for(let i=0;i<23;i++){
  const x=fract(hash(i*66)+clock*(i%2?.005:-.003))*view.w;
  const y=70+fract(hash(i*11)+clock*.018*(.2+hash(i*49)))*360;
  ellipse(x,y,1.4+hash(i)*1.5,1.4+hash(i)*1.5,`rgba(255,234,187,${.24+hash(i)*.45})`);
 }
}


function draw(){ctx.setTransform(canvas.width/view.w,0,0,canvas.height/view.h,0,0);ctx.clearRect(0,0,view.w,view.h);
 if(!level){ctx.fillStyle='#33204d';ctx.fillRect(0,0,view.w,view.h);return}
 drawSky();drawStoneBridge();ctx.save();ctx.translate(-cameraX,-cameraY);drawTrees();drawEnvironmentExtra();drawTerrain();drawDecor();for(const o of puzzle)LuliPuzzles.paint(ctx,o);
 for(const f of fruits)if(!f.found&&f.x>cameraX-35&&f.x<cameraX+view.w+35)drawFruit(f.x,f.y,f.type,12,f.phase);
 drawCheckpoint();drawPortal();
 for(const npc of npcList)if(npc.x>cameraX-110&&npc.x<cameraX+view.w+110)drawNPCNew(npc);
 for(const e of enemies)if(e.alive&&e.x>cameraX-150&&e.x<cameraX+view.w+150)drawEnemyNew(e);
 if(rescue)drawRescue();
 if(companion&&luliPresent){drawPlayable(otherHero(),companion,.98);if(parked&&companion){ctx.fillStyle='#fff4c7';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('AGUARDANDO',companion.x+19,companion.y-18)}}
 if(player&&(!invulnerable||Math.floor(clock*13)%2))drawPlayable(active,player);
 drawParticles();
 if(false&&player){
  ctx.strokeStyle='#ff6aa9';ctx.lineWidth=2;ctx.strokeRect(player.x,player.y,player.w,player.h);
  ctx.strokeStyle='#9cff9b';ctx.beginPath();ctx.moveTo(player.x+player.w/2-12,player.y+player.h);ctx.lineTo(player.x+player.w/2+12,player.y+player.h);ctx.stroke();
  if(companion){ctx.strokeStyle='#9dccff';ctx.strokeRect(companion.x,companion.y,39,65);}
 }
 ctx.restore();drawForeground();
}
function loop(t){if(!lastFrame)lastFrame=t;const dt=Math.min((t-lastFrame)/1000,.05);lastFrame=t;accumulator+=dt;
 let n=0;while(accumulator>=FIXED_DT&&n<3){update(FIXED_DT);accumulator-=FIXED_DT;n++}syncControls();draw();requestAnimationFrame(loop)}
function setup(){resize();activateStudioSprites(window.LULI_CAMPAIGN);level=LEVELS[0];FLOOR=level.height-78;player=bodyAt(level.spawn??95,(level.spawnY??FLOOR)-65);companion=bodyAt(Math.max(1,player.x-50),player.y);makeObjects();showMenu();syncControls();requestAnimationFrame(loop);}
setup();
})();
