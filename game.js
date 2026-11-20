"use strict";

const $ = id => document.getElementById(id);
const canvas = $("field"), ctx = canvas.getContext("2d");
const PI = Math.PI, TAU = PI * 2;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const between = (min, max) => min + Math.random() * (max - min);
const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const turn = n => Math.atan2(Math.sin(n), Math.cos(n));
const range = (x, y, a, n) => ({x:x + Math.cos(a)*n, y:y + Math.sin(a)*n});
const smallMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let touchUI=matchMedia("(pointer: coarse)").matches, touchRotated=false;
const DASH_COOLDOWN=2.3;
const DASH_REDUCTION_CAP=80, DASH_MIN_COOLDOWN=DASH_COOLDOWN*(100-DASH_REDUCTION_CAP)/100;
const CINDER={targets:3,ticks:4,interval:.45,damage:5};
const DASH_EDGE={damage:50,time:1.4,cooldown:1.5};
const DASH_STRIKE={targets:4,mobDamage:30,bossDamage:42};
const DASH_MIRROR={heal:10,interval:6,refund:.32};
const DUST={kill:.5,limit:25,boss:10};
const REVIVE_HP_PERCENT=20;
const RELIC_STACK_LIMIT=5, RESTRICTED_RELIC_STACK_LIMIT=3;
const LEECH_KILL_HEAL=2, LEECH_LIMIT=30, LEECH_BOSS_HEAL=10;
const BASE_ASH={hit:.9,bossHit:.65,kill:1.75,perfectDodge:5.5};
const FLOOR_BELL_DAMAGE=[90,113,137,160,183,207,230];
const EMBER_ORB={cooldown:3.25,reach:455,speed:660,radius:16,damage:46,spread:.24,repeat:[1,.55,.35,.24,.16],pierce:.70,outerPower:.60};
const EMBER_SPLASH={impact:20,damage:17,targets:3,reach:72};
const EMBER_SLOW=2;
const WARDEN_ATTACKS=["slam","fan","rush"];
const WARDEN_RUSH=[
  {trigger:320,reach:355,speed:650,damage:24,recovery:1.14},
  {trigger:370,reach:415,speed:780,damage:28,recovery:.92}
];
const arenas = ["arena", "arena-2", "arena-3", "arena-4", "arena-5", "arena-6", "arena-7"];
const art = {};
let spriteAtlasState="loading";
function requestArt(name,priority="auto",retry=false){
  if(art[name]&&!retry)return art[name];
  const source=name==="sprites"?"sprites.png":name+".jpg";
  const url = source;
  const img=new Image();img.fetchPriority=priority;
  art[name]=img;
  img.src=retry&&!url.startsWith("data:")?url+"?retry="+Date.now():url;
  return img;
}
function syncStartArtwork(){
  $("start").disabled=spriteAtlasState==="loading";
  $("start").setAttribute("aria-busy",String(spriteAtlasState==="loading"));
  $("startLabel").textContent=spriteAtlasState==="ready"?"开始远征":spriteAtlasState==="error"?"重试加载":"正在加载画面…";
  $("startStatus").hidden=spriteAtlasState!=="error";
}
function loadSpriteAtlas(retry=false){
  spriteAtlasState="loading";syncStartArtwork();
  const img=requestArt("sprites","high",retry);
  const finish=()=>{
    if(art.sprites!==img)return;
    const ready=img.complete&&img.naturalWidth>0;
    spriteAtlasState=ready?"ready":"error";syncStartArtwork();
    if(ready)requestArt(arenas[0],"low");
  };
  if(typeof img.decode==="function")img.decode().then(finish,finish);
  else if(img.complete)finish();
  else{
    img.addEventListener("load",finish,{once:true});
    img.addEventListener("error",finish,{once:true});
  }
}
function startFromMenu(){
  if(spriteAtlasState==="ready")begin();
  else if(spriteAtlasState==="error")loadSpriteAtlas(true);
}

const beasts = {
  hound: {name:"裂骨猎犬", hp:64, speed:144, r:18, size:80, color:"#f3a46e", frame:[548,92,419,367], tell:.38, damage:11},
  archer:{name:"青灯引魂者", hp:74, speed:106, r:19, size:83, color:"#73e0d6", frame:[1083,77,353,402], tell:.63, damage:10},
  brute: {name:"紫脊石像", hp:144, speed:83, r:27, size:102, color:"#cfa1fa", frame:[49,572,430,389], tell:.78, damage:18},
  eye:   {name:"蚀日之眼", hp:90, speed:122, r:18, size:78, color:"#ffae5b", frame:[575,542,330,408], tell:.71, damage:15},
  warden:{name:"铸钟守卫", hp:1850, speed:94, r:39, size:151, color:"#d1abeb", frame:[955,513,560,461], tell:.83, damage:20, boss:true},
  bell:  {name:"永夜钟主", hp:4850, speed:111, r:49, size:184, color:"#ffaf67", frame:[955,513,560,461], tell:.76, damage:23, boss:true}
};

const schools = {
  sword:{name:"普攻", relics:[
    ["steel","✦","赤钢刃心","J 普攻伤害提高 14%。",p=>p.power*=1.14],
    ["reach","◐","焰纹护手","普攻范围提高 16%，伤害提高 5%。",p=>{p.reach*=1.16;p.power*=1.05}],
    ["quick","⌁","亡风之羽","普攻的出招和收招时间缩短 15%。",p=>p.haste*=.85],
    ["cinder","♨","沸火余烬",`每次普攻最多点燃 ${CINDER.targets} 个目标。每份在 1.8 秒内对每个点燃目标造成 ${CINDER.ticks*CINDER.damage} 点伤害。再次点燃刷新持续时间。`,p=>p.burn++],
    ["cleaver","✹","回火刃尖","武器与余烬刃的第三段普攻伤害提高 30%。",p=>p.finisherPower*=1.3],
    ["cadence","♩","拍火之谱","普攻时间缩短 10%，接招窗口延长 0.10 秒。完美接招的伤害加成提高 8 个百分点，命中时额外获得 1 点余烬。",p=>{p.haste*=.90;p.linkEase+=.05;p.perfectPower+=.08;p.perfectAsh++}]
  ]},
  dash:{name:"闪步", relics:[
    ["steps","⟡","幽步齿轮","闪步冷却缩短 25%。",p=>p.dashRate*=.75,RESTRICTED_RELIC_STACK_LIMIT],
    ["blade","➶","逆刃之轨",`每份使闪步穿过小怪时造成 ${DASH_STRIKE.mobDamage} 点伤害，穿过首领时造成 ${DASH_STRIKE.bossDamage} 点。每次闪步最多命中 ${DASH_STRIKE.targets} 个目标。`,p=>p.dashStrike++,RESTRICTED_RELIC_STACK_LIMIT],
    ["stride","⟐","夜行者之靴","移动速度提高 20%。",p=>p.speed*=1.20],
    ["breach","↝","破阵踝甲",`闪步后 ${DASH_EDGE.time} 秒内，触发附伤的普攻最多对两个目标各附加每份 ${DASH_EDGE.damage} 点伤害。首次附伤命中后进入 ${DASH_EDGE.cooldown} 秒冷却，叠加只增加伤害。`,p=>p.dashEdge++,RESTRICTED_RELIC_STACK_LIMIT],
    ["drift","⇥","风行斗篷","闪步距离提高 15%，冷却缩短 15%。",p=>{p.dashSpeed*=1.15;p.dashRate*=.85}],
    ["mirror","⌾","镜行印",`完美闪步减少本次冷却 ${DASH_MIRROR.refund} 秒，计入 ${DASH_REDUCTION_CAP}% 总减冷却上限。恢复 ${DASH_MIRROR.heal} 点生命，回血每 ${DASH_MIRROR.interval} 秒最多触发一次。`,p=>{p.dodgeHeal+=DASH_MIRROR.heal;p.dodgeRefund+=DASH_MIRROR.refund}]
  ]},
  flame:{name:"焚球", relics:[
    ["kiln","♨","炉心炭","所有焚球的伤害提高 28%。",p=>p.skillPower*=1.28],
    ["cycle","⌘","不灭灯油","每份使焚印冷却缩短 25%，效果按乘法叠加。",p=>p.skillRate*=.75,RESTRICTED_RELIC_STACK_LIMIT],
    ["pierce","⇢","穿炉铜芯",`中央焚球伤害提高 36%，每份可多穿透两个敌人。每穿透一个，新目标承受上一次的 ${Math.round(EMBER_ORB.pierce*100)}% 穿透伤害，再结算同目标多球衰减。`,p=>{p.orbCenterPower*=1.36;p.orbPierces+=2}],
    ["wings","☄","双翼余火","所有侧翼焚球的伤害提高 48%，也强化五芒焰芯新增的焚球。",p=>p.orbSidePower*=1.48],
    ["focus","◈","聚火棱镜","扇形夹角缩小 40%，焚球伤害提高 14%。同一次施放中，从第二颗命中同一目标的焚球起，每颗的伤害倍率提高 12 个百分点。",p=>{p.orbSpread*=.60;p.skillPower*=1.14;p.orbRepeat+=.12}],
    ["range","➵","长燃灯芯","焚球飞行距离增加 15%，飞行速度提高 32%，伤害提高 13%。",p=>{p.orbReach*=1.15;p.orbSpeed*=1.32;p.skillPower*=1.13}],
    ["splash","✹","裂火晶核",`每次焚印首次命中额外造成 ${EMBER_SPLASH.impact} 点伤害，并溅射附近最多 ${EMBER_SPLASH.targets} 个敌人，各受 ${EMBER_SPLASH.damage} 点伤害。叠加提高两种伤害。`,p=>p.orbSplash++],
    ["frost","❄","霜芯烛",`焚球伤害提高 18%，命中后的减速时长每份增加 ${EMBER_SLOW} 秒。普通敌人减速 30%，首领减速 12%。`,p=>{p.skillPower*=1.18;p.orbSlow+=EMBER_SLOW}],
    ["fivefold","✶","五芒焰芯",`让焚印向两侧各多发射一颗焚球。新增焚球的基础伤害为普通侧翼焚球的 ${Math.round(EMBER_ORB.outerPower*100)}%，同样享受侧翼遗物加成。`,p=>p.orbPairs++,1]
  ]},
  bell:{name:"丧钟", relics:[
    ["doom","☉","黑日之环","丧钟对普通和精英怪伤害提高 16%，对首领提高 32%。余烬获取提高 5%。",p=>{p.ultPower*=1.16;p.ultBossPower*=1.32;p.ashRate*=1.05}],
    ["echo","♫","回音铜舌","战斗中的余烬获取提高 20%。",p=>p.ashRate*=1.20],
    ["refund","⟳","不熄钟芯","每次释放丧钟返还 20 点余烬，丧钟伤害提高 10%。",p=>{p.ultRefund+=20;p.ultPower*=1.10;p.ultBossPower*=1.10},RESTRICTED_RELIC_STACK_LIMIT],
    ["requiem","✚","安魂钟绳","每次释放丧钟回复 15 点生命。",p=>p.ultHeal+=15,RESTRICTED_RELIC_STACK_LIMIT],
    ["dust","♢","拾灰王冠",`每份让非丧钟击杀小怪额外获得 ${DUST.kill} 点基础余烬，每层最多 ${DUST.limit} 点。每削去首领 20% 最大生命，额外获得 ${DUST.boss} 点基础余烬，最多触发四次。`,p=>p.dust++],
    ["sanctum","◎","回声圣盾","丧钟范围提高 12%，施放后无敌延长 0.5 秒，并返还 10 点余烬。",p=>{p.ultReach*=1.12;p.ultInv+=.5;p.ultRefund+=10}]
  ]},
  ward:{name:"生存", relics:[
    ["mercy","✚","破碎圣徽","生命上限增加 25，立即回复 40 点生命。",p=>{p.maxHp+=25;p.hp+=40}],
    ["vamp","♦","温热血石",`击杀小怪时，每份回复 ${LEECH_KILL_HEAL} 点生命，每层小怪击杀回血上限每份增加 ${LEECH_LIMIT} 点。每打掉首领 20% 最大生命，每份再回 ${LEECH_BOSS_HEAL} 点，每个首领最多触发四次。`,p=>p.leech++],
    ["plate","⬡","钟铜残片","受到的伤害降低 15%。",p=>p.armor*=.85,RESTRICTED_RELIC_STACK_LIMIT],
    ["guard","◇","无声庇佑",`每份提供一次复活。受到致命伤害时消耗一次，原地恢复至最大生命值的 ${REVIVE_HP_PERCENT}%。`,p=>p.revives++],
    ["balm","✿","晚钟药囊","立即回复 30 点生命，此后每进入新一层额外回复 25 点。",p=>{p.hp+=30;p.roomHeal+=25}],
    ["skin","◈","白铁甲片","受到的伤害降低 8%，受伤后的无敌时间延长 0.34 秒。",p=>{p.armor*=.92;p.hurtInv+=.34}]
  ]}
};
const relics=Object.entries(schools).flatMap(([school,{relics:items}])=>items.map(([id,icon,name,text,add,maxCopies=RELIC_STACK_LIMIT])=>({school,id,icon,name,text,add,maxCopies})));
const RELIC_STACK_NOTE=`同名遗物通常最多叠 ${RELIC_STACK_LIMIT} 份。${relics.filter(r=>r.maxCopies===RESTRICTED_RELIC_STACK_LIMIT).map(r=>r.name).join("、")}最多各叠 ${RESTRICTED_RELIC_STACK_LIMIT} 份。五芒焰芯每局最多获得 1 份。`;

const routes = {
  standard:{icon:"◇", name:"钟鸣捷径", color:"#ffd2a1", trade:"入场补给，武器三选一", heal:15, entryAsh:20, enemyHealth:.90, enemyHealthIncludesBoss:true, weaponReward:true},
  elite:{icon:"✹", name:"赤咒祭坛", color:"#ef8c65", trade:"强化敌群，额外遗物", heal:0, enemyDamage:1.20, enemyWindup:.88},
  shrine:{icon:"✚", name:"寂钟圣所", color:"#9be1be", trade:"补血，余烬减半", heal:40, enemyHealth:.85, ashGain:.50}
};
const ELITE_ROOMS={entry:"hound",ring:"archer"}, ELITE_COUNT=Object.keys(ELITE_ROOMS).length;
const ELITE_HEALTH=1.35, ELITE_SPEED=1.12;
const FLOOR_MOB_HEALTH=[1,1.27,1.60,2.00,2.48,3.05,3.72];
const FLOOR_ENEMY_TOTALS=[27,31,36,38,43,43,38]; // Base roster, including bosses and excluding summons and route elites.
const rooms = [
  ["余灰门廊", "h h h", "h h a h"],
  ["断钟回廊", "h a h a", "h b h a"],
  ["无灯祭坛", "a h o h b", "b o a h"],
  ["铸钟之间", "w"],
  ["霜月墓庭", "b h o a h", "b o a h o"],
  ["蚀日圣殿", "b b a o h o", "b a a o h h"],
  ["永夜钟楼", "B"]
];
const mobCode = {h:"hound",a:"archer",b:"brute",o:"eye",w:"warden",B:"bell"};
const reinforcements = [[],["h h a"],["b h o"],[],["a b h o","b o a a h"],["b h o a o","b b a h o"],[]];
const chambers = {
  entry:{name:"封门前厅",icon:"◇",note:"肃清前厅，再沿走廊探索支路。",color:"#e8b789"},
  valve:{name:"止火阀室",icon:"⟐",note:"肃清后关闭本层陷阱对你的伤害，并打开通往中庭的密道。",color:"#89d3c8",hazard:"cross"},
  coil:{name:"逆流钟室",icon:"⌘",note:"肃清后，本层的机关也能击中敌人。引它们走进发光区域。",color:"#c5aafa",hazard:"echo"},
  ring:{name:"轮转中庭",icon:"◈",note:"机关交替轰击中心和外环。内外圈之间有安全带。",color:"#efb675",hazard:"ring"},
  gate:{name:"封印出口",icon:"♜",note:"肃清其余房间才可进入。击败这里的敌人即可过层。",color:"#f3ca9a"}
};
const tips = ["J 键亮起时再按，触发完美接刃", "在敌人出手时闪步，擦过攻击可积攒额外余烬", "E 朝前射三颗焚球，贴近时更容易同时命中", "绕到守卫侧面，等它收招再反击", "余烬蓄满后按 Q，震击附近视线内的敌人", "留一次闪步穿过连环攻击", "钟主在半血后进入第二阶段"];
const roomMood=["陈灰与断钟", "蓝璃浸于积水", "幽灯照着林间祭石", "赤铜在炉火中沸腾", "霜雪覆盖无名墓碑", "星轨在紫晶间运转", "蚀日悬在钟楼之外"];
const swordMoves=[
  {name:"横扫",key:"sweep",r:82,arc:.88,power:13,total:.34,wind:.055,step:5},
  {name:"突刺",key:"thrust",r:108,width:16,power:17,total:.38,wind:.08,step:11},
  {name:"回旋",key:"cleave",r:98,arc:1.22,power:22,total:.48,wind:.105,step:9}
];

