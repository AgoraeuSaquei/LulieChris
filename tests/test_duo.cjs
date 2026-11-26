function makeDuoRuntime(game,campaign,story,P,E){
  const elements=new Map(),rects=[];
  const gradient={addColorStop(){}};
  const ctx=new Proxy({fillStyle:'',fillRect(...args){rects.push({color:this.fillStyle,args});},createLinearGradient(){return gradient;},createRadialGradient(){return gradient;}},{get(o,k){return k in o?o[k]:()=>{};}});
  function element(id){
    if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},parentElement:{style:{},classList:{toggle(){}}},addEventListener(){},getContext(){return ctx;},getBoundingClientRect(){return {width:960,height:540};},clientWidth:960,setPointerCapture(){}});
    return elements.get(id);
  }
  const window={LULI_CAMPAIGN:campaign,LULI_STORY:story,addEventListener(){}};
  const document={getElementById:element,addEventListener(){},hidden:false};
  const Image=class{constructor(){this.complete=false;this.naturalWidth=0;}};
  const LuliSheets={ready(){return false;},paint(){return false;},HERO:{idle:{row:0},run:{row:1},jump:{row:2},landing:{row:3},talk:{row:4}}};
  const marker='setup();\n})();';
  if(!game.includes(marker))throw Error('Runtime test hook location changed');
  const instrumented=game.replace(marker,`setup();window.__test={startLevel,nextDialogue,update,draw,drawEnemy:drawEnemyNew,getEnemies:()=>enemies,getWorld:enemyWorld,getMode:()=>mode,bodyAt,followCompanion,animateBody,recall,duoStart,duoEnd,drawPlayable,setPress:ms=>{duoPress=1000-ms;},setCompanion:b=>{companion=b;history=[];},setInput:(left,right,jump)=>{keys.left=left;keys.right=right;keys.jump=jump;},setActive:a=>{active=a;},jump,clearBody,supported,state:()=>({level,player,companion,puzzle,fruits,enemies,npcList,editorEvents,score,levelFruit,heart,active,luliPresent,parked,rescue,checkpointState,startState,activated:activatedCheckpoints,gateRequiresBoss}),position:(x,y)=>{player.x=x;player.y=y;player.vx=0;player.vy=0;player.onGround=true;},reunite:()=>{luliPresent=true;parked=false;companion=pairAt(player,false)?.companion||bodyAt(player.x-48,player.y);},duo:(present,waiting)=>{luliPresent=present;parked=waiting;if(!present)companion=null;},activate:activateCheckpoint,stableBody,hasPair:()=>!!pairAt(player,false),gameOver,restartCheckpoint,checkPortal,hurt,updateRescue,setScore:(s,f)=>{score=s;levelFruit=f;},setHeart:h=>{heart=h;invulnerable=0;},restartLevel:()=>{score=levelStartScore;startLevel(levelIndex);}};\n})();`);
  const fn=new Function('window','document','Image','requestAnimationFrame','localStorage','devicePixelRatio','performance','LuliPuzzles','LuliEnemies','LuliSheets','setTimeout',instrumented);
  fn(window,document,Image,()=>{}, {getItem(){return null;},setItem(){}},1,{now(){return 1000;}},P,E,LuliSheets,()=>{});
  return {...window.__test,clearRects:()=>{rects.length=0;},getRects:()=>rects};
}


function runDuoTests(P,E,campaign,game,story){
 const results=[],assert=(v,m='assertion failed')=>{if(!v)throw Error(m)},test=(n,f)=>{try{f();results.push(n)}catch(e){throw Error(n+': '+e.message)}};
 const r=makeDuoRuntime(game,campaign,story,P,E),s=()=>r.state();
 const begin=i=>{r.startLevel(i);let n=0;while(r.getMode()==='dialog'&&n++<40)r.nextDialogue();};
 const tap=ms=>{r.setPress(ms);r.duoEnd();};
 test('valid non-overlapping initial duo in eight levels',()=>{for(let i=0;i<8;i++){begin(i);assert(r.clearBody(s().player)&&r.clearBody(s().companion)&&!P.overlap(s().player,s().companion),'phase '+(i+1));}});
 test('short tap swaps identities and bodies',()=>{begin(0);const a=s().player,b=s().companion;tap(100);assert(s().active==='chris'&&s().player===b&&s().companion===a);});
 test('hold parks then tap recalls without overlap',()=>{begin(0);tap(650);assert(s().parked);tap(100);assert(!s().parked&&r.clearBody(s().companion)&&!P.overlap(s().player,s().companion));});
 test('cancelled press does not swap',()=>{begin(0);r.setPress(800);r.duoEnd(true);assert(s().active==='luli'&&!s().parked);});
 test('recall cannot place partner through wall',()=>{begin(2);r.position(520,397);r.setCompanion(r.bodyAt(700,397));tap(650);tap(100);assert(s().companion.x+s().companion.w<=576.051&&r.clearBody(s().companion));});
 test('follower tracks movement on floor with bounded speed',()=>{begin(0);r.position(200,397);r.setCompanion(r.bodyAt(144,397));for(let i=0;i<60;i++){s().player.x+=3;s().player.vx=180;r.followCompanion(1/60);assert(r.clearBody(s().companion)&&Math.abs(s().companion.vx)<=381);}assert(s().companion.x>280&&s().companion.x<s().player.x);});
 test('follower respects closed door',()=>{begin(2);r.position(700,397);r.setCompanion(r.bodyAt(480,397));s().player.vx=0;for(let i=0;i<120;i++)r.followCompanion(1/60);assert(s().companion.x+s().companion.w<=576.051);});
 test('follower airborne and landing animation',()=>{begin(0);const b=s().companion;b.onGround=false;b.vy=-400;r.animateBody(b,1/60,true);assert(b.animState==='jump');b.onGround=true;b.vy=0;r.animateBody(b,1/60,false);assert(b.animState==='landing');for(let i=0;i<20;i++)r.animateBody(b,1/60,true);assert(b.animState==='idle');});
 test('Luli double jump remains and Chris cannot double jump',()=>{for(const hero of ['luli','chris']){begin(0);r.position(150,397);r.setActive(hero);r.setInput(false,false,true);r.jump();r.update(1/60);assert(s().player.vy<-650);for(let i=0;i<8;i++)r.update(1/60);let before=s().player.vy;r.jump();r.update(1/60);assert(hero==='luli'?s().player.airJump&&s().player.vy<before:s().player.vy>before,hero);}});
 test('parked partner remains stationary and presses plate',()=>{begin(2);r.position(450,397);r.setCompanion(r.bodyAt(330,383));tap(650);for(let i=0;i<15;i++)r.update(1/60);assert(s().parked&&Math.abs(s().companion.x-330)<.1&&s().puzzle.find(o=>o.kind==='plate').pressed);});
 return {passed:results.length,tests:results};
}
if(typeof module!=='undefined'&&require.main===module){const fs=require('node:fs'),path=require('node:path'),read=f=>fs.readFileSync(path.resolve(__dirname,'..',f),'utf8');require('../puzzles.js');require('../enemies.js');const parse=(s,a,z)=>JSON.parse(s.slice(s.indexOf(a),s.lastIndexOf(z)+1));const result=runDuoTests(globalThis.LuliPuzzles,globalThis.LuliEnemies,parse(read('levels.js'),'{','}'),read('game.js'),parse(read('story.js'),'[',']'));for(const n of result.tests)console.log('PASS — '+n);console.log(result.passed+' testes');}
