function makeHudRuntime(game,campaign,story,P,E){
  const elements=new Map(),rects=[],windowEvents={},documentEvents={};
  const gradient={addColorStop(){}};
  const ctx=new Proxy({fillStyle:'',fillRect(...args){rects.push({color:this.fillStyle,args});},createLinearGradient(){return gradient;},createRadialGradient(){return gradient;}},{get(o,k){return k in o?o[k]:()=>{};}});
  function element(id){
    if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},parentElement:{style:{},dataset:{},classList:{toggle(){}}},events:{},addEventListener(n,f){(this.events[n]??=[]).push(f);},getContext(){return ctx;},getBoundingClientRect(){return {width:960,height:540};},clientWidth:960,setPointerCapture(){}});
    return elements.get(id);
  }
  const window={LULI_CAMPAIGN:campaign,LULI_STORY:story,addEventListener(n,f){(windowEvents[n]??=[]).push(f);}};
  const document={getElementById:element,addEventListener(n,f){(documentEvents[n]??=[]).push(f);},hidden:false};
  const Image=class{constructor(){this.complete=false;this.naturalWidth=0;}};
  const LuliSheets={ready(){return false;},paint(){return false;},HERO:{idle:{row:0},run:{row:1},jump:{row:2},landing:{row:3},talk:{row:4}}};
  const marker='setup();\n})();';
  if(!game.includes(marker))throw Error('Runtime test hook location changed');
  const instrumented=game.replace(marker,`setup();window.__test={startLevel,nextDialogue,update,draw,drawEnemy:drawEnemyNew,getEnemies:()=>enemies,getWorld:enemyWorld,getMode:()=>mode,keys,updateHUD,syncControls,pause,resume,releaseInputs,inputKey,bodyAt,followCompanion,animateBody,recall,duoStart,duoEnd,drawPlayable,setPress:ms=>{duoPress=1000-ms;},setCompanion:b=>{companion=b;history=[];},setInput:(left,right,jump)=>{keys.left=left;keys.right=right;keys.jump=jump;},setActive:a=>{active=a;},jump,clearBody,supported,state:()=>({level,player,companion,puzzle,fruits,enemies,npcList,editorEvents,score,levelFruit,heart,active,luliPresent,parked,rescue,checkpointState,startState,activated:activatedCheckpoints,gateRequiresBoss}),position:(x,y)=>{player.x=x;player.y=y;player.vx=0;player.vy=0;player.onGround=true;},reunite:()=>{luliPresent=true;parked=false;companion=pairAt(player,false)?.companion||bodyAt(player.x-48,player.y);},duo:(present,waiting)=>{luliPresent=present;parked=waiting;if(!present)companion=null;},activate:activateCheckpoint,stableBody,hasPair:()=>!!pairAt(player,false),gameOver,restartCheckpoint,checkPortal,hurt,updateRescue,setScore:(s,f)=>{score=s;levelFruit=f;},setHeart:h=>{heart=h;invulnerable=0;},restartLevel:()=>{score=levelStartScore;startLevel(levelIndex);}};\n})();`);
  const fn=new Function('window','document','Image','requestAnimationFrame','localStorage','devicePixelRatio','performance','LuliPuzzles','LuliEnemies','LuliSheets','setTimeout',instrumented);
  fn(window,document,Image,()=>{}, {getItem(){return null;},setItem(){}},1,{now(){return 1000;}},P,E,LuliSheets,()=>{});
  return {...window.__test,element,emit:(id,n,p)=>{for(const f of element(id).events[n]||[])f({pointerId:p,preventDefault(){}});},win:n=>{for(const f of windowEvents[n]||[])f({});},clearRects:()=>{rects.length=0;},getRects:()=>rects};
}