function readSave() {
  try {return JSON.parse(localStorage.getItem("ashwake-v1")) || {}} catch {return {}}
}
const prior=readSave();
const save = {runs:Number(prior.runs)||0,wins:Number(prior.wins)||0,best:Number(prior.best)||0,kills:Number(prior.kills)||0,unlocked:{...prior.unlocked},muted:prior.muted===true,touchLeft:prior.touchLeft===true,touchLarge:prior.touchLarge===true};
function storeSave(){try{localStorage.setItem("ashwake-v1",JSON.stringify(save))}catch{}}
function updateBest(){ $("best").textContent = save.runs ? `最佳 ${save.best} / 7 层 · 通关 ${save.wins}` : "最佳 — / 7 层"; }
function syncSound(){ $("sound").setAttribute("aria-pressed",String(!save.muted)); $("sound").innerHTML=save.muted ? '◖× <span>静音</span>' : '◖)) <span>音效</span>'; }

let audio, audioOut, ambientStep=0, nextTone=0;
function wakeAudio(){
  if (save.muted) return;
  try {
    if (!audio){audio=new (window.AudioContext||window.webkitAudioContext)();audioOut=audio.createGain();audioOut.gain.value=.38;audioOut.connect(audio.destination)}
    if(audio.state==="suspended") audio.resume().catch(()=>{});
  } catch {}
}
function tone(freq, end, time, volume, type="sine", delay=0){
  if(!audio||save.muted||audio.state!=="running") return;
  const t=audio.currentTime+delay, osc=audio.createOscillator(), gain=audio.createGain();
  osc.type=type;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+time);
  gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(volume,t+Math.min(.025,time/4));gain.gain.exponentialRampToValueAtTime(.001,t+time);
  osc.connect(gain);gain.connect(audioOut);osc.start(t);osc.stop(t+time+.01);
}
function sfx(name,after=0){
  switch(name){
    case "attack":tone(224,40,.105,.11,"triangle");break;
    case "hit":tone(89,38,.13,.26,"triangle");tone(430,80,.085,.08,"sawtooth");break;
    case "dash":tone(510,95,.18,.125,"triangle");break;
    case "orbs":[0,.025,.055].forEach(delay=>tone(510,92,.21,.105,"triangle",delay));break;
    case "hurt":tone(92,32,.32,.43,"triangle");break;
    case "tell":tone(265,165,.22,.08,"triangle");break;
    case "seal":tone(98,41,.32,.24,"triangle");tone(324,110,.14,.10,"sawtooth",.035);break;
    case "wardenRush":tone(102,41,.31,.24,"triangle");tone(364,96,.23,.085,"sawtooth",.025);break;
    case "bell": [61,123,185,247,370].forEach((f,i)=>tone(f,f*.99,1.8-i*.2,.22/(1+i*.6),i>1?"sine":"triangle"));break;
    case "clear": [196,247,293,392].forEach((f,i)=>tone(f,f,.57,.12,"sine",after+i*.12));break;
    case "choose":tone(440,660,.26,.15,"sine");break;
  }
}

let state="home", W=1120,H=630, scale=1, dpr=1, ox=0, oy=0, last=0, visualTime=0, hudTime=0;
let relicInventoryReturn="fight";
let player, stage=0, route="standard", kills=0, cleared=0, elapsed=0, acquired=[], foes=[], shots=[], orbs=[], debris=[], fx=[], floats=[], spawns=[], scene=0, bannerTimer=0, shake=0, hitStop=0, flash=0;
let floor, chamber, nearby, descent, pulse=null, nextPulse=0, pulseIndex=0;
const camera={x:0,y:0};
const keys=new Set(), pointer={x:560,y:315,down:false,id:null}, stick={x:0,y:0,id:null}, actions=new Set();
const controlPointers=new Map(), touchCasts=new Map();
let touchAim=null, weaponAim=null;
let selected=[], previousRelicOffer=[], modalChoices=[], previousFocus, lastAction="";
const scrollLockKeys=["Space","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"];

function resize(){
  const rotated=touchUI&&innerWidth<innerHeight;
  if(rotated!==touchRotated){
    touchRotated=rotated;$("app").classList.toggle("touch-rotated",rotated);resetInput();
  }
  const box=canvas.getBoundingClientRect();
  const width=touchRotated?box.height:box.width, height=touchRotated?box.width:box.height;
  if(!width||!height)return;
  const ratio=width/height;
  if(touchUI){
    W=clamp(Math.round(575*ratio),480,1440);H=Math.round(W/ratio);
  }else{
    H=ratio<1?820:630;W=clamp(Math.round(H*ratio),480,1350);
  }
  dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  scale=Math.min(width/W,height/H);ox=(width-W*scale)*.5;oy=(height-H*scale)*.5;
  if(player&&state!=="home"){followCamera();draw()}
}
function followCamera(dt=0){
  const blend=dt?1-Math.exp(-dt*10):1;
  camera.x+=(clamp(player.x-W/2,0,WORLD_W-W)-camera.x)*blend;
  camera.y+=(clamp(player.y-H*(touchUI ? .47 : .52),0,WORLD_H-H)-camera.y)*blend;
}
function makePlayer(){
  return {x:W/2,y:H*.71,r:15,hp:115,maxHp:115,ash:0,power:1,reach:1,haste:1,finisherPower:1,burn:0,linkEase:0,perfectPower:0,perfectAsh:0,
    skillPower:1,orbReach:1,orbSpeed:1,orbSpread:1,orbRepeat:0,orbCenterPower:1,orbSidePower:1,orbPierces:0,orbPairs:1,orbSplash:0,orbSlow:0,
    dashRate:1,dashSpeed:1,dashStrike:0,dashEdge:0,dodgeHeal:0,dodgeHealCd:0,dodgeRefund:0,skillRate:1,ashRate:1,dust:0,dustUsed:0,
    ultPower:1,ultBossPower:1,ultReach:1,ultHeal:0,ultInv:0,ultRefund:0,leech:0,leechUsed:0,roomHeal:0,hurtInv:0,armor:1,revives:0,speed:255,a:-PI/2,
    attack:0,attackTotal:0,pending:null,buffer:null,edge:0,edgeCd:0,edgeSerial:0,dashCd:0,dashMinCd:0,skill:0,dash:0,dashA:0,inv:0,combo:0,comboT:0,step:0,moving:0,dashHits:new Set(),weapons:[],weaponSlot:0,weaponCd:0,weaponCdTotal:1,parry:0,parryAngle:0,weaponInput:0};
}
function routeEnemyHealthScale(level,path,boss=false){
  const rules=routes[path];
  return level>0&&(!boss||rules.enemyHealthIncludesBoss)?rules.enemyHealth??1:1;
}
function enemyHealth(id,level,path,elite=false){
  const def=beasts[id];
  const scale=def.boss?routeEnemyHealthScale(level,path,true):mobHealthScale(level,path)*(elite?ELITE_HEALTH:1);
  return Math.round(def.hp*scale);
}
function mobHealthScale(level,path){
  return FLOOR_MOB_HEALTH[level]*routeEnemyHealthScale(level,path);
}
function spawn(id,x,y,elite=false,homeRoom=chamber){
  const def=beasts[id], hp=enemyHealth(id,stage,route,elite);
  const damage=def.damage*(def.boss?1:(routes[route].enemyDamage??1));
  const e={id,x,y,r:def.r,color:def.color,hp,maxHp:hp,damage,elite,homeRoom,boss:!!def.boss,cd:between(.34,1.05),tell:0,full:1,flash:0,stun:0,kx:0,ky:0,face:1,phase:1,cycle:0,seed:between(0,TAU),burn:0,burnTick:0};
  foes.push(e);save.unlocked[id]=true;
  fx.push({type:"ring",x,y,r:def.r*1.6,life:.55,max:.55,color:def.color});
}
function buildFloor(){
  const def=rooms[stage], boss=def.length===2, deckSource=boss?rooms[stage-1]:def;
  const deck=[deckSource[1+Math.floor(Math.random()*(deckSource.length-1))],...reinforcements[stage]].join(" ").split(" ");
  const map=mazeLayout(boss);
  const details=["entry","gate","valve","coil","ring"];
  if(Math.random()<.5)[details[2],details[3]]=[details[3],details[2]];
  const bossCount=boss?1:0, roomCount=map.nodes.length-bossCount;
  const mobCount=FLOOR_ENEMY_TOTALS[stage]-bossCount;
  const perRoom=Math.floor(mobCount/roomCount), remainder=mobCount%roomCount;
  const combatRooms=map.nodes.filter(node=>!boss||node.number!==1);
  if(route==="elite"){
    const hasElite=node=>Number(Boolean(ELITE_ROOMS[details[node.number]]));
    combatRooms.sort((a,b)=>hasElite(a)-hasElite(b));
  }
  const extraSlots=combatRooms.slice(0,remainder);
  let offset=Math.floor(Math.random()*deck.length);
  for(const node of map.nodes){
    const kind=details[node.number];
    const bossRoom=kind==="gate"&&boss;
    const count=perRoom+Number(extraSlots.includes(node));
    const codes=bossRoom?[def[1]]:Array.from({length:count},()=>deck[offset++%deck.length]);
    if(!bossRoom){
      if(!codes.some(code=>code==="h"||code==="b"))codes[0]="h";
      if(stage>0&&!codes.some(code=>code==="a"||code==="o"))codes[count-1]=stage>=4?"o":"a";
    }
    const cache=kind==="coil"||(stage>=3&&kind==="valve");
    Object.assign(node,{kind,cache,lineup:codes.join(" "),visited:false,done:false,claimed:false,pending:0});
  }
  const gate=map.nodes[1];
  map.loot=[];map.armories=[];
  map.tribute=null;map.elitesDefeated=0;
  map.merchant=rollMerchant(map);
  map.pedestal={x:gate.x,y:gate.y+70};
  const options=stage===6?["standard"]:Object.keys(routes);
  map.arches=options.map((path,i)=>({path,x:gate.x+(i-(options.length-1)/2)*126,y:gate.top*TILE+48}));
  return map;
}
function entrySupply(path){
  const rules=routes[path];
  return {hp:rules.heal+player.roomHeal,ash:rules.entryAsh??0};
}
function enter(name){
  route=name;
  requestArt(arenas[stage]);
  if(arenas[stage+1])requestArt(arenas[stage+1],"low");
  if(stage>0){
    const supply=entrySupply(name);
    player.hp=Math.min(player.maxHp,player.hp+supply.hp);
    player.ash=Math.min(100,player.ash+supply.ash);
  }
  floor=buildFloor();chamber=null;nearby=null;
  state="fight";scene=0;closeModal();resetInput();
  foes=[];shots=[];orbs=[];spawns=[];debris=[];fx=[];floats=[];weaponBolts=[];weaponFields=[];weaponTraces=[];flash=0;shake=0;hitStop=0;
  const origin=floor.nodes[0];
  Object.assign(player,{x:origin.x,y:origin.y+116,a:-PI/2,attack:0,attackTotal:0,pending:null,buffer:null,edge:0,skill:0,dash:0,dashCd:0,dashMinCd:0,inv:.8,combo:0,comboT:0,parry:0,weaponInput:0,leechUsed:0,dustUsed:0});
  followCamera();discover();drawHud();
}
function chamberName(node){
  if(!node)return "迷宫甬道";
  if(node.kind==="gate"&&rooms[stage].length===2)return beasts[mobCode[rooms[stage][1]]].name;
  return chambers[node.kind].name;
}
function queueEnemy(node,id,x,y,delay,elite=false){
  const radius=beasts[id].r;
  if(!standOn(floor,x,y,radius)){
    const field=mapDistances(floor,tileAt(node.x,node.y));
    const alternatives=[];
    for(let cy=node.top+1;cy<node.bottom-1;cy++)for(let cx=node.left+1;cx<node.right-1;cx++){
      const k=tileIndex(cx,cy), px=(cx+.5)*TILE,py=(cy+.5)*TILE;
      if(floor.owners[k]===node.number&&field[k]>=0&&standOn(floor,px,py,radius))alternatives.push({x:px,y:py,d:Math.hypot(px-x,py-y)});
    }
    const next=alternatives.sort((a,b)=>a.d-b.d).find(point=>spawns.every(spawn=>dist(point,spawn)>35))??node;
    x=next.x;y=next.y;
  }
  node.pending++;
  spawns.push({node,id,x,y,at:scene+delay,elite});
}
function scheduleRoom(node){
  const enemies=node.lineup.split(" ").map(code=>mobCode[code]);
  if(enemies.length===1){queueEnemy(node,enemies[0],node.x,node.y,.58);return}
  const champion=route==="elite"?ELITE_ROOMS[node.kind]:null, championIndex=enemies.length;
  if(champion)enemies.push(champion);
  const spin=between(-.24,.24), flip=Math.random()<.5?-1:1;
  const spread=clamp(enemies.length*14+76,145,205);
  enemies.forEach((id,i)=>{
    const a=-PI/2+spin+flip*TAU*i/enemies.length;
    queueEnemy(node,id,node.x+Math.cos(a)*spread,node.y+Math.sin(a)*spread*.78,.35+(i%3)*.15,i===championIndex);
  });
}
function discover(){
  const tx=Math.floor(player.x/TILE),ty=Math.floor(player.y/TILE), k=tileIndex(tx,ty);
  const node=floor.nodes[floor.owners[k]]??null, bossDoor=floor.bossDoor;
  const enteringBossRoom=bossDoor&&node===floor.nodes[1]&&!node.visited;
  if(enteringBossRoom){
    const inside=(player[bossDoor.axis]-bossDoor.boundary)*bossDoor.inward;
    if(inside<=player.r)return;
    bossDoor.locked=true;floor.viewTile=-1;shake=Math.max(shake,5);sfx("seal");
  }
  if(k!==floor.viewTile){
    floor.viewTile=k;floor.field=mapDistances(floor,k);
    for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
      const x=tx+dx,y=ty+dy;
      if(x<0||y<0||x>=MAZE_COLS||y>=MAZE_ROWS||dx*dx+dy*dy>18)continue;
      const at=tileIndex(x,y);
      const reachable=floorSight(floor,player,{x:(x+.5)*TILE,y:(y+.5)*TILE});
      if(floor.cells[at]&&(reachable||floor.seals[at]&&dx*dx+dy*dy<=4))floor.seen[at]=1;
    }
  }
  if(node===chamber)return;
  chamber=node;pulse=null;nextPulse=scene+2.4;pulseIndex=0;
  if(node&&!node.visited){
    node.visited=true;scheduleRoom(node);
    const note=enteringBossRoom?"房门已封闭 · 肃清房间后开启":node.kind==="entry"?roomMood[stage]:roomForms[node.form].name+" · "+chambers[node.kind].note;
    announce(chamberName(node),note+(floor.merchant?.node===node?" · 收钟人在此，肃清后可交易":""),1.65);
  }
}
function begin(){
  wakeAudio(); $("home").hidden=true;$("game").hidden=false;
  resize();
  stage=0;kills=0;cleared=0;elapsed=0;acquired=[];previousRelicOffer=[];lastAction="";player=makePlayer();enter("standard");
  $("pause").focus({preventScroll:true});$("pause").blur();
}
function home(){state="home";resetInput();closeModal();$("game").hidden=true;$("home").hidden=false;updateBest();$("start").focus()}
function announce(title, note, time){
  const el=$("banner");el.replaceChildren(document.createTextNode(title));
  if(note){const small=document.createElement("small");small.textContent=note;el.append(small)}
  bannerTimer=time;el.classList.add("show");
}

