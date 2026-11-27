/* Node 18+: node tests/test_enemy_physics.cjs
 * Also callable without Node to run the same tests in a JavaScript sandbox.
 */
function runEnemyTests(P,E,campaign,game,html,story,loadGame){
  const results=[];
  function assert(condition,message='Assertion failed'){if(!condition)throw Error(message);}
  function test(name,fn){fn();results.push(name);}
  const floor={x:0,y:462,w:1000,h:120};
  function world(solids=[floor],surfaces=[floor],width=1000,height=540){return {width,height,floor:height-78,solids,surfaces};}
  function enemy(overrides={}){
    return {type:'plum',x:100,y:414,home:100,homeY:462,w:50,h:48,phase:0,dir:1,range:90,hp:1,ai:{mode:'patrol',speed:55,range:90,aggro:195,jumpInterval:1.5,damage:1},alive:true,stun:0,attack:0,...overrides};
  }
  function tick(e,w,p={x:850,y:397,w:39,h:65},dt=1/60){
    e.phase+=dt;e.stun=Math.max(0,e.stun-dt);e.attack=Math.max(0,e.attack-dt);
    return E.step(e,dt,w,p);
  }
  function clear(e,w){
    assert(e.x>=-.051&&e.x+e.w<=w.width+.051,'enemy outside horizontal bounds');
    assert(!w.solids.some(o=>P.overlap(e,o)),'enemy overlaps solid');
    if(E.modeOf(e)==='fly')assert(!w.surfaces.some(o=>P.overlap(e,o)),'flyer overlaps platform');
  }
  function simulate(e,w,n=600,p){for(let i=0;i<n;i++){assert(tick(e,w,p),'enemy blocked');clear(e,w);}}
  test('boss health ratio: 8, 4, 0 and clamp',()=>{
    const e=enemy({type:'pumpkin',hp:8});assert(E.initialize(e,world()));
    assert(e.maxHp===8&&E.healthRatio(e)===1);
    e.hp=4;assert(E.healthRatio(e)===.5&&e.maxHp===8);
    e.hp=0;assert(E.healthRatio(e)===0);e.hp=99;assert(E.healthRatio(e)===1);
  });
  test('patrol stops at wall and changes direction',()=>{
    const wall={x:180,y:300,w:32,h:162};const w=world([floor,wall]);const e=enemy();
    assert(E.initialize(e,w));let reversed=false;
    for(let i=0;i<120;i++){tick(e,w);clear(e,w);if(e.dir<0)reversed=true;assert(e.x+e.w<=180.051);}
    assert(reversed);
  });
  test('patrol does not walk off an elevated platform',()=>{
    const platform={x:50,y:260,w:140,h:12};const w=world([floor],[floor,platform]);
    const e=enemy({home:100,homeY:260,ai:{mode:'patrol',speed:80,range:200}});
    assert(E.initialize(e,w));simulate(e,w,1000);
    assert(e.y+e.h===260&&e.x>=49&&e.x+e.w<=191);
  });
  test('patrol range and map bounds',()=>{
    const e=enemy({home:10,ai:{mode:'patrol',speed:200,range:20},dir:-1});
    const w=world();assert(E.initialize(e,w));let left=Infinity,right=-Infinity;
    for(let i=0;i<300;i++){tick(e,w);clear(e,w);left=Math.min(left,e.x);right=Math.max(right,e.x);}
    assert(left>=0&&right<=30.001&&right-left>20);
  });
  test('chase respects wall and configured range',()=>{
    const w=world([floor,{x:210,y:300,w:32,h:162}]);
    const e=enemy({ai:{mode:'chase',speed:90,range:120,aggro:500}});
    assert(E.initialize(e,w));simulate(e,w,600,{x:380,w:39});assert(e.x<=160.051);
    const e2=enemy({ai:{mode:'chase',speed:90,range:30,aggro:500}});
    assert(E.initialize(e2,world()));simulate(e2,world(),600,{x:380,w:39});assert(e2.x<=130.001&&e2.x>=129);
  });
  test('jump uses gravity and returns to its platform',()=>{
    const platform={x:40,y:260,w:170,h:12};const w=world([floor],[floor,platform]);
    const e=enemy({type:'pepper',home:100,homeY:260,h:55,ai:{mode:'jump',speed:55,range:180,jumpInterval:1.5}});
    assert(E.initialize(e,w));let min=e.y,max=e.y,landed=false;
    for(let i=0;i<900;i++){tick(e,w);clear(e,w);min=Math.min(min,e.y);max=Math.max(max,e.y);if(i>120&&e.onGround)landed=true;assert(e.y+e.h<=260.051);}
    assert(max-min>40&&max-min<60&&landed,'jump amplitude/landing invalid');
  });
  test('jump stops at ceiling',()=>{
    const ceiling={x:0,y:345,w:300,h:25},w=world([floor,ceiling]);const e=enemy({type:'pepper',h:55,ai:{mode:'jump',speed:0,range:0,jumpInterval:.4}});
    assert(E.initialize(e,w));simulate(e,w,300);assert(e.y>=370-.051);
  });
  test('flying enemy respects walls and one-way platforms',()=>{
    const wall={x:190,y:130,w:32,h:200},platform={x:50,y:175,w:140,h:12};
    const w=world([floor,wall],[floor,platform]);
    const e=enemy({type:'bat',homeY:230,h:54,w:61,ai:{mode:'fly',speed:100,range:150}});
    assert(E.initialize(e,w));simulate(e,w,800);assert(e.x+e.w<=190.051);
  });
  test('stationary enemy keeps x and settles on support',()=>{
    const e=enemy({type:'vine',homeY:448,h:59,w:67,ai:{mode:'stationary',speed:55,range:90}});
    const w=world();assert(E.initialize(e,w));simulate(e,w,300);assert(e.x===100&&e.y+e.h===462);
  });
  test('spawn overlap is repaired without changing maximum life',()=>{
    const e=enemy({homeY:468,type:'pumpkin',hp:8,w:85,h:80});
    const w=world();assert(E.initialize(e,w));clear(e,w);assert(e.y+e.h<=462.051&&e.maxHp===8);
  });
  test('door closing around an enemy repairs the overlap',()=>{
    const e=enemy({home:100,ai:{mode:'patrol',speed:55,range:160}});
    const w=world();assert(E.initialize(e,w));w.solids.push({x:120,y:300,w:32,h:162});
    assert(tick(e,w));clear(e,w);assert(!e.blocked);
  });
  test('respawn after falling preserves current and maximum health',()=>{
    const e=enemy({hp:8,type:'pumpkin',ai:{mode:'stationary',speed:0,range:0}});
    const w=world();assert(E.initialize(e,w));e.hp=3;e.y=w.height+100;
    assert(tick(e,w));clear(e,w);assert(e.hp===3&&e.maxHp===8&&e.x===100);
  });
  test('stunned enemies do not move horizontally',()=>{
    const e=enemy({stun:1});const w=world();assert(E.initialize(e,w));
    const x=e.x;simulate(e,w,30);assert(e.x===x);
  });
  test('runtime script order and syntax',()=>{
    assert(html.indexOf('src="puzzles.js"')<html.indexOf('src="enemies.js"'));
    assert(html.indexOf('src="enemies.js"')<html.indexOf('src="game.js"'));
    new Function(game);
  });
  const runtime=loadGame(game,campaign,story,P,E);
  let total=0;
  test('all actual campaign enemies: 1200 ticks per level with active chase targets',()=>{
    assert(campaign.levels.length===8);
    for(let i=0;i<campaign.levels.length;i++){
      runtime.startLevel(i);
      const raw=campaign.levels[i].entities.filter(o=>o.kind==='enemy');
      const enemies=runtime.getEnemies(),w=runtime.getWorld();
      assert(enemies.length===raw.length,'level '+(i+1)+' count changed');total+=enemies.length;
      for(let k=0;k<enemies.length;k++){
        const e=enemies[k],cfg=raw[k];assert(e.home===cfg.x&&e.homeY===cfg.y&&e.hp===cfg.hp&&e.maxHp===cfg.hp,'level '+(i+1)+' data changed');
        assert(!e.blocked,'initial spawn blocked: level '+(i+1)+' '+e.type);clear(e,w);
      }
      for(let t=0;t<1200;t++)for(const e of enemies){
        const p={x:e.home+(Math.floor(t/180)%2?150:-150),w:39,y:e.y,h:65};
        assert(tick(e,w,p),'level '+(i+1)+' '+e.type+' blocked at tick '+t);clear(e,w);
        assert(e.y>=-.051&&e.y+e.h<=w.height+.051,'level '+(i+1)+' '+e.type+' outside vertical bounds at tick '+t+' y='+e.y);
        assert(Math.abs(e.x-e.home)<=e.ai.range+.051,'level '+(i+1)+' patrol range exceeded');
      }
    }
    assert(total===25,'unexpected enemy count');
  });
  test('real game boss bar draws 100%, 50%, 12.5%',()=>{
    runtime.startLevel(7);const boss=runtime.getEnemies().find(e=>e.type==='pumpkin');
    assert(boss.hp===8&&boss.maxHp===8);
    for(const hp of [8,4,1]){boss.hp=hp;runtime.clearRects();runtime.drawEnemy(boss);const bar=runtime.getRects().filter(r=>r.color==='#ffbf73').pop();assert(bar&&Math.abs(bar.args[2]-87*hp/8)<.001,'incorrect bar at hp '+hp);}
  });
  test('game initializes, updates and renders all eight levels with mocked browser APIs',()=>{
    for(let i=0;i<8;i++){
      runtime.startLevel(i);let n=0;while(runtime.getMode()==='dialog'&&n++<100)runtime.nextDialogue();
      assert(runtime.getMode()==='playing','level '+(i+1)+' did not start');
      for(let t=0;t<120;t++){runtime.update(1/60);if(runtime.getMode()==='dialog')runtime.nextDialogue();}
      runtime.draw();
    }
  });
  test('visual pass: distinct palettes, deterministic draw and unchanged collision geometry',()=>{
    const rt=loadGame(game,campaign,story,P,E),palettes=new Set();
    for(let i=0;i<campaign.levels.length;i++){
      rt.startLevel(i);for(let j=0;j<35&&rt.getMode()==='dialog';j++)rt.nextDialogue();
      palettes.add(rt.getArtPalette().sky.join(','));
      const raw=campaign.levels[i],world=JSON.stringify(rt.getWorld());
      for(const width of [320,960,1700])for(const pos of [[0,0],[Math.max(0,raw.width-width),Math.max(0,raw.height-540)]]){
        rt.setArtCamera(pos[0],pos[1],width);rt.clearRects();rt.draw();
        const rects=rt.getRects();assert(rects.length>50&&rects.length<15000,'unexpected draw count '+rects.length);
        assert(rects.every(r=>r.args.every(Number.isFinite)&&r.args[2]>=0&&r.args[3]>=0),'invalid drawing rectangle');
        const before=JSON.stringify(rects);rt.clearRects();rt.draw();assert(JSON.stringify(rt.getRects())===before,'nondeterministic frame');
        assert(JSON.stringify(rt.getWorld())===world,'drawing mutated collision geometry');
      }
    }assert(palettes.size===8,'palette reused');
  });
  test('visual pass: pressure plate and horizontal door show different states',()=>{
    const rt=loadGame(game,campaign,story,P,E);rt.startLevel(7);rt.setArtCamera(0,0,960);
    const draw=o=>{rt.clearRects();rt.drawArtPuzzle(o);return JSON.stringify(rt.getRects())};
    const plate={kind:'plate',x:544,y:192,w:96,h:12,channel:'A',pressed:false};
    assert(draw(plate)!==draw({...plate,pressed:true}),'plate status not visible');
    const door={kind:'door',x:640,y:192,w:352,h:30,channel:'A',open:false};
    assert(draw(door)!==draw({...door,open:true}),'door status not visible');
    assert(draw({...door,x:4000})==='[]','offscreen geometry drawn');
  });
  return {passed:results.length,tests:results,enemies:total,physicsTicks:total*1200};
}
function makeRuntime(game,campaign,story,P,E){
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
  const instrumented=game.replace(marker,`setup();window.__test={startLevel,nextDialogue,update,draw,drawEnemy:drawEnemyNew,getEnemies:()=>enemies,getWorld:enemyWorld,getMode:()=>mode,setArtCamera:(x,y,w)=>{cameraX=x;cameraY=y;view.w=w;},getArtPalette:mapArt,drawArtPuzzle:drawMapPuzzle};\n})();`);
  const fn=new Function('window','document','Image','requestAnimationFrame','localStorage','devicePixelRatio','performance','LuliPuzzles','LuliEnemies','LuliSheets','setTimeout',instrumented);
  fn(window,document,Image,()=>{}, {getItem(){return null;},setItem(){}},1,{now(){return 1000;}},P,E,LuliSheets,()=>{});
  return {...window.__test,clearRects:()=>{rects.length=0;},getRects:()=>rects};
}
if(typeof module!=='undefined'&&require.main===module){
  const fs=require('node:fs'),path=require('node:path');
  const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
  require('../puzzles.js');require('../enemies.js');
  const parse=s=>JSON.parse(s.slice(s.indexOf(s.includes('LULI_STORY')?'[':'{'),s.lastIndexOf(s.includes('LULI_STORY')?']':'}')+1));
  const result=runEnemyTests(globalThis.LuliPuzzles,globalThis.LuliEnemies,parse(read('levels.js')),read('game.js'),read('index.html'),parse(read('story.js')),makeRuntime);
  for(const name of result.tests)console.log('PASS — '+name);
  console.log(result.passed+' testes | '+result.enemies+' inimigos | '+result.physicsTicks+' passos de física');
}