function runHudTests(P,E,campaign,game,story,html,css){
 const results=[],assert=(v,m='assertion failed')=>{if(!v)throw Error(m)},test=(n,f)=>{try{f();results.push(n)}catch(e){throw Error(n+': '+e.message)}};
 const r=makeHudRuntime(game,campaign,story,P,E),begin=i=>{r.startLevel(i);let n=0;while(r.getMode()==='dialog'&&n++<40)r.nextDialogue();r.syncControls();},key=(code,down)=>r.inputKey({code,repeat:false,preventDefault(){}},down);
 test('HUD preserves phase, lives, fruit, active character and objectives',()=>{begin(0);r.updateHUD();assert(r.element('levelText').textContent.includes('Onde estamos'));assert(r.element('duoText').textContent==='LULI'&&r.element('heartText').textContent.includes('♥')&&r.element('fruitText').textContent===0&&r.element('objectiveText').textContent==='Alcance o portal');});
 test('direction and jump have independent pointers',()=>{begin(0);r.emit('rightBtn','pointerdown',1);r.emit('jumpBtn','pointerdown',2);assert(r.keys.right&&r.keys.jump);r.emit('jumpBtn','pointerup',2);assert(r.keys.right&&!r.keys.jump);r.emit('rightBtn','pointerup',1);assert(!r.keys.right);});
 test('two touches on same button survive first release',()=>{begin(0);r.emit('rightBtn','pointerdown',1);r.emit('rightBtn','pointerdown',2);r.emit('rightBtn','pointerup',1);assert(r.keys.right);r.emit('rightBtn','pointercancel',2);assert(!r.keys.right);});
 test('keyboard and touch sources do not cancel each other',()=>{begin(0);key('KeyD',true);r.emit('rightBtn','pointerdown',1);key('KeyD',false);assert(r.keys.right);r.emit('rightBtn','pointerup',1);assert(!r.keys.right);});
 test('alternate keys are independent',()=>{begin(0);key('KeyA',true);key('ArrowLeft',true);key('KeyA',false);assert(r.keys.left);key('ArrowLeft',false);assert(!r.keys.left);});
 test('lost capture releases only owning pointer',()=>{begin(0);r.emit('leftBtn','pointerdown',1);r.emit('jumpBtn','pointerdown',2);r.emit('leftBtn','lostpointercapture',1);assert(!r.keys.left&&r.keys.jump);r.emit('jumpBtn','pointerup',2);});
 test('duo pointer ownership rejects second touch and stale release',()=>{begin(0);r.emit('duoBtn','pointerdown',1);r.emit('duoBtn','pointerdown',2);r.emit('duoBtn','pointerup',2);assert(r.state().active==='luli');r.emit('duoBtn','pointerup',1);assert(r.state().active==='chris');r.emit('duoBtn','lostpointercapture',1);assert(r.state().active==='chris');});
 test('blur and orientation reset all input',()=>{begin(0);r.emit('rightBtn','pointerdown',1);key('Space',true);r.win('blur');assert(!r.keys.right&&!r.keys.jump);r.emit('leftBtn','pointerdown',2);r.win('orientationchange');assert(!r.keys.left);});
 test('pause clears held input and resume does not reactivate',()=>{begin(0);r.emit('rightBtn','pointerdown',1);r.pause();r.syncControls();assert(!r.keys.right&&r.element('touchControls').dataset.mode==='paused');r.resume();r.syncControls();assert(!r.keys.right&&r.element('touchControls').dataset.mode==='playing');});
 test('boss meter uses 8 maximum HP',()=>{begin(7);const boss=r.state().enemies.find(e=>e.type==='pumpkin');boss.hp=4;r.updateHUD();assert(r.element('bossFill').style.width==='50%'&&r.element('bossHearts').textContent.includes('4/8'));});
 test('responsive layout contracts and IDs',()=>{for(const id of ['duoStatus','objectiveText','phaseProgress','duoHoldFill','duoButtonLabel','interactLabel','bossFill'])assert(html.includes('id="'+id+'"'),id);assert(css.includes('env(safe-area-inset-bottom)')&&css.includes('100dvh')&&css.includes('min-width:44px')&&css.includes('prefers-reduced-motion'));});
 return {passed:results.length,tests:results};
}
if(typeof module!=='undefined'&&require.main===module){const fs=require('node:fs'),path=require('node:path'),read=f=>fs.readFileSync(path.resolve(__dirname,'..',f),'utf8');require('../puzzles.js');require('../enemies.js');const parse=(s,a,z)=>JSON.parse(s.slice(s.indexOf(a),s.lastIndexOf(z)+1));const result=runHudTests(globalThis.LuliPuzzles,globalThis.LuliEnemies,parse(read('levels.js'),'{','}'),read('game.js'),parse(read('story.js'),'[',']'),read('index.html'),read('style.css'));for(const n of result.tests)console.log('PASS — '+n);console.log(result.passed+' testes');}