function ash(n){
  const total=player.ash+n*player.ashRate*(routes[route].ashGain??1);
  player.ash=clamp(Math.round(total*1e6)/1e6,0,100);
}
function sparks(x,y,color,count=12,speed=165,a=null){
  for(let i=0;i<count;i++){
    const direction=a===null?between(0,TAU):a+between(-.8,.8), v=between(35,speed), life=between(.16,.51);
    debris.push({x,y,vx:Math.cos(direction)*v,vy:Math.sin(direction)*v,color,r:between(1,3),life,max:life});
  }
}
function label(x,y,text,color){floats.push({x,y,text,color,life:.65,max:.65})}
function ring(x,y,r,color,life=.48){fx.push({type:"ring",x,y,r,color,life,max:life})}
function ignite(e){
  if(!player.burn||e.hp<=0)return false;
  if(e.burn<=0)e.burnTick=CINDER.interval;
  e.burn=CINDER.ticks;
  e.burnDamage=CINDER.damage*player.burn;
  return true;
}
function rewardBossDamage(e,previousHp){
  const p=player;
  const step=hp=>Math.min(4,Math.floor((e.maxHp-hp)*5/e.maxHp));
  const crossed=step(e.hp)-step(previousHp);
  if(!crossed)return;
  if(p.leech)p.hp=Math.min(p.maxHp,p.hp+LEECH_BOSS_HEAL*p.leech*crossed);
  if(p.dust)ash(DUST.boss*p.dust*crossed);
}
function hurt(e, raw, a, force=1, silent=false, charge=true, killCharge=true){
  if(e.hp<=0)return;
  const p=player, previousHp=e.hp;
  const h=Math.round(raw*(player.fury&&player.hp<player.maxHp*.4?1.55:1));
  e.hp-=h;e.flash=.12;
  if(e.boss&&(p.leech||p.dust))rewardBossDamage(e,previousHp);
  if(!silent){
    if(!e.boss){e.kx=Math.cos(a)*145*force;e.ky=Math.sin(a)*145*force;if(e.tell<=0)e.stun=.085}
    label(e.x,e.y-e.r-12,h,e.boss?"#ffce9c":"#fff0cf");sparks(e.x,e.y-11,e.color,8,180,a);
    if(charge)ash(e.boss?BASE_ASH.bossHit:BASE_ASH.hit);
  }
  if(e.hp<=0){
    playDeathSound(e);
    dropWeapon(e);
    kills++;
    if(killCharge){
      const extra=e.boss?0:Math.max(0,Math.min(DUST.kill*p.dust,DUST.limit*p.dust-p.dustUsed));
      p.dustUsed+=extra;
      ash(BASE_ASH.kill+extra);
    }
    if(!e.boss&&p.leech){
      const healing=Math.min(LEECH_KILL_HEAL*p.leech,LEECH_LIMIT*p.leech-p.leechUsed,p.maxHp-p.hp);
      if(healing>0){
        p.hp+=healing;p.leechUsed+=healing;
        label(p.x,p.y-52,"+"+healing,"#b3e69b");
      }
    }
    if(e.elite&&route==="elite"&&++floor.elitesDefeated===ELITE_COUNT){
      floor.tribute={x:e.x,y:e.y,choices:null};
      label(e.x,e.y-48,"赤咒馈赠可领取",routes.elite.color);
    }
    ring(e.x,e.y,e.r*2.2,e.color,.35);sparks(e.x,e.y-12,e.color,e.boss?58:20,240);
  }
}
function damage(n,source){
  const p=player;
  if(p.dash>0){
    if(!p.perfect){
      p.perfect=true;ash(BASE_ASH.perfectDodge);
      if(p.dodgeHeal&&p.dodgeHealCd===0&&p.hp<p.maxHp){p.hp=Math.min(p.maxHp,p.hp+p.dodgeHeal);p.dodgeHealCd=DASH_MIRROR.interval}
      p.dashCd=Math.max(p.dashMinCd,p.dashCd-p.dodgeRefund);
      label(p.x,p.y-36,"完美闪步","#91efe8");ring(p.x,p.y,73,"#91efe8");tone(620,950,.28,.14);
    }
    return;
  }
  if(p.inv>0||p.hp<=0)return;
  if(p.parry>0&&source&&Math.abs(turn(angle(p,source)-p.parryAngle))<=SHIELD_GUARD.angle){
    p.parry=0;p.inv=.28;
    const cast=makeWeaponCast(weaponBook.shield,false,false,makeImpact("shieldCounter"));
    weaponStrike(p,p.parryAngle,{shape:"arc",reach:153,arc:SHIELD_GUARD.angle,falloff:SHIELD_GUARD.falloff,stagger:.24},SHIELD_GUARD.counter,cast);
    label(p.x,p.y-48,"格挡反震",cast.color);
    if(!cast.hits.size)playCombatCue("shieldCounter");
    return;
  }
  const hit=Math.ceil(n*p.armor);
  p.hp=Math.max(0,p.hp-hit);p.inv=.72+p.hurtInv;
  if(p.hp===0&&p.revives>0){
    p.revives--;p.hp=p.maxHp*REVIVE_HP_PERCENT/100;p.inv=Math.max(p.inv,1.05);
    flash=.23;shake=8;hitStop=.06;
    ring(p.x,p.y,98,"#fcd595",.65);sparks(p.x,p.y-12,"#ffe0a6",28,260);
    label(p.x,p.y-46,"复活 · "+p.hp,"#ffe0a6");
    announce("无声庇佑",`恢复至 ${p.hp} 点生命 · 剩余复活 ${p.revives} 次`,1.6);
    sfx("choose");return;
  }
  flash=.46;shake=13;hitStop=.045;sfx("hurt");
  sparks(p.x,p.y-10,"#ff6750",24,230);label(p.x,p.y-24,"−"+hit,"#ff897d");
  if(source){const a=angle(source,p);walkBody(floor,p,Math.cos(a)*29,Math.sin(a)*29)}
}

function aimTarget(max,forward=false){
  let nearest=null, best=Infinity;
  for(const e of foes){
    const d=dist(e,player), offset=Math.abs(turn(angle(player,e)-player.a));
    if(e.hp<=0||d>max+e.r||!floorSight(floor,player,e))continue;
    const score=d+(forward?offset*28:0);
    if(score<best){best=score;nearest=e}
  }
  return nearest;
}
function aim(mouse,max,forward){
  const target=mouse?{x:pointer.x+camera.x,y:pointer.y+camera.y}:aimTarget(max,forward);
  return target?angle(player,target):player.a;
}
function linkOpen(p){
  const margin=.10+p.linkEase;
  return p.comboT>0&&p.attack<=margin&&p.comboT>=(p.comboSpan??.68)-p.attackTotal-margin;
}
function perfectAttackScale(p,heavy){return (heavy?1.22:1.14)+p.perfectPower}
function slash(mouse,perfect=false){
  const p=player;
  p.combo=p.comboT>0?(p.combo+1)%3:0;
  p.comboSpan=p.comboT=.68;
  if(activeWeapon()){weaponAttack(mouse,perfect);return}
  const move=swordMoves[p.combo];
  p.a=aim(mouse,move.r*p.reach+30,p.moving);
  p.attackTotal=move.total*p.haste;p.attack=p.attackTotal;
  p.pending={move,a:p.a,perfect,at:p.attack-move.wind*p.haste};
  if(perfect)tone(540,885,.15,.13,"triangle");
}
function dashEdgeReady(p){return p.edge>0&&p.edgeCd===0}
function triggerDashEdge(p){p.edge=0;p.edgeCd=DASH_EDGE.cooldown}
function resolveSlash({move,a,perfect}){
  const p=player, r=move.r*p.reach, heavy=move.key==="cleave", thrust=move.key==="thrust";
  walkBody(floor,p,Math.cos(a)*move.step,Math.sin(a)*move.step);
  fx.push({type:"slash",x:p.x,y:p.y-5,a,r,arc:move.arc,key:move.key,perfect,life:heavy?.31:.24,max:heavy?.31:.24});
  if(perfect)ring(p.x,p.y,41,"#f8d7a2",.24);
  let hits=0,burned=0;
  const edge=dashEdgeReady(p)?DASH_EDGE.damage*p.dashEdge:0;
  const impact=makeImpact("starter",p.combo,perfect);
  for(const e of foes){
    if(e.hp<=0||!floorSight(floor,p,e))continue;
    const d=dist(p,e), offset=turn(angle(p,e)-a);
    if(thrust){
      const along=d*Math.cos(offset), across=Math.abs(d*Math.sin(offset));
      if(along< -e.r*.5||along>r+e.r||across>move.width+e.r*.72)continue;
    }else if(d>r+e.r||Math.abs(offset)>move.arc+.12)continue;
    if(!hits&&edge)triggerDashEdge(p);
    const raw=move.power*p.power*(heavy?p.finisherPower:1)*(perfect?perfectAttackScale(p,heavy):1)+(hits<2?edge:0);
    hurt(e,raw,a,heavy?1.4:thrust?.74:1,false,hits<2);
    playImpact(impact,e);
    if(burned<CINDER.targets&&ignite(e))burned++;
    if(heavy&&perfect&&!e.boss&&e.hp>0){e.tell=0;e.stun=.21;e.cd=Math.max(e.cd,.37)}
    hits++;
  }
  if(hits){
    if(perfect){ash(1+p.perfectAsh);label(p.x,p.y-46,"完美接刃","#ffe2a4")}
    shake=heavy?8:thrust?5:3;hitStop=heavy?.043:thrust?.028:.017;
  }else tone(thrust?380:heavy?165:240,45,heavy?.16:.1,.11,"triangle");
}
function dashCooldown(p){return Math.max(DASH_MIN_COOLDOWN,DASH_COOLDOWN*p.dashRate)}
function dash(dx,dy){
  const p=player;if(p.dashCd>0||p.dash>0)return;
  p.dashA=dx||dy?Math.atan2(dy,dx):p.a;p.a=p.dashA;p.dash=.218;p.dashCd=dashCooldown(p);p.dashMinCd=DASH_MIN_COOLDOWN;p.perfect=false;p.dashHits.clear();sfx("dash");
  p.pending=null;p.buffer=null;p.attack=0;p.comboT=0;p.parry=0;
  p.dashImpact=p.dashStrike?makeImpact("dashImpact"):null;
  if(p.dashEdge){p.edge=DASH_EDGE.time;p.edgeSerial++}
  ring(p.x,p.y,38,"#f9946b",.3);
}
function skill(dx,dy,direction=null){
  const p=player;
  if(p.skill>0)return;
  const a=direction??(p.dash>0?p.dashA:Math.hypot(dx,dy)>.12?Math.atan2(dy,dx):p.a);
  p.a=a;p.skill=EMBER_ORB.cooldown*p.skillRate;
  const cast={hits:new Map(),speed:EMBER_ORB.speed*p.orbSpeed,repeat:p.orbRepeat,splash:p.orbSplash,slow:p.orbSlow,impact:makeImpact("emberImpact",0,false,5)};
  const spread=EMBER_ORB.spread*p.orbSpread*Math.min(1,2/p.orbPairs);
  for(let i=0;i<=2*p.orbPairs;i++){
    const side=i%2?-(i+1)/2:i/2, direction=a+side*spread;
    const start=range(p.x,p.y,direction,12);
    const outer=Math.abs(side)>=2?EMBER_ORB.outerPower:1;
    const damage=EMBER_ORB.damage*p.skillPower*(side?p.orbSidePower:p.orbCenterPower)*outer;
    orbs.push({...start,a:direction,side,damage,left:EMBER_ORB.reach*p.orbReach,passes:side?1:1+p.orbPierces,hit:new Set(),cast});
  }
  sparks(p.x,p.y-8,"#ffc38b",13,147,a);sfx("orbs");
}
function moveOrb(orb,dt){
  const {cast,a}=orb, distance=Math.min(orb.left,cast.speed*dt);
  const cos=Math.cos(a), sin=Math.sin(a), contacts=[];
  let travel=distance;
  for(let d=0;d<=distance;d+=5){
    if(!standOn(floor,orb.x+cos*d,orb.y+sin*d,6)){travel=Math.max(0,d-5);break}
  }
  if(travel===distance&&!standOn(floor,orb.x+cos*distance,orb.y+sin*distance,6))travel=Math.max(0,distance-5);
  for(const e of foes){
    if(e.hp<=0||orb.hit.has(e))continue;
    const x=e.x-orb.x,y=e.y-orb.y,along=x*cos+y*sin,cross=x*sin-y*cos;
    const r=e.r+EMBER_ORB.radius;
    if(Math.abs(cross)>r)continue;
    const span=Math.sqrt(r*r-cross*cross), entry=along-span;
    if(entry<=travel&&along+span>=0&&floorSight(floor,orb,e))contacts.push({e,entry:Math.max(0,entry)});
  }
  contacts.sort((first,second)=>first.entry-second.entry);
  for(const {e,entry} of contacts){
    if(e.hp<=0)continue;
    const repeats=cast.hits.get(e)??0, pierceScale=EMBER_ORB.pierce**orb.hit.size;
    const splash=cast.splash&&cast.hits.size===0;
    const impact=range(orb.x,orb.y,a,entry);
    const multiplier=EMBER_ORB.repeat[Math.min(repeats,EMBER_ORB.repeat.length-1)]+(repeats?cast.repeat:0);
    hurt(e,orb.damage*multiplier*pierceScale+(splash?EMBER_SPLASH.impact*cast.splash:0),a,.28,false,repeats===0);
    playImpact(cast.impact,e,Math.abs(orb.side)*.07);
    cast.hits.set(e,repeats+1);orb.hit.add(e);
    if(cast.slow)e.slow=Math.max(e.slow??0,cast.slow);
    if(splash){
      const nearby=foes.filter(other=>other!==e&&other.hp>0&&dist(e,other)<=EMBER_SPLASH.reach+other.r&&floorSight(floor,e,other));
      nearby.sort((a,b)=>dist(e,a)-dist(e,b));
      for(const other of nearby.slice(0,EMBER_SPLASH.targets))hurt(other,EMBER_SPLASH.damage*cast.splash,a,0,true);
      if(nearby.length)playCombatCue("emberBurst",0,false,.37);
      ring(e.x,e.y,EMBER_SPLASH.reach,"#ff985e",.25);
    }
    ring(impact.x,impact.y,31,"#ffc48d",.23);
    if(orb.hit.size>=orb.passes){orb.left=0;return}
  }
  orb.x+=cos*travel;orb.y+=sin*travel;orb.left-=travel;
  if(travel<distance){orb.left=0;ring(orb.x,orb.y,19,"#eab181",.18)}
}
function ultimate(){
  const p=player;if(p.ash<100)return;
  p.inv=Math.max(p.inv,.75+p.ultInv);p.hp=Math.min(p.maxHp,p.hp+p.ultHeal);
  const reach=560*p.ultReach;
  const impact=makeImpact("bellImpact",0,false,1);
  p.ash=Math.min(100,p.ultRefund);
  playCombatCue("bellCast",0,false,.61);
  for(const e of foes)if(e.hp>0&&dist(p,e)<=reach&&floorSight(floor,p,e)){
    hurt(e,FLOOR_BELL_DAMAGE[stage]*(e.boss?p.ultBossPower:p.ultPower),angle(p,e),2.3,true,false,false);
    playImpact(impact,e);
    if(e.hp>0&&!e.boss)e.stun=.5;
  }
  shots=shots.filter(s=>dist(p,s)>reach||!floorSight(floor,p,s));fx.push({type:"nova",x:p.x,y:p.y,r:reach,life:.89,max:.89});
  sparks(p.x,p.y,"#ffd195",60,420);shake=17;hitStop=.09;
}

function fire(e,a,speed=300,life=3){
  const pos=range(e.x,e.y,a,e.r+5);
  shots.push({...pos,a,speed,life,r:e.boss?7:6,color:e.color,damage:e.damage});
}
function nextWardenAttack(e){return WARDEN_ATTACKS[e.cycle%WARDEN_ATTACKS.length]}
function beginTell(e,p){
  const d=beasts[e.id], windup=e.boss?(e.phase===2?.79:1):(routes[route].enemyWindup??1);
  e.attackA=angle(e,p);e.tx=p.x;e.ty=p.y;
  if(!e.boss)e.pattern=e.id;
  else if(e.id==="warden")e.pattern=nextWardenAttack(e);
  else e.pattern=["slam","fan","sigil","charge"][e.cycle%4];
  e.cycle++;e.full=d.tell*windup;e.tell=e.full;
  if(e.pattern==="rush")prepareWardenRush(e);
  if(e.boss||e.id==="eye")sfx("tell");
}
function prepareWardenRush(e){
  const tuning=WARDEN_RUSH[e.phase-1], steps=Math.ceil(tuning.reach/(TILE/8));
  const ux=Math.cos(e.attackA),uy=Math.sin(e.attackA);
  let distance=0;
  for(let i=1;i<=steps;i++){
    const travel=tuning.reach*i/steps, x=e.x+ux*travel,y=e.y+uy*travel;
    if(floor.nodes[floor.owners[tileAt(x,y)]]!==e.homeRoom||!standOn(floor,x,y,e.r))break;
    distance=travel;
  }
  e.rush={tuning,ux,uy,distance,traveled:0,hit:false};
  if(Math.abs(ux)>.15)e.face=ux>0?-1:1;
}
function stepWardenRush(e,dt){
  const rush=e.rush, {tuning,ux,uy}=rush, p=player;
  const travel=Math.min(rush.distance-rush.traveled,tuning.speed*dt);
  if(!rush.hit&&travel>0){
    const along=clamp((p.x-e.x)*ux+(p.y-e.y)*uy,0,travel);
    const contact={x:e.x+ux*along,y:e.y+uy*along};
    if(dist(contact,p)<e.r+p.r&&floorSight(floor,contact,p)){
      rush.hit=true;damage(tuning.damage,contact);
    }
  }
  e.x+=ux*travel;e.y+=uy*travel;rush.traveled+=travel;
  if(rush.traveled>=rush.distance){
    e.rush=null;e.cd=tuning.recovery;shake=Math.max(shake,5);
    ring(e.x,e.y,e.r*1.62,e.color,.34);sparks(e.x,e.y,e.color,17,205,e.attackA);
  }
}
function strike(e){
  const p=player, distance=dist(e,p), facing=Math.abs(turn(angle(e,p)-e.attackA));
  const sight=floorSight(floor,e,p);
  switch(e.pattern){
    case "hound": {
      walkBody(floor,e,Math.cos(e.attackA)*93,Math.sin(e.attackA)*93);
      const reach=Math.abs(turn(angle(e,p)-e.attackA));
      if(sight&&((distance<123&&facing<.39)||dist(e,p)<29||(dist(e,p)<39&&reach<.8)))damage(e.damage,e);
      sparks(e.x,e.y,e.color,10,145);e.cd=between(1.0,1.28);break;
    }
    case "archer":
      [0,...(e.elite?[-.19,.19]:[])].forEach(n=>fire(e,e.attackA+n,e.elite?340:280));e.cd=between(1.45,2.1);break;
    case "eye":{
      const target={x:e.tx,y:e.ty};if(dist(target,p)<68&&floorSight(floor,target,p))damage(e.damage,target);
      ring(e.tx,e.ty,82,e.color);sparks(e.tx,e.ty,e.color,24,225);e.cd=between(1.55,2.05);break;
    }
    case "brute":case "slam":{
      const r=e.boss?(e.phase===2?178:145):101;if(sight&&distance<r)damage(e.damage,e);
      ring(e.x,e.y,r*1.09,e.color,.52);sparks(e.x,e.y,e.color,e.boss?37:22,260);shake=e.boss?8:4;e.cd=e.boss?.93:1.63;break;
    }
    case "fan": {
      const count=e.phase===2?19:e.id==="warden"?10:13;
      for(let i=0;i<count;i++)fire(e,e.attackA+TAU*i/count,e.phase===2?252:222,4.2);
      if(e.phase===2)for(let i=-1;i<=1;i++)fire(e,e.attackA+.13*i,390,2.3);
      ring(e.x,e.y,93,e.color,.45);e.cd=e.phase===2?.68:.97;break;
    }
    case "sigil": {
      const spots=sigils(e);
      for(const s of spots){if(standOn(floor,s.x,s.y)&&dist(s,p)<s.r&&floorSight(floor,s,p))damage(e.damage,s);ring(s.x,s.y,s.r*1.12,e.color);sparks(s.x,s.y,e.color,16,210)}
      e.cd=.69;break;
    }
    case "charge": {
      if(sight&&distance<253&&facing<Math.atan2(48,Math.max(25,distance)))damage(e.damage,e);
      walkBody(floor,e,Math.cos(e.attackA)*215,Math.sin(e.attackA)*215);ring(e.x,e.y,96,e.color);sparks(e.x,e.y,e.color,30,230);e.cd=.77;break;
    }
    case "rush":
      sfx("wardenRush");ring(e.x,e.y,e.r*1.48,"#ff9d71",.29);sparks(e.x,e.y,e.color,16,220,e.attackA+PI);break;
  }
}
function sigils(e){
  const spots=[{x:e.tx,y:e.ty,r:88}];
  if(e.phase===2)for(let i=0;i<3;i++)spots.push({...range(e.tx,e.ty,e.attackA+TAU*i/3,139),r:67});
  return spots;
}
function stepEnemy(e,dt){
  const p=player,d=beasts[e.id], a=angle(e,p), distance=dist(e,p);
  if(distance>690||(e.boss&&chamber!==e.homeRoom)){
    if(e.rush){e.cd=e.rush.tuning.recovery;e.rush=null}
    e.tell=0;return;
  }
  const sight=floorSight(floor,e,p);
  e.flash=Math.max(0,e.flash-dt);e.cd-=dt;e.stun-=dt;
  walkBody(floor,e,e.kx*dt,e.ky*dt);e.kx*=Math.pow(.003,dt);e.ky*=Math.pow(.003,dt);
  if(e.burn>0){
    e.burnTick-=dt;
    if(e.burnTick<=0){e.burn--;hurt(e,e.burnDamage,a,0,true);e.burnTick+=CINDER.interval}
  }
  e.slow=Math.max(0,(e.slow||0)-dt);
  if(e.hp<=0)return;
  if(e.boss&&e.phase===1&&e.hp<e.maxHp*.5){
    e.phase=2;e.tell=0;e.rush=null;e.cd=.5;ring(e.x,e.y,160,e.color,.8);sfx("bell");
    announce(e.id==="bell"?"永夜震鸣":"钟铜崩裂","第二阶段",1.1);
    const home=e.homeRoom;
    for(let i=0;i<2;i++)queueEnemy(home,e.id==="bell"?"eye":"hound",home.x+(i?135:-135),home.y+45,.78+i*.2);
  }
  if(e.tell>0){e.tell-=dt;if(e.tell<=0)strike(e);return}
  if(e.rush){stepWardenRush(e,dt);return}
  if(e.stun>0)return;
  if(Math.abs(Math.cos(a))>.15)e.face=Math.cos(a)>0?-1:1;
  const ranged=e.id==="archer"||e.id==="eye";
  const desired=e.id==="archer"?264:e.id==="eye"?203:e.boss?105:e.id==="brute"?85:83;
  const reach=e.id==="warden"?(nextWardenAttack(e)==="rush"?WARDEN_RUSH[e.phase-1].trigger:158):e.boss?240:ranged?460:desired+15;
  if(sight&&e.cd<=0&&distance<reach){beginTell(e,p);return}
  const moving=!sight||distance>desired?1:ranged&&distance<desired-65?-.71:0;
  const speed=d.speed*(e.elite?ELITE_SPEED:1)*(e.phase===2?1.23:1)*(e.slow>0?(e.boss?.88:.7):1);
  let direction=a;
  if(!sight){
    const x=Math.floor(e.x/TILE),y=Math.floor(e.y/TILE);
    let best=floor.field[tileIndex(x,y)], step=null;
    for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
      const mark=floor.field[tileIndex(nx,ny)];
      if(mark>=0&&(best<0||mark<best)){best=mark;step={x:(nx+.5)*TILE,y:(ny+.5)*TILE}}
    }
    if(!step)return;
    direction=angle(e,step);
  }
  walkBody(floor,e,Math.cos(direction)*speed*dt*moving,Math.sin(direction)*speed*dt*moving);
  for(const other of foes){
    if(other===e||other.hp<=0)continue;
    const gap=dist(e,other), limit=(e.r+other.r)*.88;
    if(gap>0&&gap<limit){const push=(limit-gap)*dt*9;walkBody(floor,e,(e.x-other.x)*push/gap,(e.y-other.y)*push/gap)}
  }
  if(distance<e.r+p.r&&distance>0){const push=(e.r+p.r-distance)*dt*10;walkBody(floor,e,-Math.cos(a)*push,-Math.sin(a)*push)}
}

function markPulse(pattern){
  const left=chamber.left*TILE,top=chamber.top*TILE,w=(chamber.right-chamber.left)*TILE,h=(chamber.bottom-chamber.top)*TILE;
  const r=Math.min(w,h), center={x:chamber.x,y:chamber.y};
  if(pattern==="cross"){
    const width=56;
    return [{x:left,y:player.y-width/2,w,h:width},{x:player.x-width/2,y:top,w:width,h}];
  }
  if(pattern==="echo"){
    const enemy=foes.find(e=>e.homeRoom===chamber&&e.hp>0);
    return [{x:player.x,y:player.y,r:65},...(enemy?[{x:enemy.x,y:enemy.y,r:58}]:[])];
  }
  return [{...center,r:r*(pulseIndex%2?.23:.45),inner:pulseIndex%2?0:r*.31}];
}
function withinPulse(target,zone){
  if(zone.w)return target.x>=zone.x&&target.x<=zone.x+zone.w&&target.y>=zone.y&&target.y<=zone.y+zone.h;
  const distance=dist(target,zone);
  return distance<=zone.r&&distance>=(zone.inner??0);
}
function stepChamber(){
  if(!chamber||chamber.done)return;
  const pattern=chambers[chamber.kind].hazard;
  if(!pattern||!foes.some(e=>e.homeRoom===chamber&&e.hp>0)||(floor.safe&&!floor.hostile))return;
  if(pulse){
    if(scene<pulse.at)return;
    const {zones}=pulse;
    if(!floor.safe&&zones.some(zone=>withinPulse(player,zone)))damage(10);
    if(floor.hostile)for(const e of foes)if(floor.nodes[floor.owners[tileAt(e.x,e.y)]]===chamber&&zones.some(zone=>withinPulse(e,zone)))hurt(e,42,0,0,true);
    for(const z of zones){
      const x=z.w?z.x+z.w/2:z.x,y=z.h?z.y+z.h/2:z.y;
      sparks(x,y,floor.safe?"#9de5d4":"#ffa273",16,195);
      if(z.r)ring(x,y,z.r,floor.safe?"#9de5d4":"#ffa273",.33);
    }
    pulse=null;sfx("hit");
  }else if(scene>=nextPulse){
    pulseIndex++;pulse={zones:markPulse(pattern),at:scene+.85};
    nextPulse=scene+4.25;sfx("tell");
  }
}
function clearChamber(node){
  node.done=true;floor.cleared++;
  if(node.kind==="valve"){floor.safe=true;floor.viewTile=-1}
  if(node.kind==="coil")floor.hostile=true;
  if(chamber===node)pulse=null;
  const bossRoom=node.kind==="gate"&&rooms[stage].length===2;
  if(bossRoom){floor.bossDoor.locked=false;floor.viewTile=-1}
  sfx("clear",bossRoom?Math.max(0,bossDeathAudioUntil-(audio?.currentTime??0)):0);
  if(floor.cleared===floor.nodes.length){
    cleared=stage+1;
    const weaponReward=stage>0&&routes[route].weaponReward;
    if(weaponReward){
      const side=floor.armories.some(loot=>loot.x>floor.pedestal.x)?-1:1;
      addWeaponArmory({x:floor.pedestal.x+side*3*TILE,y:floor.pedestal.y},"钟鸣武库");
    }
    const next=stage===6?"走到北侧，敲响永夜钟":"走近烛台领取遗物，再从北侧门廊下行";
    const rewardNote=weaponReward?"钟鸣武库已开启 · 烛台旁可选武器":"";
    announce(stage===6?"钟主已倒下":"本层肃清",[bossRoom?"房门已开启":"",rewardNote,next].filter(Boolean).join(" · "),2.2);
  }else if(floor.cleared===floor.nodes.length-1){
    floor.viewTile=-1;announce("封印解除","现在可以沿走廊前往出口",1.8);
  }else if(chamber===node){
    const note=node.kind==="valve"?"陷阱失去伤害，青色密门已开启":node.kind==="coil"?"机关现在可以伤敌":"沿走廊继续探索";
    announce("已肃清 · "+chamberName(node),note+(node.cache?" · 房间中央有余火匣":""),1.35);
  }
}
function tick(dt){
  const p=player;elapsed+=dt;scene+=dt;
  if(bannerTimer>0){bannerTimer-=dt;if(bannerTimer<=0)$("banner").classList.remove("show")}
  for(const s of spawns)if(scene>=s.at){spawn(s.id,s.x,s.y,s.elite,s.node);s.node.pending--}
  spawns=spawns.filter(s=>scene<s.at);
  for(const k of ["attack","dashCd","dashMinCd","skill","inv","comboT","edge","edgeCd","weaponCd","parry","weaponInput","dodgeHealCd"])p[k]=Math.max(0,p[k]-dt);
  let dx=Number(keys.has("KeyD")||keys.has("ArrowRight"))-Number(keys.has("KeyA")||keys.has("ArrowLeft"))+stick.x;
  let dy=Number(keys.has("KeyS")||keys.has("ArrowDown"))-Number(keys.has("KeyW")||keys.has("ArrowUp"))+stick.y;
  const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len}
  if(actions.has("switch"))switchWeapon();
  if(actions.has("weapon")&&activeWeapon()){
    p.weaponInput=.24;weaponAim=touchCasts.get("weapon")??null;
  }
  if(actions.has("dash"))dash(dx,dy);
  if(p.weaponInput>0&&castWeapon(!weaponAim&&lastAction==="mouse",weaponAim))p.weaponInput=0;
  if(!p.weaponInput)weaponAim=null;
  if(actions.has("ult"))ultimate();
  if(actions.has("skill")){
    const touch=touchCasts.get("skill");
    const target=touch&&touch.angle===null?aimTarget(EMBER_ORB.reach*p.orbReach):null;
    skill(dx,dy,touch?.angle??(target?angle(p,target):null));
  }
  if(p.dash>0){
    p.dash=Math.max(0,p.dash-dt);
    const stride=785*p.dashSpeed*dt;
    walkBody(floor,p,Math.cos(p.dashA)*stride,Math.sin(p.dashA)*stride);
    fx.push({type:"ghost",x:p.x,y:p.y,a:p.a,id:p.weapons[p.weaponSlot],life:.22,max:.22});
    if(p.dashStrike)for(const e of foes){
      if(p.dashHits.size>=DASH_STRIKE.targets)break;
      if(e.hp<=0||p.dashHits.has(e)||dist(p,e)>=e.r+30||!floorSight(floor,p,e))continue;
      const damage=(e.boss?DASH_STRIKE.bossDamage:DASH_STRIKE.mobDamage)*p.dashStrike;
      p.dashHits.add(e);hurt(e,damage,p.dashA,.65);playImpact(p.dashImpact,e);
    }
  }else{
    const stride=p.speed*dt*(p.pending?.78:1);
    walkBody(floor,p,dx*stride,dy*stride);p.moving=len>.08;
    if(p.pending&&p.attack<=p.pending.at){const swing=p.pending;p.pending=null;if(swing.weapon)resolveWeapon(swing);else resolveSlash(swing)}
    const attackHeld=controlPointers.has(skillButtons[0]);
    if(len>.08&&p.attack===0&&p.parry===0&&!pointer.down&&!attackHeld)p.a=Math.atan2(dy,dx);
    if(actions.has("attack")&&(p.attack===0||p.attack<=.12+p.linkEase)){
      p.buffer={mouse:lastAction==="mouse",perfect:linkOpen(p)};
    }
    if(p.attack===0&&p.parry===0){
      if(p.buffer){const input=p.buffer;p.buffer=null;slash(input.mouse,input.perfect)}
      else if(keys.has("KeyJ")||pointer.down||attackHeld)slash(lastAction==="mouse"&&!attackHeld);
    }
  }
  p.step+=dt*(len>0?13:4);p.moving=len>.08;actions.clear();touchCasts.clear();
  discover();followCamera(dt);
  stepWeaponCombat(dt);
  for(const orb of orbs)moveOrb(orb,dt);
  orbs=orbs.filter(orb=>orb.left>0);
  for(const e of foes)if(e.hp>0)stepEnemy(e,dt);
  for(const s of shots){
    const end=range(s.x,s.y,s.a,s.speed*dt);
    if(!floorSight(floor,s,end)){s.life=0;continue}
    s.x=end.x;s.y=end.y;s.life-=dt;
    if(dist(s,p)<s.r+p.r){s.life=0;damage(s.damage,range(s.x,s.y,s.a+PI,24));sparks(s.x,s.y,s.color,7,92)}
  }
  stepChamber();
  foes=foes.filter(e=>e.hp>0);shots=shots.filter(s=>s.life>0);
  if(p.hp<=0){finish(false);return}
  for(const node of floor.nodes)if(node.visited&&!node.done&&!node.pending&&!foes.some(e=>e.homeRoom===node))clearChamber(node);
  nearby=nearInteraction();
  if(audio&&audio.currentTime>=nextTone){
    const note=[55,55,65.4,49,55,73.4,65.4,49][ambientStep++%8];
    tone(note,note,2.1,.14,"sine");tone(note*2,note*1.998,1.35,.05,"triangle",.14);nextTone=audio.currentTime+1.9;
  }
}

const spiritColors=["#db724c","#63adf5","#a9d578","#ffa458","#bfd9ff","#bc82fd","#f8695e"];
const motes=Array.from({length:48},()=>({x:Math.random(),y:Math.random(),speed:between(7,30),r:between(.6,2),a:between(.14,.52),phase:between(0,TAU)}));
const heroFrame=[57,70,423,389];
const scenery=document.createElement("canvas");
const roomMural=document.createElement("canvas");
const stoneColors=["#30272c","#28313e","#29382f","#3a2a2a","#35404c","#352b43","#392730"];
function oval(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill()}
function circle(x,y,r,color,width=1){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
function line(x,y,tx,ty,color,width){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function sprite(frame,x,y,size,face,fallback,tilt=0){
  const img=art.sprites,[sx,sy,sw,sh]=frame,w=size*sw/sh;
  ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.scale(face,1);
  if(img.complete&&img.naturalWidth)ctx.drawImage(img,sx,sy,sw,sh,-w/2,-size*.87,w,size);
  else{ctx.fillStyle=fallback;ctx.beginPath();ctx.moveTo(0,-size*.68);ctx.lineTo(size*.28,-size*.21);ctx.lineTo(0,size*.1);ctx.lineTo(-size*.28,-size*.21);ctx.fill()}
  ctx.restore();
}
function paintPaving(pen,img){
  const sample=img?Math.round(img.height*.065):0;
  for(let y=0;y<MAZE_ROWS;y++)for(let x=0;x<MAZE_COLS;x++){
    const k=tileIndex(x,y);
    if(!floor.cells[k])continue;
    const left=x*TILE,top=y*TILE;
    pen.fillStyle=stoneColors[stage];
    pen.fillRect(left,top,TILE,TILE);
    if(img){
      const sx=img.width*.39+(x%4)*sample,sy=img.height*.42+(y%4)*sample;
      pen.globalAlpha=.53;
      pen.drawImage(img,sx,sy,sample,sample,left,top,TILE,TILE);
      pen.globalAlpha=1;
    }
    const tone=(x*19+y*13+x*y)%5;
    if(tone===0||tone===3){
      pen.fillStyle=tone===0?"#eec5a90b":"#150d1d18";
      pen.fillRect(left,top,TILE,TILE);
    }
    pen.fillStyle="#17111b71";pen.fillRect(left,top,TILE,1);pen.fillRect(left,top,1,TILE);
    pen.fillStyle="#e0c0ae15";pen.fillRect(left+1,top+1,TILE-1,1);
  }
}
function blendRoomArt(pen,img){
  if(!img)return;
  for(const node of floor.nodes){
    const x=node.left*TILE,y=node.top*TILE,w=(node.right-node.left)*TILE,h=(node.bottom-node.top)*TILE;
    roomMural.width=w;roomMural.height=h;
    const ink=roomMural.getContext("2d");
    const [u,v,du,dv]=roomForms[node.form].crop;
    ink.drawImage(img,img.width*u,img.height*v,img.width*du,img.height*dv,0,0,w,h);
    ink.save();
    ink.translate(w/2,h/2);ink.scale(w/2,h/2);
    const mask=ink.createRadialGradient(0,0,0,0,0,1);
    mask.addColorStop(0,node.kind==="gate"?"#ffffffdb":"#ffffffac");
    mask.addColorStop(.4,"#ffffff97");mask.addColorStop(.72,"#ffffff3b");mask.addColorStop(.96,"#ffffff00");
    ink.globalCompositeOperation="destination-in";ink.fillStyle=mask;ink.fillRect(-1,-1,2,2);
    ink.restore();
    pen.save();pen.beginPath();
    for(let ty=node.top;ty<node.bottom;ty++)for(let tx=node.left;tx<node.right;tx++){
      if(floor.owners[tileIndex(tx,ty)]===node.number)pen.rect(tx*TILE,ty*TILE,TILE,TILE);
    }
    pen.clip();pen.drawImage(roomMural,x,y);pen.restore();
  }
}
function paintMasonry(pen,color){
  for(let y=1;y<MAZE_ROWS-1;y++)for(let x=1;x<MAZE_COLS-1;x++){
    const k=tileIndex(x,y);
    if(floor.cells[k]||floor.features[k]===1||floor.features[k]===2)continue;
    const north=floor.cells[k-MAZE_COLS],south=floor.cells[k+MAZE_COLS],west=floor.cells[k-1],east=floor.cells[k+1];
    if(!north&&!south&&!west&&!east)continue;
    const left=x*TILE,top=y*TILE;
    pen.fillStyle=south?"#3b313a":"#29242f";pen.fillRect(left,top,TILE,TILE);
    pen.fillStyle=stoneColors[stage]+"80";pen.fillRect(left,top,TILE,TILE);
    pen.fillStyle="#54444b";pen.fillRect(left+2,top+3,TILE-4,2);
    pen.strokeStyle="#1a141d";pen.lineWidth=1.5;pen.strokeRect(left+1,top+1,TILE-2,TILE-2);
    pen.beginPath();pen.moveTo(left,top+30);pen.lineTo(left+TILE,top+30);pen.moveTo(left+34,top+30);pen.lineTo(left+34,top+TILE);pen.stroke();
    for(const [ex,ey,ew,eh,hx,hy,hw,hh] of [
      ...(north?[[left,top,52,4,left,top-3,52,3]]:[]),...(south?[[left,top+48,52,4,left,top+52,52,3]]:[]),
      ...(west?[[left,top,4,52,left-3,top,3,52]]:[]),...(east?[[left+48,top,4,52,left+52,top,3,52]]:[])
    ]){
      pen.fillStyle="#76616a";pen.fillRect(ex,ey,ew,eh);
      pen.fillStyle="#100b1499";pen.fillRect(hx,hy,hw,hh);
    }
    if((x*7+y*17)%9===0){
      const cx=left+TILE/2,cy=top+TILE/2;
      const flame=pen.createRadialGradient(cx,cy,0,cx,cy,44);flame.addColorStop(0,color+"aa");flame.addColorStop(1,"#11090f00");
      pen.fillStyle=flame;pen.fillRect(cx-44,cy-44,88,88);
      pen.fillStyle="#ffc996";pen.fillRect(cx-2,cy-7,4,10);
    }
  }
}
function paintEntrances(pen,color){
  for(const entrance of floor.entrances){
    pen.save();pen.translate(entrance.x,entrance.y);pen.rotate(entrance.a);pen.scale(entrance.sign,1);
    const light=pen.createRadialGradient(0,0,18,0,0,145);
    light.addColorStop(0,color+"34");light.addColorStop(.65,color+"15");light.addColorStop(1,color+"00");
    pen.fillStyle=light;pen.fillRect(-145,-145,290,290);
    const groove=pen.createLinearGradient(-94,0,112,0);
    groove.addColorStop(0,"#9e7b6b00");groove.addColorStop(.45,"#9272668d");
    groove.addColorStop(.67,"#775a5b83");groove.addColorStop(1,"#775a5b00");
    pen.strokeStyle=groove;pen.lineWidth=1.8;pen.beginPath();
    for(const edge of [-69,69]){pen.moveTo(-94,edge*1.34);pen.lineTo(-5,edge);pen.lineTo(105,edge*.79)}
    pen.stroke();
    const shade=pen.createLinearGradient(-32,0,40,0);
    shade.addColorStop(0,"#15101a00");shade.addColorStop(.5,"#130d1898");shade.addColorStop(1,"#130d1800");
    pen.fillStyle=shade;pen.fillRect(-32,-124,72,248);
    for(const step of [-13,2,16]){
      pen.fillStyle="#4d3c42b8";pen.fillRect(step,-123,8,246);
      pen.fillStyle="#c59d826a";pen.fillRect(step,-123,1,246);
      pen.fillStyle="#1d142092";pen.fillRect(step+7,-123,2,246);
    }
    for(const post of [-139,139]){
      const torch=pen.createRadialGradient(1,post,1,1,post,84);
      torch.addColorStop(0,"#ffcb8e77");torch.addColorStop(.43,color+"34");torch.addColorStop(1,color+"00");
      pen.fillStyle=torch;pen.fillRect(-83,post-84,168,168);
      pen.fillStyle="#1b131d";pen.fillRect(-17,post-15,43,30);
      pen.fillStyle="#625057";pen.fillRect(-16,post-12,40,4);
      pen.fillStyle="#47363f";pen.fillRect(-12,post-8,32,16);
      pen.strokeStyle="#a7816c8a";pen.lineWidth=1;pen.strokeRect(-11,post-7,29,14);
      pen.fillStyle="#e09565";pen.fillRect(1,post-4,7,8);
      pen.fillStyle="#ffdfaa";pen.fillRect(3,post-3,3,6);
    }
    pen.restore();
  }
}
function paintMaze(img){
  scenery.width=WORLD_W;scenery.height=WORLD_H;
  const pen=scenery.getContext("2d"), color=spiritColors[stage];
  pen.fillStyle="#100d13";pen.fillRect(0,0,WORLD_W,WORLD_H);
  paintPaving(pen,img);
  blendRoomArt(pen,img);
  paintMasonry(pen,color);
  paintRoomFeatures(pen,floor,stage,color);
  paintEntrances(pen,color);
}
function drawArena(){
  const image=requestArt(arenas[stage]), img=image.complete&&image.naturalWidth?image:null;
  if(floor.sceneryImage!==img){paintMaze(img);floor.sceneryImage=img}
  ctx.drawImage(scenery,camera.x,camera.y,W,H,camera.x,camera.y,W,H);
}
function drawMist(){
  const color=spiritColors[stage], p=player;
  const vignette=ctx.createRadialGradient(p.x,p.y,105,p.x,p.y,Math.max(W,H)*.59);
  vignette.addColorStop(0,"#100b1400");vignette.addColorStop(.62,"#130d1873");vignette.addColorStop(1,"#100c14ef");
  ctx.fillStyle=vignette;ctx.fillRect(camera.x,camera.y,W,H);
  const falling=stage===4, slow=stage===1||stage===2||stage===5;
  for(const m of motes){
    const x=camera.x+m.x*W+Math.sin(visualTime*(slow?.42:1)+m.phase)*(falling?33:14);
    const y=camera.y+(H+m.y*H+visualTime*m.speed*(falling?.64:slow?-.28:-1)%H)%H;
    ctx.globalAlpha=m.a*(falling?.93:(.65+.35*Math.sin(visualTime*2+m.phase)));
    oval(x,y,m.r,m.r,color);
  }
  ctx.globalAlpha=1;
}
function drawTell(e){
  if(e.tell<=0)return;
  const pulse=1-e.tell/e.full, red="#fb7459";
  const disk=(x,y,r)=>{
    oval(x,y,r,r,"#b62d3036");circle(x,y,r,"#fb7459a5",2);circle(x,y,Math.max(1,r*pulse),red,2.1);
  };
  switch(e.pattern){
    case "hound":case "charge":{
      const n=e.pattern==="charge"?245:122,width=e.pattern==="charge"?45:25;
      ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.attackA);
      ctx.fillStyle="#fa47382b";ctx.fillRect(0,-width,n,width*2);ctx.fillStyle="#ef634864";ctx.fillRect(0,-width,pulse*n,width*2);ctx.strokeStyle="#f37d68b8";ctx.strokeRect(0,-width,n,width*2);ctx.restore();break;
    }
    case "rush":{
      const reach=Math.max(.01,e.rush.distance), width=(e.r+player.r)*2;
      ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.attackA);ctx.lineCap="round";
      line(0,0,reach,0,"#fa6a5580",width+3);
      line(0,0,reach,0,"#582337d9",width);
      line(0,0,Math.max(.01,reach*pulse),0,"#ff673e5f",width-3);
      const arrowColor=pulse>.72?"#ffe2af":"#ffa37f";
      for(let x=46;x<=reach;x+=55){
        line(x-13,-15,x,0,arrowColor,3);line(x,0,x-13,15,arrowColor,3);
      }
      ctx.restore();break;
    }
    case "archer":{
      const a=range(e.x,e.y,e.attackA,Math.max(W,H));
      ctx.setLineDash([7,8]);line(e.x,e.y,a.x,a.y,"#8affe5a9",1+pulse);ctx.setLineDash([]);break;
    }
    case "brute":disk(e.x,e.y,101);break;
    case "slam":disk(e.x,e.y,e.phase===2?178:145);break;
    case "eye":disk(e.tx,e.ty,68);break;
    case "sigil":for(const s of sigils(e))disk(s.x,s.y,s.r);break;
    case "fan":{
      const count=e.phase===2?19:e.id==="warden"?10:13;
      for(let i=0;i<count;i++){const a=e.attackA+i*TAU/count,s=range(e.x,e.y,a,e.r+18),t=range(e.x,e.y,a,e.r+38+pulse*31);line(s.x,s.y,t.x,t.y,"#ffad7fbe",2.2)}break;
    }
  }
}
function drawMob(e){
  const d=beasts[e.id], size=d.size*(e.elite?1.1:1), airborne=e.id==="eye"||e.id==="archer";
  const rushing=e.rush&&e.tell<=0;
  if(rushing&&e.rush.traveled>0){
    const tail=range(e.x,e.y,e.attackA+PI,Math.min(e.rush.traveled,96));
    ctx.save();ctx.lineCap="round";
    line(tail.x,tail.y,e.x,e.y,e.color+"37",e.r*1.3);
    line(tail.x,tail.y,e.x,e.y,"#ff9d71a0",3);
    ctx.restore();
  }
  const bob=Math.sin(visualTime*(e.tell>0?13:5)+e.seed)*(airborne?5:1.7);
  oval(e.x,e.y+3,e.r*1.26,e.r*.52,"#070509bc");
  const intensity=e.tell>0?.15:e.boss?.105:.065;
  glow(e.x,e.y-14,e.r*2.6,e.color+Math.round(intensity*255).toString(16).padStart(2,"0"));
  if(e.elite)circle(e.x,e.y,e.r+7,"#ff704eac",1.5);
  if(e.boss)circle(e.x,e.y,e.r+7,e.color+"9c",2);
  if(e.flash>0)ctx.filter="brightness(1.9)";
  else if(e.id==="warden")ctx.filter="hue-rotate(238deg) saturate(.75)";
  else if(e.boss&&e.phase===2)ctx.filter="saturate(1.7) brightness(1.15)";
  const tilt=rushing?e.rush.ux*.14:e.tell>0?Math.sin(visualTime*25)*.024:0;
  sprite(d.frame,e.x,e.y+bob,size,e.face,e.color,tilt);
  ctx.filter="none";
  if(e.burn>0)oval(e.x+e.r*.55,e.y-size*.6,3,3,"#ffa254");
  if(!e.boss&&e.hp<e.maxHp){
    const w=e.r*1.75, y=e.y-size*.85-6;
    ctx.fillStyle="#100d16";ctx.fillRect(e.x-w/2,y,w,4);ctx.fillStyle=e.color;ctx.fillRect(e.x-w/2,y,w*clamp(e.hp/e.maxHp,0,1),3);
  }
}
function drawPlayer(){
  const p=player;
  oval(p.x,p.y+4,24,10,"#050407c0");glow(p.x,p.y,56,"#ff78433e");
  circle(p.x,p.y+2,20,p.ash>=100?"#ffe093":"#f9a674",p.ash>=100?2.3:1.25);
  if(linkOpen(p)){circle(p.x,p.y+2,26,"#ffe5a7",2);glow(p.x,p.y,42,"#ffd18c43")}
  if(p.revives)circle(p.x,p.y+2,25,"#ffedbf91",1.2);
  const head=range(p.x,p.y+2,p.a,25),left=range(head.x,head.y,p.a+2.45,6),right=range(head.x,head.y,p.a-2.45,6);
  ctx.fillStyle="#ffdfb3";ctx.beginPath();ctx.moveTo(head.x,head.y);ctx.lineTo(left.x,left.y);ctx.lineTo(right.x,right.y);ctx.fill();
  if(p.inv>0&&p.dash<=0&&Math.sin(visualTime*43)<0)ctx.globalAlpha=.56;
  const swing=p.attackTotal?Math.sin(p.attack/p.attackTotal*PI)*.19:0;
  const tilt=p.dash>0?.23:p.pending?-.13:swing;
  equippedHero(p,p.y+Math.sin(p.step*2)*(p.moving?3:1.1),Math.cos(p.a)>.07?-1:1,Math.cos(p.a)*tilt);
  if(p.parry>0){ctx.beginPath();ctx.arc(p.x,p.y,35,p.parryAngle-SHIELD_GUARD.angle,p.parryAngle+SHIELD_GUARD.angle);ctx.strokeStyle="#ffe094";ctx.lineWidth=3;ctx.stroke()}
  ctx.globalAlpha=1;
}
function drawSlash(f){
  const t=1-f.life/f.max, heavy=f.key==="cleave", r=f.r*(.88+.12*t);
  ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.a);ctx.globalCompositeOperation="lighter";
  if(f.key==="thrust"){
    const g=ctx.createLinearGradient(0,0,r,0);g.addColorStop(0,"#f5572720");g.addColorStop(.55,"#fa774cba");g.addColorStop(1,f.perfect?"#fff1af":"#ffd4bb");
    const width=(f.perfect?24:19)*(1-.45*t);
    ctx.beginPath();ctx.moveTo(0,width*.45);ctx.quadraticCurveTo(r*.56,width,r,0);ctx.quadraticCurveTo(r*.62,-width,0,-width*.45);ctx.closePath();ctx.fillStyle=g;ctx.fill();
    line(r*.1,0,r,0,"#fff1db",2.6);ctx.restore();return;
  }
  const start=-f.arc, end=Math.min(f.arc,start+(f.arc*2)*(.5+1.65*t));
  const g=ctx.createRadialGradient(0,0,r*.50,0,0,r);
  g.addColorStop(0,"#fb512800");g.addColorStop(.51,"#f654362c");g.addColorStop(.87,heavy?"#ff874fe8":"#ef5238a8");g.addColorStop(.98,f.perfect?"#fff1baf7":"#ffe3afcf");g.addColorStop(1,"#ffad6c10");
  ctx.beginPath();ctx.arc(0,0,r,start,end);ctx.arc(0,0,r*(heavy?.62:.73),end,start,true);ctx.closePath();ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();ctx.arc(0,0,r*.974,start*.91,end*.96);ctx.strokeStyle=f.perfect?"#fff1b7":"#ffe9beac";ctx.lineWidth=heavy?3.6:2.1;ctx.stroke();
  if(heavy){ctx.beginPath();ctx.arc(0,0,r*.79,start+.16,end-.15);ctx.strokeStyle="#ffa57599";ctx.lineWidth=1.5;ctx.stroke()}
  ctx.restore();
}
function drawEffects(){
  for(const orb of orbs){
    const outer=Math.abs(orb.side)>=2, radius=outer?7.5:orb.side?9:10.5;
    const tail=range(orb.x,orb.y,orb.a+PI,outer?30:36);
    glow(orb.x,orb.y-8,outer?24:28,outer?"#ffa84f80":"#ff733a80");
    line(tail.x,tail.y-8,orb.x,orb.y-8,outer?"#f98d42b8":"#ed632bb8",outer?4.5:6);
    oval(orb.x,orb.y-8,radius,radius,outer?"#ffb356":"#f9884b");
    oval(orb.x+Math.cos(orb.a)*2,orb.y-8+Math.sin(orb.a)*2,outer?4:5.2,outer?4:5.2,"#fff2bc");
    circle(orb.x,orb.y-8,radius,"#ffc782",1.3);
  }
  for(const s of shots){
    const tail=range(s.x,s.y,s.a+PI,19);glow(s.x,s.y,19,s.color+"57");line(s.x,s.y,tail.x,tail.y,s.color,2.6);oval(s.x,s.y,s.r*.63,s.r*.63,"#fff3ce");
  }
  for(const f of fx){
    const life=clamp(f.life/f.max,0,1);ctx.globalAlpha=life;
    if(f.type==="slash")drawSlash(f);
    if(f.type==="ghost"){ctx.globalAlpha=life*.15;equippedHero({x:f.x,a:f.a,weapons:[f.id],weaponSlot:0,dash:1},f.y,Math.cos(f.a)>.07?-1:1,0)}
    if(f.type==="ring")circle(f.x,f.y,Math.max(1,f.r*(1-life)),f.color,1+life*3);
    if(f.type==="nova"){
      const radius=Math.max(1,f.r*(1-life)*1.25);glow(f.x,f.y,Math.min(radius,640),"#ff9c4966");circle(f.x,f.y,radius,"#ffcd82",7);circle(f.x,f.y,Math.max(1,radius-15),"#fff0b6",2);
    }
  }
  ctx.globalAlpha=1;
  ctx.globalCompositeOperation="lighter";
  for(const d of debris){ctx.globalAlpha=clamp(d.life/d.max,0,1);line(d.x,d.y,d.x-d.vx*.027,d.y-d.vy*.027,d.color,d.r)}
  ctx.globalCompositeOperation="source-over";
  ctx.textAlign="center";ctx.font="700 19px system-ui";
  for(const f of floats){ctx.globalAlpha=clamp(f.life*3,0,1);ctx.lineWidth=4;ctx.strokeStyle="#110910de";ctx.strokeText(f.text,f.x,f.y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y)}
  ctx.globalAlpha=1;
}
function drawChamber(){
  for(const node of floor.nodes){
    const {x,y}=node;
    if(x<camera.x-150||x>camera.x+W+150||y<camera.y-150||y>camera.y+H+150)continue;
    if(!node.visited&&chamber!==node)continue;
    const color=chambers[node.kind].color, size=node.kind==="gate"?80:58;
    glow(x,y,140,color+"24");circle(x,y,size,color+"60",1.5);circle(x,y,size*.74,color+"52",1);
    ctx.textAlign="center";ctx.font="700 25px Georgia";ctx.fillStyle=color+"ab";
    ctx.fillText(chambers[node.kind].icon,x,y+8);
    if(node.cache&&node.done&&!node.claimed){glow(x,y,61,"#a1d2a051");circle(x,y,25,"#a1d2a0",2);ctx.fillStyle="#bce3ac";ctx.fillText("✚",x,y+8)}
  }
  if(!pulse)return;
  const danger=floor.safe?"#8be7d2":"#ff795f", progress=clamp(1-(pulse.at-scene)/.85,0,1);
  ctx.fillStyle=danger+"2d";ctx.strokeStyle=danger+"b5";ctx.lineWidth=1.5+progress;
  for(const z of pulse.zones){
    if(z.w){
      ctx.fillRect(z.x,z.y,z.w,z.h);ctx.strokeRect(z.x,z.y,z.w,z.h);
      ctx.fillStyle=danger+"38";
      ctx.fillRect(z.x,z.y,z.w>z.h?z.w*progress:z.w,z.w>z.h?z.h:z.h*progress);
      ctx.fillStyle=danger+"2d";
    }else{
      ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);
      if(z.inner){ctx.moveTo(z.x+z.inner,z.y);ctx.arc(z.x,z.y,z.inner,0,TAU,true)}
      ctx.fill();ctx.stroke();
      const radius=(z.inner??0)+(z.r-(z.inner??0))*progress;
      circle(z.x,z.y,Math.max(1,radius),danger,2.2);
      ctx.strokeStyle=danger+"b5";
    }
  }
}
function drawThresholds(){
  for(let y=Math.max(0,Math.floor(camera.y/TILE));y<Math.min(MAZE_ROWS,Math.ceil((camera.y+H)/TILE));y++){
    for(let x=Math.max(0,Math.floor(camera.x/TILE));x<Math.min(MAZE_COLS,Math.ceil((camera.x+W)/TILE));x++){
      const lock=floor.seals[tileIndex(x,y)];
      if(!lock)continue;
      const left=x*TILE,top=y*TILE,open=openTile(floor,x,y), combat=lock===BOSS_ROOM_SEAL;
      if(combat&&open)continue;
      const color=combat?"#ff9278":lock===1?"#f2976c":"#8adebd";
      ctx.fillStyle=combat?"#341620ed":open?color+"27":color+"61";ctx.fillRect(left,top,TILE,TILE);
      if(!open){
        ctx.strokeStyle=color+"b8";ctx.strokeRect(left+3,top+3,TILE-6,TILE-6);
        for(let i=10;i<TILE;i+=16)line(left+i,top+7,left+i,top+TILE-7,color,2);
      }
    }
  }
  for(const door of floor.doors){
    if(dist(player,door)>195)continue;
    const combat=door.type===BOSS_ROOM_SEAL, open=sealOpen(floor,door.type);
    if((combat&&open)||(door.type===1&&floor.bossDoor?.locked))continue;
    ctx.textAlign="center";ctx.font="700 14px system-ui";ctx.strokeStyle="#130e18";ctx.lineWidth=4;
    ctx.fillStyle=door.type===2?"#ace9cf":"#ffc29e";
    const message=combat?"首领战 · 房门封闭":door.type===2?(open?"止火密道":"止火密门 · 阀门未关闭"):(open?"封印出口":"封印出口 · 尚余 "+(floor.nodes.length-floor.cleared-1)+" 间");
    ctx.strokeText(message,door.x,door.y-30);ctx.fillText(message,door.x,door.y-30);
  }
  if(floor.tribute){
    const {x,y}=floor.tribute, color=routes.elite.color;
    glow(x,y,72,color+"6e");circle(x,y,24,color,1.6);
    ctx.fillStyle=color;ctx.textAlign="center";ctx.font="700 23px system-ui";ctx.fillText(routes.elite.icon,x,y+8);
  }
  if(floor.cleared!==floor.nodes.length)return;
  const {x,y}=floor.pedestal;
  if(!floor.rewarded&&stage<6){glow(x,y,61,"#ffe0a57c");circle(x,y,22,"#f7ca91",2.4);oval(x,y-8,7,10,"#fff0b4")}
  if(floor.rewarded||stage===6)for(const arch of floor.arches){
    const color=routes[arch.path].color;
    glow(arch.x,arch.y,65,color+"71");
    ctx.fillStyle="#160e1b";ctx.beginPath();ctx.arc(arch.x,arch.y,22,PI,TAU);ctx.lineTo(arch.x+22,arch.y+27);ctx.lineTo(arch.x-22,arch.y+27);ctx.closePath();ctx.fill();
    ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.stroke();
    for(let i=0;i<3;i++)line(arch.x-15+i*2,arch.y+9+i*5,arch.x+15-i*2,arch.y+9+i*5,color+"aa",1.2);
    ctx.textAlign="center";ctx.font="700 13px system-ui";ctx.fillStyle=color;
    ctx.fillText(stage===6?"永夜钟":routes[arch.path].name,arch.x,arch.y+46);
  }
}
function drawTouchAim(){
  if(!touchAim||touchAim.angle===null)return;
  const p=player, {act,angle:a,strength}=touchAim, weapon=activeWeapon();
  if(act==="skill"&&p.skill>0 || act==="weapon"&&(!weapon||p.weaponCd>0))return;
  const color=act==="skill"?"#ff9c70":weapon.color;
  ctx.save();ctx.lineCap="round";
  if(act==="skill"){
    const spread=EMBER_ORB.spread*p.orbSpread*Math.min(1,2/p.orbPairs), edge=spread*p.orbPairs;
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.arc(p.x,p.y,199,a-edge,a+edge);ctx.closePath();
    ctx.fillStyle=color+"20";ctx.fill();
    for(let side=-p.orbPairs;side<=p.orbPairs;side++){
      const end=range(p.x,p.y,a+side*spread,side===0?199:160);
      line(p.x,p.y,end.x,end.y,color+(side===0?"bc":"6f"),side===0?2.5:1.2);
    }
  }else{
    const groundTarget=weapon===weaponBook.prism;
    const end=groundTarget?weaponGround(p,a,80+175*strength):range(p.x,p.y,a,172);
    line(p.x,p.y,end.x,end.y,color+"34",12);line(p.x,p.y,end.x,end.y,color+"b9",2.4);
    if(groundTarget)circle(end.x,end.y,34,color+"9e",2);
  }
  ctx.restore();
}
function draw(){
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle="#0d0a10";ctx.fillRect(0,0,canvas.width/dpr,canvas.height/dpr);ctx.translate(ox,oy);ctx.scale(scale,scale);
  ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
  if(!smallMotion&&shake>0)ctx.translate(between(-shake,shake)*.63,between(-shake,shake)*.63);
  ctx.translate(-camera.x,-camera.y);
  drawArena();
  drawChamber();
  drawThresholds();
  drawWeaponDrops();
  drawMerchant();
  for(const s of spawns)if(s.at-scene<.7){
    const f=clamp(1-(s.at-scene)/.7,0,1), c=beasts[s.id].color;
    glow(s.x,s.y,44+22*f,c+"47");circle(s.x,s.y,33*(1-f)+10,c,2);circle(s.x,s.y,16+25*f,c+"7f",1.5);
  }
  const visible=foes.filter(e=>e.x>camera.x-175&&e.x<camera.x+W+175&&e.y>camera.y-175&&e.y<camera.y+H+175);
  for(const e of visible)drawTell(e);
  drawTouchAim();
  const entities=[...visible,player].sort((a,b)=>a.y-b.y);
  for(const entity of entities)entity===player?drawPlayer():drawMob(entity);
  drawWeaponCombat();
  drawEffects();
  drawMist();
  const fade=descent&&state==="descend"?1-descent.time/.36:Math.max(0,1-scene/.48);
  if(fade>0){ctx.fillStyle=`rgba(9,7,13,${clamp(fade,0,1)})`;ctx.fillRect(camera.x,camera.y,W,H)}
  if(flash>0&&!smallMotion){const g=ctx.createRadialGradient(player.x,player.y,H*.23,player.x,player.y,H*.68);g.addColorStop(0,"#e5263900");g.addColorStop(1,`rgba(196,24,48,${flash*.9})`);ctx.fillStyle=g;ctx.fillRect(camera.x,camera.y,W,H)}
  ctx.restore();
}
function stepEffects(dt){
  shake=Math.max(0,shake-dt*45);flash=Math.max(0,flash-dt*1.65);
  for(const d of debris){d.x+=d.vx*dt;d.y+=d.vy*dt;d.vx*=Math.pow(.1,dt);d.vy*=Math.pow(.1,dt);d.life-=dt}
  for(const f of fx)f.life-=dt;
  for(const f of floats){f.y-=dt*44;f.life-=dt}
  debris=debris.filter(d=>d.life>0);fx=fx.filter(f=>f.life>0);floats=floats.filter(f=>f.life>0);
}

const skillButtons=[...document.querySelectorAll(".abilities button")];
function drawHud(){
  const p=player,name=rooms[stage][0], boss=foes.find(e=>e.boss);
  $("hpText").textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;
  $("hpFill").style.width=p.hp/p.maxHp*100+"%";$("ashFill").style.width=p.ash+"%";
  $("roomText").textContent=`${String(stage+1).padStart(2,"0")} / 07 · ${name}`;
  $("chamberText").textContent=`${chamber?roomForms[chamber.form].name:chamberName(chamber)} · ${floor.cleared}/${floor.nodes.length} 间肃清`;
  const routeLabel=$("routeText"), rules=routes[route];
  let progress="";
  if(route==="elite")progress=floor.tribute?" · 馈赠可领":floor.elitesDefeated===ELITE_COUNT?" · 馈赠已领":` · 精英 ${floor.elitesDefeated}/${ELITE_COUNT}`;
  routeLabel.textContent=stage>0?rules.name+progress:"";routeLabel.style.color=rules.color;
  const rail=$("traverse");
  if(rail.dataset.stage!==String(stage)){
    rail.dataset.stage=String(stage);rail.innerHTML=rooms.map((_,i)=>`<i class="${i===stage?"here":i<stage?"done":""}"></i>`).join("");
  }
  $("killText").textContent=`击败 ${kills}`;$("bossHud").hidden=!boss;
  if(boss){$("bossName").textContent=beasts[boss.id].name+(boss.phase===2?" · 二阶段":"");$("bossFill").style.width=boss.hp/boss.maxHp*100+"%"}
  const charges=[p.attack===0?1:1-p.attack/p.attackTotal,1-p.dashCd/dashCooldown(p),1-p.skill/(EMBER_ORB.cooldown*p.skillRate),p.ash/100,activeWeapon()?1-p.weaponCd/p.weaponCdTotal:0,p.weapons.length===2?1:0];
  const cooling=[false,p.dashCd>0,p.skill>0,false,p.weaponCd>0,false];
  skillButtons.forEach((b,i)=>{b.style.setProperty("--charge",clamp(charges[i],0,1)*100+"%");b.classList.toggle("ready",charges[i]>=.999);b.classList.toggle("cooling",cooling[i])});
  const weapon=activeWeapon(), spare=weaponBook[p.weapons[1-p.weaponSlot]], nextMove=p.comboT>0?(p.combo+1)%3:0;
  const link=linkOpen(p), next=(weapon?.moves??swordMoves)[nextMove].name;
  $("weaponName").textContent=weapon?.name??"余烬刃";
  $("weaponName").style.color=weapon?.color??"";
  $("spareName").textContent=spare?" / "+spare.name:"";
  $("weaponSwap").title=spare?"切换到"+spare.name+"（T）":"拾取第二把武器后可切换";
  $("weaponSkill").title=weapon?`${weapon.skill}（R） · ${weapon.detail}`:"拾取武器后解锁专属技能";
  $("weaponSkill").disabled=!weapon;$("weaponSwap").disabled=!spare;
  skillButtons[0].classList.toggle("link",link);$("swordState").textContent=link?(touchUI?"接刃":"接刃 · "+next):next;
  const countdown=seconds=>Math.max(.1,seconds).toFixed(1)+(touchUI?"":" 秒");
  $("weaponState").textContent=p.weaponCd>0?countdown(p.weaponCd):weapon?.skill??"武技";
  $("switchState").textContent="切武器";
  $("dashState").textContent=p.dashCd>0?countdown(p.dashCd):"闪步";
  $("orbState").textContent=p.skill>0?countdown(p.skill):p.orbPairs>1?`焚印 ×${2*p.orbPairs+1}`:"焚印";
  $("ultState").textContent=p.ash>=100?"丧钟就绪":`${touchUI?"":"余烬 "}${Math.floor(p.ash)}%`;
  $("interact").hidden=!nearby;
  $("interactLabel").textContent=nearby?.label??"";
  $("interactDetail").textContent=nearby?.detail??"";
  $("combatTip").textContent=chamber&&chambers[chamber.kind].hazard&&!chamber.done?chambers[chamber.kind].note:tips[stage];
  const list=$("relicRow"), key=acquired.map(x=>x.id).join();
  if(list.dataset.key!==key){list.dataset.key=key;list.innerHTML=[...new Set(acquired)].map(r=>`<span title="${r.name}：${r.text}">${r.icon} ${relicTitle(r)}</span>`).join("")}
}

function showModal(body, choices=[]){
  if($("curtain").hidden)previousFocus=document.activeElement;
  modalChoices=choices;$("panel").innerHTML=body;$("curtain").hidden=false;
  $("home").inert=true;$("game").inert=true;
  $("panel").querySelector("button")?.focus();
}
function closeModal(){
  $("curtain").hidden=true;$("home").inert=false;$("game").inert=false;modalChoices=[];
  if(previousFocus&&previousFocus.getClientRects().length)previousFocus.focus({preventScroll:true});
  previousFocus=null;
}
const heading=(title,desc="")=>`<h2 id="panelTitle" class="panel-title">${title}</h2>${desc?`<p>${desc}</p>`:""}`;
const btn=(id,name,primary=false)=>`<button class="${primary?"primary":"outline"}" id="${id}">${name}</button>`;
const row=(...btns)=>`<div class="button-row">${btns.join("")}</div>`;
const grid=entries=>`<div class="guide-grid">${entries.map(([key,value])=>`<div><b>${key}</b>${value}</div>`).join("")}</div>`;
function cards(list,kind="",disabled=false){
  return `<div class="choices ${kind}">${list.map((item,i)=>{
    const copies=relicCopies(item);
    const stack=`上限 ${item.maxCopies} 份`;
    const school=`${schools[item.school].name} · ${stack}${copies?` · 已有 ${copies} 份`:""}`;
    return `<button class="card" data-pick="${i}" data-school="${item.school}"${disabled?" disabled":""}><span class="icon" aria-hidden="true">${item.icon}</span><kbd>${(i+1)%10}</kbd><span class="school">${school}</span><b>${item.name}</b><small>${item.text}</small></button>`;
  }).join("")}</div>`;
}
function drawFloorPlan(){
  const map=$("mapWires"), pen=map.getContext("2d");
  const w=map.width/MAZE_COLS,h=map.height/MAZE_ROWS;
  for(let y=0;y<MAZE_ROWS;y++)for(let x=0;x<MAZE_COLS;x++){
    const k=tileIndex(x,y);
    if(!floor.seen[k])continue;
    const owner=floor.nodes[floor.owners[k]];
    pen.fillStyle=floor.seals[k]&&!openTile(floor,x,y)?"#a34c48":owner?.done?"#9e7968":owner?"#5b4256":"#77545e";
    pen.fillRect(x*w,y*h,Math.ceil(w),Math.ceil(h));
  }
  const drops=[...floor.loot,...floor.armories];
  for(const item of drops){
    if(!floor.seen[tileAt(item.x,item.y)]||player.weapons.includes(item.id))continue;
    pen.fillStyle=item.id?weaponBook[item.id].color:"#ffe3a7";
    const x=item.x/TILE*w,y=item.y/TILE*h;pen.fillRect(x-2,y-2,4,4);
  }
  if(floor.tribute){
    const {x,y}=floor.tribute;
    pen.fillStyle=routes.elite.color;pen.fillRect(x/TILE*w-3,y/TILE*h-3,6,6);
  }
  const shop=floor.merchant;
  if(shop?.node.visited&&!shop.sold){
    const x=shop.x/TILE*w, y=shop.y/TILE*h;
    pen.fillStyle=merchantColor;pen.beginPath();pen.moveTo(x,y-6);pen.lineTo(x+6,y);pen.lineTo(x,y+6);pen.lineTo(x-6,y);pen.closePath();pen.fill();
  }
  pen.beginPath();pen.arc(player.x/TILE*w,player.y/TILE*h,6,0,TAU);pen.fillStyle="#ffe5a0";pen.fill();
}
function showFloorMap(){
  state="map-preview";resetInput();
  const nodes=floor.nodes.filter(node=>node.visited).map(node=>{
    const detail=chambers[node.kind];
    return `<span class="map-node ${node===chamber?"current":""}" style="--map-x:${node.x/WORLD_W*100}%;--map-y:${(node.y-68)/WORLD_H*100}%;--map-color:${detail.color}">${detail.icon} ${chamberName(node)}${node.done?" ✓":""}${node.cache&&node.done&&!node.claimed?" ✚":""}</span>`;
  }).join("");
  const map=`<div class="floor-map"><canvas id="mapWires" width="640" height="520" aria-hidden="true"></canvas>${nodes}</div>`;
  const trapStatus=floor.safe?"陷阱无伤，密道已开":"可关闭陷阱对你的伤害";
  const shop=floor.merchant;
  const shopNote=shop?.node.visited&&!shop.sold?`<span class="merchant-marker">◆ 收钟人 · ${MERCHANT_PRICE} 余烬</span>`:"";
  const switches=`<div class="map-status"><span class="${floor.safe?"on":""}">止火阀 · ${trapStatus}</span><span class="${floor.hostile?"on":""}">逆流钟 · ${floor.hostile?"机关可伤敌":"可让机关伤敌"}</span>${floor.tribute?'<span class="on">红色方点 · 赤咒馈赠</span>':""}${shopNote}</div>`;
  const status=floor.bossDoor?.locked?"首领房已封闭":floor.cleared>=floor.nodes.length-1?"出口封印已开":"出口封印未开";
  showModal(heading(rooms[stage][0],`已肃清 ${floor.cleared} / ${floor.nodes.length} 间 · ${status} · 金圆点是你，彩色方点是武器`)+switches+map+row(btn("closeFloorMap","继续探索",true)));
  drawFloorPlan();$("closeFloorMap").onclick=closeFloorMap;
}
function closeFloorMap(){
  if(state!=="map-preview")return;
  state="fight";closeModal();
}
function exitDetails(path,level){
  const rules=routes[path], supply=entrySupply(path);
  const healing=Math.min(supply.hp,player.maxHp-player.hp);
  const ash=Math.min(supply.ash,100-player.ash);
  const recovery=`入场回复 ${healing} 点生命（最多 ${supply.hp}）`+(supply.ash?`，补充 ${Math.floor(ash)} 点余烬（最多 ${supply.ash}）`:"");
  const scale=mobHealthScale(level,path);
  const increase=Math.round((scale/mobHealthScale(level-1,route)-1)*100);
  const next=rooms[level], bossId=next.length===2?mobCode[next[1]]:null;
  const bossNote=bossId?`\n${beasts[bossId].name} · ${enemyHealth(bossId,level,path)} 点生命。`:"";
  const scaling=`第 ${level+1} 层普通怪生命比当前层约 ${increase>=0?"+":""}${increase}%。${bossNote}`;
  if(path==="elite")return `${recovery}\n小怪和精英伤害 +${Math.round((rules.enemyDamage-1)*100)}%，出手前摇缩短 ${Math.round((1-rules.enemyWindup)*100)}%。${scaling}\n前厅和轮转中庭各多一只精英，生命 +${Math.round((ELITE_HEALTH-1)*100)}%、移速 +${Math.round((ELITE_SPEED-1)*100)}%。击败两只可额外三选一，立即获得一件遗物。`;
  if(path==="shrine")return `${recovery}\n小怪最大生命比同层基础值低 ${Math.round((1-rules.enemyHealth)*100)}%。${scaling}\n本层战斗中获得的余烬减少 ${Math.round((1-rules.ashGain)*100)}%。`;
  const reduction=Math.round((1-rules.enemyHealth)*100);
  return `${recovery}\n下一层所有敌人最大生命比同层基础值低 ${reduction}%。${scaling}\n肃清下一层后，烛台旁的钟鸣武库提供 ${ARMORY_OFFER_COUNT} 把随机武器，可选一把。`;
}
function nearInteraction(){
  if(floor.cleared===floor.nodes.length){
    if(!floor.rewarded&&stage<6){
      if(dist(player,floor.pedestal)<66)return {type:"relic",label:"点亮烛台 · 领取遗物"};
    }else{
      const arch=floor.arches.find(exit=>dist(player,exit)<60);
      if(arch){
        const detail=stage===6?"结算远征":exitDetails(arch.path,stage+1);
        return {type:"arch",path:arch.path,detail,label:stage===6?"敲响永夜钟":"查看路线 · "+routes[arch.path].name};
      }
    }
  }
  const armory=floor.armories.find(loot=>dist(player,loot)<74&&floorSight(floor,player,loot));
  if(armory)return {type:"armory",loot:armory,label:armory.title+" · 武器三选一",detail:"可在离开本层前领取"};
  if(floor.tribute&&dist(player,floor.tribute)<68&&floorSight(floor,player,floor.tribute))return {type:"tribute",label:"领取赤咒馈赠 · 三选一"};
  const merchant=merchantInteraction();
  if(merchant)return merchant;
  if(chamber?.cache&&chamber.done&&!chamber.claimed&&dist(player,chamber)<66)return {type:"cache",label:"打开余火匣"};
  const loot=floor.loot.filter(item=>!player.weapons.includes(item.id)&&dist(player,item)<62&&floorSight(floor,player,item)).sort((a,b)=>dist(player,a)-dist(player,b))[0];
  return loot?{type:"weapon",loot,label:"拾取 · "+weaponBook[loot.id].name,detail:weaponBook[loot.id].role}:null;
}
function interact(){
  if(state!=="fight")return;
  const target=nearInteraction();
  if(!target)return;
  if(target.type==="armory"||target.type==="weapon")openWeaponLoot(target.loot);
  else if(target.type==="tribute")showRelicChoice(true);
  else if(target.type==="merchant")showMerchant();
  else if(target.type==="cache"){
    state="cache";resetInput();
    showModal(heading("余火匣","任选一份补给。")+row(btn("cacheHeal","回复 10 生命",true),btn("cacheAsh","获得 7 余烬"),btn("cacheClose","稍后再来")));
    $("cacheHeal").onclick=()=>claimCache(true);$("cacheAsh").onclick=()=>claimCache(false);$("cacheClose").onclick=closeCache;
  }else if(target.type==="relic")showRelicChoice();
  else if(stage===6)finish(true);
  else showRoutes();
}
function showRoutes(){
  state="routes";resetInput();
  const level=stage+1, next=rooms[level];
  const paths=floor.arches.map(arch=>arch.path);
  const choices=paths.map((path,i)=>{
    const {name,icon,trade,color}=routes[path];
    return `<button class="card" data-pick="${i}" style="--accent:${color}"><span class="icon" aria-hidden="true">${icon}</span><kbd>${i+1}</kbd><b>${name}</b><span class="school">${trade}</span><small>${exitDetails(path,level)}</small></button>`;
  }).join("");
  const title=`下一层 · ${next[0]}`;
  const note=next.length===2?"清空其余房间后解封首领房。":`第 ${level+1} 层 · 选中路线后立即下行。`;
  const armoryNote=floor.armories.length?" 武库奖励可跳过。想领取可以先返回本层。":"";
  showModal(heading(title,note+armoryNote)+`<div class="choices route-options">${choices}</div>`+row(btn("routesBack","返回本层")),paths.map(path=>()=>descend(path)));
  $("routesBack").onclick=closeOptionalChoice;
}
function closeOptionalChoice(){
  state="fight";closeModal();
}
function descend(path){
  if(state!=="routes")return;
  state="descend";nearby=null;descent={path,time:.36};resetInput();closeModal();drawHud();sfx("bell");
}
function closeCache(){
  if(state!=="cache")return;
  state="fight";closeModal();
}
function claimCache(heal){
  if(state!=="cache"||!chamber?.cache||chamber.claimed)return;
  chamber.claimed=true;
  if(heal)player.hp=Math.min(player.maxHp,player.hp+10);
  else player.ash=Math.min(100,player.ash+7);
  sfx("choose");closeCache();nearby=null;drawHud();
}
function canTakeRelic(relic){return relicCopies(relic)<relic.maxCopies}
function relicCopies(relic){return acquired.filter(r=>r===relic).length}
function relicTitle(relic){
  const copies=relicCopies(relic);
  return relic.name+(copies>1?` ×${copies}`:"");
}
function showRelicInventory(){
  if(state!=="fight"&&state!=="pause")return;
  relicInventoryReturn=state;
  state="relic-inventory";resetInput();
  const owned=[...new Set(acquired)];
  const entries=owned.map(relic=>`<li class="inventory-relic">
    <span class="inventory-icon" aria-hidden="true">${relic.icon}</span>
    <div><h3>${relic.name}</h3><div class="inventory-count">${schools[relic.school].name} · 已获 ${relicCopies(relic)} / ${relic.maxCopies} 份</div><p>${relic.text}</p></div>
  </li>`).join("");
  const summary=owned.length?`已获得 ${owned.length} 种，共 ${acquired.length} 份。`:"本局还没有获得遗物。";
  showModal(`<div class="inventory-heading"><div>${heading("本局遗物",summary)}</div>${btn("closeRelicInventory",relicInventoryReturn==="pause"?"返回暂停":"继续战斗")}</div>`+
    (owned.length?`<ul class="inventory-list" tabindex="0" aria-label="已获得的遗物">${entries}</ul>`:""));
  $("closeRelicInventory").onclick=closeRelicInventory;
}
function closeRelicInventory(){
  if(state!=="relic-inventory")return;
  state=relicInventoryReturn;
  if(state==="pause"){
    showPauseMenu();$("pauseRelics").focus({preventScroll:true});
  }else closeModal();
}
function offerRelics(count){
  const pool=relics.filter(canTakeRelic);
  const pick=items=>items.splice(Math.floor(Math.random()*items.length),1)[0];
  const bySchool=[];
  for(const school of Object.keys(schools)){
    const options=pool.filter(r=>r.school===school);
    const fresh=options.filter(r=>!previousRelicOffer.includes(r));
    if(options.length)bySchool.push(pick(fresh.length?fresh:options));
  }
  if(count<bySchool.length){
    const distinct=[];
    while(distinct.length<count)distinct.push(pick(bySchool));
    return distinct;
  }
  const spare=pool.filter(r=>!bySchool.includes(r));
  while(bySchool.length<count&&spare.length)bySchool.push(pick(spare));
  return bySchool;
}
function showRelicChoice(bonus=false){
  state=bonus?"tribute":"reward";resetInput();
  if(bonus){
    if(!floor.tribute.choices||floor.tribute.choices.some(r=>!canTakeRelic(r)))floor.tribute.choices=offerRelics(3);
    selected=floor.tribute.choices;
    showModal(heading("赤咒馈赠","两名精英已击败。选择一件遗物，持有上限见卡片。")+cards(selected,"rewards bonus")+row(btn("tributeBack","稍后再领")),selected.map((_,i)=>()=>chooseRelic(i)));
    $("tributeBack").onclick=closeOptionalChoice;
    return;
  }
  selected=offerRelics(5);previousRelicOffer=selected;
  showModal(heading("余烬遗物",`已通过第 ${cleared} 重试炼 · 选择一件。${RELIC_STACK_NOTE}`)+cards(selected,"rewards"),selected.map((_,i)=>()=>chooseRelic(i)));
}
function chooseRelic(i){
  const bonus=state==="tribute";
  if((state!=="reward"&&!bonus)||!selected[i])return;
  const r=selected[i];
  if(!grantRelic(r))return;
  if(bonus)floor.tribute=null;
  else floor.rewarded=true;
  sfx("choose");state="fight";closeModal();nearby=nearInteraction();
  announce(relicTitle(r),bonus?"已领取赤咒馈赠":"沿北侧门廊前往下一层",1.5);drawHud();
}
function grantRelic(relic){
  if(!canTakeRelic(relic))return false;
  const p=player, previousDashCooldown=dashCooldown(p), skillRate=p.skillRate;
  acquired.push(relic);relic.add(p);
  const nextDashCooldown=dashCooldown(p);
  if(nextDashCooldown!==previousDashCooldown)p.dashCd=Math.max(p.dashMinCd,p.dashCd*nextDashCooldown/previousDashCooldown);
  if(p.skillRate!==skillRate)p.skill*=p.skillRate/skillRate;
  p.hp=clamp(p.hp,0,p.maxHp);p.ash=clamp(p.ash,0,100);
  return true;
}
function finish(win){
  state="end";resetInput();sfx(win?"bell":"hurt");save.runs++;save.kills+=kills;save.best=Math.max(save.best,cleared);if(win)save.wins++;
  storeSave();updateBest();
  const secs=Math.floor(elapsed), time=`${Math.floor(secs/60)}:${String(secs%60).padStart(2,"0")}`;
  showModal(heading(win?"钟响，长夜消散":"余烬熄灭",win?"永夜钟主已倒下。拂晓自钟楼升起。":"钟声尚未响起。下一次远征将重新抽取敌群与遗物。")+
    grid([["试炼进度",`${cleared} / 7`],["击败敌人",kills],["战斗时长",time],["收集遗物",acquired.length]])+
    (acquired.length?`<p class="muted">${[...new Set(acquired)].map(relicTitle).join(" · ")}</p>`:"")+row(btn("again","再度远征",true),btn("return","返回主界面")));
  $("again").onclick=begin;$("return").onclick=home;
}
function pause(){
  if(state!=="fight")return;
  state="pause";resetInput();showPauseMenu();
}
function showPauseMenu(){
  const loadout=player.weapons.map((id,i)=>{
    const w=weaponBook[id];
    return [`${i===player.weaponSlot?"当前 · ":"备用 · "}${w.name}`,`${w.basic}<br><b>R ${w.skill} · ${w.cd} 秒</b>${w.detail}`];
  });
  if(player.leech)loadout.push([`温热血石 ×${player.leech}`,`击杀小怪回复 ${LEECH_KILL_HEAL*player.leech} 点，本层已用 ${player.leechUsed} / ${LEECH_LIMIT*player.leech} 点。每打掉首领 20% 最大生命，回复 ${LEECH_BOSS_HEAL*player.leech} 点。`]);
  if(player.dashStrike)loadout.push([`逆刃之轨 ×${player.dashStrike}`,`闪步穿过小怪造成 ${DASH_STRIKE.mobDamage*player.dashStrike} 点伤害，对首领造成 ${DASH_STRIKE.bossDamage*player.dashStrike} 点伤害。`]);
  if(acquired.some(r=>r.id==="guard"))loadout.push(["无声庇佑",`剩余复活 ${player.revives} 次，每次原地恢复至最大生命值的 ${REVIVE_HP_PERCENT}%。`]);
  const basics=touchUI?"点按自动瞄准，长按连击。亮起「接刃」时再次点按。":"左键 / J 普攻，T 切武器。普攻键亮起时点按可完美接招。";
  const ember=touchUI?"点按自动瞄准，拖动再松手可指定方向。":"E · 朝移动方向发射焚球。";
  showModal(heading("远征暂停",`${rooms[stage][0]} · 第 ${stage+1} 重试炼`)+
    grid([...loadout,["普攻与切换",basics],["闪步",`${touchUI?"沿摇杆方向":"空格"} · 短暂无敌，基础冷却 ${DASH_COOLDOWN} 秒。总减冷却上限 ${DASH_REDUCTION_CAP}%，最短 ${DASH_MIN_COOLDOWN.toFixed(2)} 秒。`],["焚印",ember+"基础三颗。获得五芒焰芯后发射五颗。"],["丧钟",`${touchUI?"":"Q · "}消耗 100 余烬，本层对附近可见敌人造成 ${FLOOR_BELL_DAMAGE[stage]} 点基础伤害。`]])+
    (touchUI?`<div class="touch-options">${btn("touchHand","")}${btn("touchSize","")}</div>`:"")+
    row(btn("resume","继续战斗",true),btn("pauseRelics","查看遗物"),btn("muteGame",save.muted?"开启音效":"关闭音效"),btn("leave","结束远征")));
  $("resume").onclick=resume;$("pauseRelics").onclick=showRelicInventory;$("leave").onclick=confirmLeave;
  $("muteGame").onclick=()=>{toggleSound();$("muteGame").textContent=save.muted?"开启音效":"关闭音效"};
  if(touchUI){
    const hand=$("touchHand"), size=$("touchSize");
    const showOptions=()=>{
      hand.textContent=save.touchLeft?"摇杆在右":"摇杆在左";
      size.textContent=save.touchLarge?"按键大小 · 大":"按键大小 · 标准";
    };
    hand.onclick=()=>{save.touchLeft=!save.touchLeft;syncTouchLayout();showOptions();storeSave()};
    size.onclick=()=>{save.touchLarge=!save.touchLarge;syncTouchLayout();showOptions();storeSave()};
    showOptions();
  }
}
function confirmLeave(){
  showModal(heading("结束本次远征？","本局将结算至已通过的层数，遗物会随远征结束。")+row(btn("stay","继续战斗",true),btn("exitRun","结束并结算")));
  $("stay").onclick=resume;$("exitRun").onclick=()=>finish(false);
}
function resume(){if(state!=="pause")return;wakeAudio();resetInput();state="fight";closeModal()}
function showGuide(){
  if(touchUI){
    wakeAudio();showModal(heading("触屏操作","游戏以横屏显示。请横着拿手机，暂停菜单可交换摇杆位置或放大按键。")+
      grid([["移动",`在${save.touchLeft?"右":"左"}下方按住并拖动，摇杆会出现在手指附近。`],["普攻","点按自动瞄准，长按连续出招。亮起「接刃」时再点按可触发完美接招。"],["闪步","点按立即朝移动方向闪避。松开摇杆时，沿角色当前朝向闪避。"],["焚印与武技","点按自动选目标。按住技能朝想打的方向拖动，松手释放。拖回起点再松手可取消。"],["丧钟","余烬满 100% 后点按，震击附近敌人。"],["探索","靠近武器、烛台和门时，点出现的交互键。地图和遗物在屏幕上方。"]])+row(btn("dismiss","返回",true)));
    $("dismiss").onclick=closeModal;return;
  }
  wakeAudio();showModal(heading("守钟人的武技","沿走廊探索、肃清整层，再走到出口烛台与下行阶梯。")+
    grid([["移动","WASD / 方向键，触屏使用左侧摇杆"],["武器普攻","J 自动瞄准，鼠标左键朝光标出招。长按连击，光环亮起时点按可强化下一招。"],["武器与专属技","小怪有 5% 几率掉落武器，按 F 拾取。最多携带两把，按 T 切换，按 R 释放专属技。两把武器共用专属技冷却。"],["铸钟武库","第四层首领掉三把不同的武器，可在下行前三选一，也可跳过。触屏可直接点击武技、切换和拾取。"],["闪步","空格无敌闪避，可取消剑招。完美闪步额外积攒余烬。"],["焚印","按 E 或点一下技能按钮，朝移动方向扇形发射焚球，基础三颗，可通过遗物增加。站定时沿当前朝向发射。"],["丧钟",`Q 消耗 100 余烬，对视线内的敌人造成伤害，并清除附近弹幕。基础伤害从首层的 ${FLOOR_BELL_DAMAGE[0]} 点开始，随层数提高。`],["探索","M 查看已走过的区域。靠近烛台、补给箱或阶梯，按 F 或点交互按钮。"]])+row(btn("dismiss","返回",true)));
  $("dismiss").onclick=closeModal;
}
function records(){
  const lore={hound:"锁定前方后会直线扑袭。看到地面红线时向侧面闪避。",archer:"喜欢保持距离。青色虚线标示它的射击方向。",brute:"沉重的双拳会震击周围，攻击前有明显蓄力。",eye:"把爆裂刻印放在你刚才的位置。走出圆环即可躲开。",warden:"轮流使用震地、环形弹幕和冲撞。冲撞前地面会亮起带箭头的红色路线，向侧面躲开后可趁它收招反击。半血召唤裂骨猎犬，冲撞也会加快。",bell:"拥有四种攻击，半血后加速攻击并召来蚀日之眼。"};
  const known=Object.entries(beasts).map(([id,b])=>[save.unlocked[id]?b.name:"未遭遇",save.unlocked[id]?lore[id]:"在远征中首次遭遇后解锁"]);
  showModal(heading("远征档案",`远征 ${save.runs} 次 · 通关 ${save.wins} 次 · 最深 ${save.best} / 7 层 · 累计击败 ${save.kills}`)+grid(known)+row(btn("dismiss","返回",true)));
  $("dismiss").onclick=closeModal;
}
function toggleSound(){save.muted=!save.muted;if(!save.muted)wakeAudio();if(audioOut)audioOut.gain.value=save.muted?0:.38;syncSound();storeSave()}

function syncTouchLayout(){
  const app=$("app");
  app.classList.toggle("touch-ui",touchUI);
  app.classList.toggle("touch-left",save.touchLeft);
  app.classList.toggle("touch-large",save.touchLarge);
}
function resetInput(){
  keys.clear();actions.clear();touchCasts.clear();touchAim=null;weaponAim=null;
  if(player){player.buffer=null;player.weaponInput=0}
  resetCanvasPointer();resetStick();
  for(const [button,id] of controlPointers){
    controlPointers.delete(button);button.classList.remove("is-pressed");releasePointer(button,id);
  }
}
function releasePointer(element,id){if(id!==null&&element.hasPointerCapture?.(id))element.releasePointerCapture(id)}
function resetCanvasPointer(){
  const id=pointer.id;pointer.id=null;pointer.down=false;releasePointer(canvas,id);
}
function controlDelta(event,x,y){
  const dx=event.clientX-x, dy=event.clientY-y;
  return touchRotated?{x:dy,y:-dx}:{x:dx,y:dy};
}
function controlPoint(event,box){
  return controlDelta(event,box.left+(touchRotated?box.width:0),box.top);
}
function point(event){
  const local=controlPoint(event,canvas.getBoundingClientRect());
  pointer.x=(local.x-ox)/scale;pointer.y=(local.y-oy)/scale;
}
canvas.addEventListener("pointermove",e=>{if(e.pointerType!=="touch"&&state==="fight")point(e)});
canvas.addEventListener("pointerdown",e=>{
  if(state!=="fight"||e.pointerType==="touch"||e.button!==0||pointer.id!==null)return;
  wakeAudio();lastAction="mouse";point(e);pointer.id=e.pointerId;pointer.down=true;
  actions.add("attack");canvas.setPointerCapture(e.pointerId);e.preventDefault();
});
for(const type of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(type,e=>{if(e.pointerId===pointer.id)resetCanvasPointer()});
canvas.addEventListener("contextmenu",e=>e.preventDefault());

const movementZone=$("touchMove"), pad=$("stick"), stickKnob=pad.firstElementChild;
function resetStick(){
  const id=stick.id;
  stick.id=null;stick.x=0;stick.y=0;stickKnob.style.transform="";
  pad.style.removeProperty("--stick-x");pad.style.removeProperty("--stick-y");pad.classList.remove("is-pressed");
  releasePointer(movementZone,id);
}
function moveStick(e){
  if(stick.id!==e.pointerId)return;
  const {x:dx,y:dy}=controlDelta(e,stick.startX,stick.startY), distance=Math.hypot(dx,dy);
  const power=clamp((distance-6)/34,0,1), factor=distance?power/distance:0;
  stick.x=dx*factor;stick.y=dy*factor;
  stickKnob.style.transform=`translate(${stick.x*stick.knobTravel}px,${stick.y*stick.knobTravel}px)`;
}
movementZone.onpointerdown=e=>{
  if(state!=="fight"||stick.id!==null||e.button>0)return;
  e.preventDefault();wakeAudio();lastAction="touch";
  const area=movementZone.getBoundingClientRect(), radius=pad.getBoundingClientRect().width/2;
  const origin=controlPoint(e,area), width=touchRotated?area.height:area.width, height=touchRotated?area.width:area.height;
  Object.assign(stick,{id:e.pointerId,startX:e.clientX,startY:e.clientY,knobTravel:radius*.54});
  pad.style.setProperty("--stick-x",`${clamp(origin.x,radius,width-radius)}px`);
  pad.style.setProperty("--stick-y",`${clamp(origin.y,radius,height-radius)}px`);
  pad.classList.add("is-pressed");movementZone.setPointerCapture(e.pointerId);
};
movementZone.onpointermove=moveStick;
for(const type of ["pointerup","pointercancel","lostpointercapture"])movementZone.addEventListener(type,e=>{if(e.pointerId===stick.id)resetStick()});

function updateTouchAim(e){
  if(!touchAim||touchAim.id!==e.pointerId)return;
  const {x:dx,y:dy}=controlDelta(e,touchAim.x,touchAim.y), distance=Math.hypot(dx,dy);
  touchAim.angle=distance>=11?Math.atan2(dy,dx):null;
  touchAim.dragged||=touchAim.angle!==null;
  touchAim.strength=clamp((distance-11)/56,0,1);
}
for(const b of skillButtons){
  b.onpointerdown=e=>{
    if(state!=="fight"||b.disabled||e.button>0||controlPointers.has(b))return;
    const act=b.dataset.act, canAim=e.pointerType==="touch"&&(act==="skill"||act==="weapon");
    if(canAim&&touchAim)return;
    e.preventDefault();b.setPointerCapture(e.pointerId);wakeAudio();lastAction="touch";
    controlPointers.set(b,e.pointerId);b.classList.add("is-pressed");
    if(canAim)touchAim={id:e.pointerId,act,x:e.clientX,y:e.clientY,angle:null,dragged:false,strength:0};
    else actions.add(act);
  };
  b.onpointermove=updateTouchAim;
  const endPress=(e,cast)=>{
    if(controlPointers.get(b)!==e.pointerId)return;
    controlPointers.delete(b);b.classList.remove("is-pressed");
    if(touchAim?.id===e.pointerId){
      if(cast&&state==="fight"){
        updateTouchAim(e);
        const {act,angle,strength,dragged}=touchAim;
        if(!dragged||angle!==null){lastAction="touch";actions.add(act);touchCasts.set(act,{angle,strength})}
      }
      touchAim=null;
    }
    releasePointer(b,e.pointerId);
  };
  b.onpointerup=e=>endPress(e,true);
  b.onpointercancel=b.onlostpointercapture=e=>endPress(e,false);
  b.onclick=e=>{if(e.detail===0&&state==="fight"){lastAction="keyboard";actions.add(b.dataset.act)}};
}
document.addEventListener("pointerdown",e=>{
  if(e.pointerType==="touch"&&!touchUI){touchUI=true;syncTouchLayout();resize();if(player&&state!=="home")drawHud()}
},true);
function supportTouchTaps(region,selector="button"){
  const active=new Map(), handled=new WeakMap();
  region.addEventListener("pointerdown",e=>{
    if(e.pointerType!=="touch")return;
    const button=e.target.closest(selector);
    if(button&&!button.disabled)active.set(e.pointerId,{button,x:e.clientX,y:e.clientY});
  });
  region.addEventListener("pointermove",e=>{
    const tap=active.get(e.pointerId);
    if(tap&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>12)active.delete(e.pointerId);
  });
  region.addEventListener("pointercancel",e=>active.delete(e.pointerId));
  region.addEventListener("pointerup",e=>{
    const tap=active.get(e.pointerId);active.delete(e.pointerId);
    if(!tap||tap.button.disabled||!tap.button.contains(document.elementFromPoint(e.clientX,e.clientY)))return;
    handled.set(tap.button,Date.now()+450);tap.button.click();
  });
  region.addEventListener("click",e=>{
    if(e.detail>0&&Date.now()<(handled.get(e.target.closest(selector))??0)){
      e.preventDefault();e.stopImmediatePropagation();
    }
  },true);
}
supportTouchTaps($("home"));
supportTouchTaps($("game"),"#pause, #mapButton, #relicButton, #interact");
supportTouchTaps($("panel"));
$("panel").addEventListener("click",e=>{
  const button=e.target.closest("[data-pick]");if(button)modalChoices[Number(button.dataset.pick)]?.();
});
window.addEventListener("keydown",e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(!$("curtain").hidden&&e.code==="Tab"){
    const all=[...$("panel").querySelectorAll('button:not(:disabled), [tabindex="0"]')], first=all[0], last=all.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
  }
  if(e.code==="Escape"&&!e.repeat){
    if(state==="relic-inventory"){closeRelicInventory();return}
    if(state==="fight")pause();else if(state==="pause")resume();else if(state==="map-preview")closeFloorMap();else if(state==="cache")closeCache();else if(state==="weapon")closeWeaponLoot();else if(state==="merchant")leaveMerchant();else if(state==="routes"||state==="tribute")closeOptionalChoice();else if(state==="home")closeModal();return;
  }
  if(e.code==="KeyI"&&!e.repeat){
    if(state==="relic-inventory")closeRelicInventory();else showRelicInventory();
    return;
  }
  if(e.code==="KeyM"&&!e.repeat){
    if(state==="fight")showFloorMap();else if(state==="map-preview")closeFloorMap();
    return;
  }
  if(!e.repeat&&/^Digit[0-9]$/.test(e.code)&&modalChoices.length){modalChoices[(Number(e.code.slice(-1))||10)-1]?.();return}
  if(state!=="fight")return;
  if(scrollLockKeys.includes(e.code))e.preventDefault();
  keys.add(e.code);
  if(e.code==="KeyJ"&&!e.repeat){lastAction="keyboard";actions.add("attack")}
  if(!e.repeat){
    if(e.code==="Space")actions.add("dash");
    if(e.code==="KeyE")actions.add("skill");
    if(e.code==="KeyQ")actions.add("ult");
    if(e.code==="KeyR")actions.add("weapon");
    if(e.code==="KeyT")actions.add("switch");
    if(e.code==="KeyF")interact();
  }
});
window.addEventListener("keyup",e=>keys.delete(e.code));
window.addEventListener("blur",()=>{if(state==="fight")pause();else resetInput()});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&state==="fight")pause()});
window.addEventListener("resize",resize);
window.addEventListener("orientationchange",resetInput);
$("start").onclick=startFromMenu;$("guide").onclick=showGuide;$("records").onclick=records;$("sound").onclick=toggleSound;$("pause").onclick=pause;
$("mapButton").onclick=()=>{if(state==="fight")showFloorMap()};
$("relicButton").onclick=showRelicInventory;
$("interact").onclick=interact;
for(let i=0;i<30;i++){
  const m=document.createElement("i");m.className="ember";m.style.cssText=`--x:${between(0,100)}%;--r:${between(1,3)}px;--dx:${between(-70,55)}px;--time:${between(5,12)}s;--delay:${between(-12,0)}s`;$("embers").append(m);
}

function loop(ms){
  const dt=last?clamp((ms-last)/1000,0,.033):0;last=ms;
  if(state==="fight"){
    visualTime=(visualTime+dt)%86400;stepEffects(dt);
    if(hitStop>0)hitStop-=dt;else tick(dt);
    hudTime-=dt;if(hudTime<=0){hudTime=.078;drawHud()}
    draw();
  }else if(state==="descend"){
    descent.time-=dt;
    if(descent.time<=0){const {path}=descent;descent=null;stage++;enter(path)}
    draw();
  }
  requestAnimationFrame(loop);
}
syncTouchLayout();resize();syncSound();updateBest();loadSpriteAtlas();requestAnimationFrame(loop);
