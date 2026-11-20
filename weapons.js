"use strict";

const J=(name,shape,damage,reach,cycle,wind,extra={})=>({name,shape,damage,reach,cycle,wind,...extra});
const SHIELD_GUARD={time:.95,angle:1.42,bash:42,counter:86,falloff:.50};
const BOW_VOLLEY={damage:144,side:62,falloff:.54,spread:.18,stagger:.9};
const DAGGER_LUNGE_DAMAGE=106, GAUNTLET_JUMP_SCALE=.55, GAUNTLET_SKILL_DAMAGE=96;
const weaponBook={
  glaive:{name:"日蚀大剑",icon:"⚔",color:"#ffc079",role:"宽面压制 · 慢出手",basic:"两挥一圈。每段打中 1／2–3／第 4 个起的目标时，分别造成 100%／66%／36% 伤害。",moves:[J("开锋","arc",42,145,.50,.13,{arc:1.17,falloff:.66,crowdFalloff:.36}),J("反斩","arc",44,153,.53,.16,{arc:1.38,falloff:.66,crowdFalloff:.36}),J("日轮","area",52,115,.64,.22,{falloff:.66,crowdFalloff:.36})],skill:"断日",cd:9.5,detail:"两道重斩分别造成 58 和 40 点，第二斩延迟 0.38 秒。每斩沿用普攻的群伤递减。"},
  spear:{name:"白霜枪",icon:"➶",color:"#afedff",role:"长线穿刺 · 走廊压制",basic:"前两刺可命中两个目标。第三刺更宽，可命中四个并减速。额外目标承受 80% 伤害。",moves:[J("探锋","line",28,198,.34,.07,{width:14,limit:2,falloff:.8}),J("穿骨","line",33,211,.39,.09,{width:19,limit:2,falloff:.8}),J("霜贯","line",45,244,.53,.14,{width:23,limit:4,falloff:.8,slow:.9})],skill:"霜脊",cd:9.5,detail:"向前打出 430 距离的冰脊，至多击中四个敌人。首个受 96 点伤害，其余受 70%，均减速 2 秒。"},
  sickle:{name:"墓藤链镰",icon:"☾",color:"#bbeb91",role:"回旋牵引 · 需要站位",basic:"镰刃较宽。去程穿透时，后续目标受 72% 伤害，回程为 40%。第三抛更远，可多切中一个目标。",moves:[J("左掷","bolt",27,268,.46,.09,{offset:-.10,back:.4,size:17,limit:2,falloff:.72}),J("右掷","bolt",29,279,.49,.10,{offset:.10,back:.4,size:17,limit:2,falloff:.72}),J("回割","bolt",35,320,.61,.13,{back:.4,size:21,limit:3,falloff:.72})],skill:"收魂索",cd:10,detail:"扫过扇区，普通怪被拉近最多 115 距离。第一个目标受 78 点伤害，第 2–3 个承受 72%，第 4 个起承受 38%。"},
  bow:{name:"骨羽长弓",icon:"⌁",color:"#f8dfb9",role:"远程点杀 · 一线穿透",basic:"第二箭最多打两个目标，第二个承受 58%。第三箭最多打三个，后两个分别承受 62% 和 38%。",moves:[J("轻羽","bolt",36,470,.40,.08,{size:6,speed:980,limit:1}),J("连弦","bolt",41,490,.43,.09,{size:7,speed:1020,limit:2,falloff:.58}),J("贯星矢","bolt",58,535,.57,.16,{size:8,speed:1150,limit:3,pierce:[1,.62,.38]})],skill:"钉影",cd:9.5,detail:`重箭前两个目标分别受 ${BOW_VOLLEY.damage}、${Math.round(BOW_VOLLEY.damage*BOW_VOLLEY.falloff)} 点伤害。两侧各一支 ${BOW_VOLLEY.side} 点的箭。每个敌人最多中一箭，重箭打断首个命中的普通怪。`},
  hammer:{name:"炉心锤",icon:"◆",color:"#ffa778",role:"打断群怪 · 收招较重",basic:"砸击前侧地面。额外目标承受 74%，第 4 个起承受 34%。第三锤范围最大，可打断普通怪。",moves:[J("落砧","slam",43,72,.55,.18,{area:70,falloff:.74,crowdFalloff:.34}),J("裂石","slam",46,86,.58,.20,{area:76,falloff:.74,crowdFalloff:.34}),J("震炉","slam",57,75,.73,.26,{area:97,falloff:.74,crowdFalloff:.34,stagger:.33})],skill:"三重地裂",cd:11,detail:"前方三个震区依次炸开，每区首个目标受 58 点，第 2–3 个承受 75%，第 4 个起承受 38%。同一敌人最多中两次，第二次再乘 45%。"},
  daggers:{name:"黑鸦双匕",icon:"⨯",color:"#e6b8ff",role:"贴身高频 · 穿阵脱身",basic:"左右快割后接范围更宽的追刺。每招小幅前移，额外目标承受 72% 伤害。",moves:[J("左掠","arc",22,71,.24,.045,{arc:.95,step:10,falloff:.72}),J("右掠","arc",23,74,.26,.047,{arc:1.04,step:12,falloff:.72}),J("追喙","line",35,92,.34,.075,{width:32,step:19,falloff:.72})],skill:"鸦影穿身",cd:9,detail:`突进最多 175 距离，0.50 秒内免伤。首个目标受 ${DAGGER_LUNGE_DAMAGE} 点伤害，沿途其余目标承受 68%。`},
  gauntlets:{name:"雷纹拳套",icon:"ϟ",color:"#a6c9ff",role:"近身连锁 · 越打越密",basic:`三拳各打一个主目标，第三拳再向最多三个邻近敌人跳电，每跳 ${Math.round(GAUNTLET_JUMP_SCALE*100)}% 伤害。`,moves:[J("直拳","line",26,72,.27,.05,{width:20,step:14,limit:1}),J("钩拳","arc",29,80,.30,.06,{arc:.90,step:10,limit:1}),J("鸣拳","chain",41,97,.43,.09,{arc:.95,step:10,limit:1,jumps:3,jumpScale:GAUNTLET_JUMP_SCALE})],skill:"奔雷",cd:9.5,detail:`正面首个目标受 ${GAUNTLET_SKILL_DAMAGE} 点伤害，随后向邻近敌人最多跳转四次，每跳 ${GAUNTLET_SKILL_DAMAGE/2} 点。`},
  shield:{name:"铜狮斗盾",icon:"⬟",color:"#ffe094",role:"抗压反击 · 需要看准出手",basic:"两次正面盾撞后以宽盾扫击，第三击可打断普通怪。额外目标承受 65% 伤害。",moves:[J("撞盾","arc",27,89,.33,.08,{arc:.84,step:13,falloff:.65}),J("顶肩","line",32,107,.36,.10,{width:31,step:17,falloff:.65}),J("狮扫","arc",40,111,.47,.12,{arc:1.30,stagger:.28,falloff:.65})],skill:"守门反震",cd:11.5,detail:`先盾击 ${SHIELD_GUARD.bash} 点，再宽角架盾 ${SHIELD_GUARD.time} 秒。挡住正面一次攻击时反震 ${SHIELD_GUARD.counter} 点，并打断普通怪。额外目标承受 50% 伤害。`},
  prism:{name:"折光晶杖",icon:"◇",color:"#a5ffe7",role:"远程溅射 · 连击蓄尾",basic:"晶弹命中后，最多溅射三个邻近目标，各承受 38% 伤害。第三弹爆区更大。",moves:[J("碎晶","bolt",25,364,.37,.08,{size:8,speed:760,limit:1,splash:53}),J("冷辉","bolt",28,382,.40,.09,{size:9,speed:770,limit:1,splash:57}),J("折射","bolt",43,402,.53,.15,{size:11,speed:725,limit:1,splash:77})],skill:"棱光三棱",cd:10,detail:"在瞄准位置及两侧布下三处延迟爆光，每处首个目标受 66 点，第 2–3 个承受 68%，第 4 个起承受 40%。同一敌人最多中两次，第二次再乘 35%。"},
  bellstaff:{name:"缚灵手钟",icon:"♜",color:"#d2b3f7",role:"环状控场 · 需要调位",basic:"三段都是环形。额外目标承受 68%，第 4 个起承受 29%。第三圈打到内圈时再乘 66%。",moves:[J("轻鸣","area",25,94,.34,.07,{falloff:.68,crowdFalloff:.29}),J("回鸣","area",31,120,.40,.11,{falloff:.68,crowdFalloff:.29}),J("远鸣","area",52,193,.57,.18,{inner:72,falloff:.68,crowdFalloff:.29})],skill:"葬歌",cd:11.5,detail:"连响四次，每次 23 点。额外目标承受 70%，第 4 个起承受 38%，命中均刷新减速。"}
};
const weaponIds=Object.keys(weaponBook);
const activeWeapon=()=>weaponBook[player.weapons[player.weaponSlot]];
const DROP_CHANCE=.05;
const ARMORY_OFFER_COUNT=3;
let weaponBolts=[], weaponFields=[], weaponTraces=[];

function weaponAttack(mouse,perfect){
  const p=player, weapon=activeWeapon(), move=weapon.moves[p.combo];
  p.a=aim(mouse,move.reach*p.reach+30,p.moving);
  p.attackTotal=move.cycle*p.haste;p.attack=p.attackTotal;
  p.comboSpan=p.comboT=Math.max(.68,p.attackTotal+.135);
  p.pending={move,weapon,a:p.a,perfect,at:p.attack-move.wind*p.haste};
}
function weaponHit(cast,e,damage,a,force=.58){
  if(e.hp<=0)return;
  const first=!cast.hits.has(e), count=cast.hits.get(e)??0;
  cast.hits.set(e,count+1);
  const sameEdge=dashEdgeReady(player)&&cast.edge===player.edgeSerial;
  const addEdge=first&&cast.edgeHits<2&&(cast.edgeHits>0||sameEdge);
  if(addEdge){if(!cast.edgeHits)triggerDashEdge(player);cast.edgeHits++}
  const charge=first&&cast.charged<2;
  if(charge)cast.charged++;
  hurt(e,damage+(addEdge?cast.edgeDamage:0),a,force,false,charge);
  playImpact(cast.impact,e);
  if(first&&cast.basic&&cast.burned<CINDER.targets&&ignite(e))cast.burned++;
  if(first&&cast.perfect&&!cast.perfectPaid){
    ash(1+player.perfectAsh);cast.perfectPaid=true;
    label(player.x,player.y-46,"完美接招","#ffe2a4");
  }
}
function makeWeaponCast(weapon,basic=false,perfect=false,impact=null){
  return {color:weapon.color,hits:new Map(),charged:0,basic,burned:0,perfect,edge:basic&&player.edge>0?player.edgeSerial:null,
    edgeDamage:DASH_EDGE.damage*player.dashEdge,edgeHits:0,impact};
}
function traceWeapon(origin,a,shape,r,color,extra={}){
  weaponTraces.push({x:origin.x,y:origin.y,a,shape,r,color,time:.28,max:.28,...extra});
}
function weaponTargets(origin,a,move){
  const result=[];
  for(const e of foes){
    if(e.hp<=0)continue;
    const d=dist(origin,e), delta=turn(angle(origin,e)-a);
    if(d>move.reach+e.r||!floorSight(floor,origin,e))continue;
    if(move.shape==="line"&&(Math.cos(delta)*d< -e.r*.35||Math.abs(Math.sin(delta)*d)>move.width+e.r*.7))continue;
    if((move.shape==="arc"||move.shape==="chain")&&Math.abs(delta)>move.arc+Math.min(.25,e.r/Math.max(1,d)))continue;
    result.push(e);
  }
  return result.sort((a,b)=>dist(origin,a)-dist(origin,b)).slice(0,move.limit);
}
function staggerWeapon(e,time){
  if(time&&!e.boss&&e.hp>0){e.stun=Math.max(e.stun,time);e.tell=0;e.cd=Math.max(e.cd,time+.13)}
}
function weaponFalloff(move,index){
  if(index===0)return 1;
  return (index>=3?move.crowdFalloff:undefined)??move.falloff??1;
}
function weaponStrike(origin,a,move,damage,cast){
  const targets=weaponTargets(origin,a,move);
  for(const [i,e] of targets.entries()){
    const inner=move.inner&&dist(origin,e)<move.inner?.66:1;
    weaponHit(cast,e,damage*inner*weaponFalloff(move,i),angle(origin,e));
    staggerWeapon(e,move.stagger);
    if(move.slow)e.slow=Math.max(e.slow??0,move.slow);
    if(move.pull&&!e.boss){const pull=Math.min(move.pull,Math.max(0,dist(e,origin)-46));walkBody(floor,e,Math.cos(angle(e,origin))*pull,Math.sin(angle(e,origin))*pull)}
  }
  if(move.shape==="chain"&&targets.length){
    const jumpDamage=damage*(move.jumpScale??.5);
    let from=targets[0];
    for(let i=0;i<move.jumps;i++){
      const next=weaponTargets(from,a,{shape:"area",reach:108}).find(e=>!cast.hits.has(e));
      if(!next)break;
      traceWeapon(from,angle(from,next),"lightning",dist(from,next),cast.color);
      weaponHit(cast,next,jumpDamage,angle(from,next),.2);from=next;
    }
  }
  traceWeapon(origin,a,move.shape,move.reach,cast.color,{arc:move.arc,width:move.width});
  return targets.length;
}
function launchWeapon(origin,a,move,damage,cast,id){
  const start=range(origin.x,origin.y,a,8);
  if(!standOn(floor,start.x,start.y))return;
  weaponBolts.push({...start,a,home:{x:start.x,y:start.y},move,damage,cast,id,left:move.reach,hit:new Set(),back:false});
}
function resolveWeapon({weapon,move,a,perfect}){
  const p=player, id=p.weapons[p.weaponSlot], finisher=p.combo===2;
  const cast=makeWeaponCast(weapon,true,perfect,makeImpact(id,p.combo,perfect));
  const damage=move.damage*p.power*(finisher?p.finisherPower:1)*(perfect?perfectAttackScale(p,finisher):1);
  const reach=move.reach*p.reach;
  if(move.step)walkBody(floor,p,Math.cos(a)*move.step,Math.sin(a)*move.step);
  if(move.shape==="bolt"){
    launchWeapon(p,a+(move.offset??0),{...move,reach},damage,cast,id);
    tone(420,190,.12,.09,"triangle");return;
  }
  let origin=p, shape=move.shape;
  if(shape==="slam"){origin=weaponGround(p,a,reach);shape="area"}
  const count=weaponStrike(origin,a,{...move,shape,reach:move.area?move.area*p.reach:reach},damage,cast);
  if(count){shake=move.cycle>.5?5:2;hitStop=move.cycle>.5?.033:.014}
  else tone(270,65,.12,.08,"triangle");
}
function weaponGround(origin,a,length,radius=4){
  let end={x:origin.x,y:origin.y};
  const steps=Math.max(1,Math.ceil(length/8));
  for(let i=1;i<=steps;i++){
    const next=range(origin.x,origin.y,a,length*i/steps);
    if(!standOn(floor,next.x,next.y,radius))break;
    end=next;
  }
  return end;
}
function moveWeaponBolts(dt){
  for(const bolt of weaponBolts){
    const {move,cast}=bolt, dx=Math.cos(bolt.a),dy=Math.sin(bolt.a);
    const distance=Math.min(bolt.left,(move.speed??680)*dt), end=weaponGround(bolt,bolt.a,distance);
    let travel=dist(bolt,end);
    if(travel>distance-.01)travel=distance;
    const hits=[];
    for(const e of foes){
      if(e.hp<=0||bolt.hit.has(e)||(move.oncePerVolley&&cast.hits.has(e)))continue;
      const x=e.x-bolt.x,y=e.y-bolt.y,along=x*dx+y*dy,cross=x*dy-y*dx,r=e.r+move.size;
      if(Math.abs(cross)>r)continue;
      const half=Math.sqrt(r*r-cross*cross);
      if(along-half<=travel&&along+half>=0&&floorSight(floor,bolt,e))hits.push({e,at:Math.max(0,along-half)});
    }
    hits.sort((a,b)=>a.at-b.at);
    let stopped=false;
    for(const {e,at} of hits){
      bolt.hit.add(e);
      const index=bolt.hit.size-1;
      const scale=bolt.back?move.back:move.pierce?.[index]??(index?move.falloff??.78:1);
      weaponHit(cast,e,bolt.damage*scale,bolt.a,.34);
      if(!index)staggerWeapon(e,move.stagger);
      ring(e.x,e.y,22+move.size,cast.color,.2);
      if(move.splash){
        const nearby=weaponTargets(e,bolt.a,{shape:"area",reach:move.splash}).filter(other=>!cast.hits.has(other));
        for(const other of nearby.slice(0,3))weaponHit(cast,other,bolt.damage*.38,angle(e,other),.16);
      }
      if(bolt.hit.size>=(move.limit??3)){travel=at;stopped=true;break}
    }
    bolt.x+=dx*travel;bolt.y+=dy*travel;bolt.left-=travel;
    if(stopped||travel<distance||bolt.left<.1){
      if(move.back&&!bolt.back&&dist(bolt,bolt.home)>12){bolt.a=angle(bolt,bolt.home);bolt.left=dist(bolt,bolt.home);bolt.hit.clear();bolt.back=true}
      else bolt.left=0;
    }
  }
  weaponBolts=weaponBolts.filter(bolt=>bolt.left>0);
}
function placeWeaponField(origin,a,cast,r,delay,damage,options={}){
  weaponFields.push({x:origin.x,y:origin.y,a,cast,r,delay,damage,...options});
}
function stepWeaponCombat(dt){
  moveWeaponBolts(dt);
  for(const f of weaponFields){
    f.delay-=dt;
    if(f.delay>0||f.done)continue;
    if(f.arc){weaponStrike(f,f.a,{shape:"arc",reach:f.r,arc:f.arc,falloff:f.falloff,crowdFalloff:f.crowdFalloff},f.damage,f.cast)}
    else{
      let struck=0;
      for(const e of weaponTargets(f,f.a,{shape:"area",reach:f.r})){
        const hits=f.cast.hits.get(e)??0;
        if(hits>=(f.limit??4))continue;
        weaponHit(f.cast,e,f.damage*weaponFalloff(f,struck++)*(hits?(f.repeat??1):1),angle(f,e),.24);
        if(f.slow)e.slow=Math.max(e.slow??0,f.slow);
      }
      traceWeapon(f,f.a,"area",f.r,f.cast.color);
    }
    f.done=true;
  }
  weaponFields=weaponFields.filter(f=>!f.done);
  for(const f of weaponTraces)f.time-=dt;
  weaponTraces=weaponTraces.filter(f=>f.time>0);
}
function castWeapon(mouse,touch=null){
  const p=player, weapon=activeWeapon(), id=p.weapons[p.weaponSlot];
  if(!weapon||p.weaponCd>0||p.dash>0||p.pending)return false;
  const aimRange=id==="bow"?620:id==="prism"?360:460;
  const cast=makeWeaponCast(weapon,false,false,makeImpact(id+"R",0,false,4));
  const a=touch?.angle??(id==="shield"&&!mouse&&!touch?p.a:aim(mouse,aimRange,true));
  p.a=a;p.weaponCd=p.weaponCdTotal=weapon.cd;
  p.attack=p.attackTotal=Math.max(p.attack,.25);p.comboT=0;
  if(p.buffer)p.buffer.perfect=false;
  sparks(p.x,p.y-15,weapon.color,14,166,a);tone(275,690,.23,.13,"triangle");
  switch(id){
    case "glaive":
      weaponStrike(p,a,{shape:"arc",reach:172,arc:1.18,falloff:.66,crowdFalloff:.36},58,cast);
      placeWeaponField(p,a,cast,184,.38,40,{arc:.8,falloff:.66,crowdFalloff:.36});break;
    case "spear":weaponStrike(p,a,{shape:"line",reach:430,width:21,slow:2,limit:4,falloff:.7},96,cast);break;
    case "sickle":weaponStrike(p,a,{shape:"arc",reach:267,arc:1.17,pull:115,falloff:.72,crowdFalloff:.38},78,cast);break;
    case "bow":{
      const volley=BOW_VOLLEY;
      launchWeapon(p,a,{reach:650,size:12,speed:1350,limit:2,falloff:volley.falloff,stagger:volley.stagger,oncePerVolley:true},volley.damage,cast,id);
      for(const side of [-1,1])launchWeapon(p,a+side*volley.spread,{reach:500,size:8,speed:1080,limit:1,oncePerVolley:true},volley.side,cast,id);
      break;
    }
    case "hammer":
      [62,142,226].forEach((length,i)=>placeWeaponField(weaponGround(p,a,length),a,cast,71,.12+i*.18,58,{limit:2,repeat:.45,falloff:.75,crowdFalloff:.38}));break;
    case "daggers":{
      const start={x:p.x,y:p.y};
      const end=weaponGround(p,a,175,p.r);Object.assign(p,end);p.inv=Math.max(p.inv,.50);
      for(let i=1;i<=4;i++){const ghost=range(start.x,start.y,a,dist(start,end)*i/5);fx.push({type:"ghost",...ghost,a,id,life:.24,max:.24})}
      weaponStrike(start,a,{shape:"line",reach:dist(start,p)+12,width:32,falloff:.68},DAGGER_LUNGE_DAMAGE,cast);break;
    }
    case "gauntlets":weaponStrike(p,a,{shape:"chain",reach:143,arc:1.03,limit:1,jumps:4},GAUNTLET_SKILL_DAMAGE,cast);break;
    case "shield":
      weaponStrike(p,a,{shape:"arc",reach:108,arc:.95,falloff:SHIELD_GUARD.falloff},SHIELD_GUARD.bash,cast);
      p.parry=SHIELD_GUARD.time;p.parryAngle=a;ring(p.x,p.y,48,weapon.color,.42);break;
    case "prism":{
      const manual=touch?.angle!=null;
      const target=manual?null:mouse?{x:pointer.x+camera.x,y:pointer.y+camera.y}:aimTarget(aimRange,true);
      const distance=manual?80+175*touch.strength:clamp(target?dist(p,target):170,80,255);
      const center=weaponGround(p,a,distance);
      const spots=[center,...[-1,1].map(side=>weaponGround(center,a+side*PI/2,82))];
      spots.forEach((point,i)=>placeWeaponField(point,a,cast,74,.37+i*.07,66,{limit:2,repeat:.35,falloff:.68,crowdFalloff:.4}));break;
    }
    case "bellstaff":
      for(let i=0;i<4;i++)placeWeaponField(p,a,cast,132,.24+i*.42,23,{slow:.65,falloff:.7,crowdFalloff:.38});break;
  }
  return true;
}
function switchWeapon(){
  if(player.weapons.length<2)return;
  player.weaponSlot=1-player.weaponSlot;
  Object.assign(player,{pending:null,buffer:null,comboT:0,parry:0,weaponInput:0});
  const weapon=activeWeapon();
  label(player.x,player.y-58,weapon.name,weapon.color);sfx("choose");drawHud();
}

function addWeaponArmory({x,y},title,random=Math.random){
  const pool=[...weaponIds];
  for(let i=pool.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  floor.armories.push({x,y,title,pool});
}
function armoryChoices(armory){return armory.pool.filter(id=>!player.weapons.includes(id)).slice(0,ARMORY_OFFER_COUNT)}
function dropWeapon(e,random=Math.random){
  if(e.id==="warden"){addWeaponArmory(e,"铸钟武库",random);return}
  if(e.boss||random()>=DROP_CHANCE)return;
  const id=weaponIds[Math.floor(random()*weaponIds.length)];
  floor.loot.push({x:e.x,y:e.y,id});
  label(e.x,e.y-36,weaponBook[id].name,weaponBook[id].color);
}
function weaponCard(id,index,disabled=false){
  const w=weaponBook[id];
  return `<button class="card armament" style="--metal:${w.color}" data-pick="${index}"${disabled?" disabled":""}><span class="icon" aria-hidden="true">${w.icon}</span><kbd>${index+1}</kbd><b>${w.name}</b><span class="school">${w.role}</span><small><strong>普攻 · ${w.moves.map(move=>move.damage).join(" / ")}</strong> ${w.basic}</small><small><strong>${w.skill} · ${w.cd} 秒</strong> ${w.detail}</small></button>`;
}
function openWeaponLoot(loot){
  state="weapon";resetInput();
  const armory=Boolean(loot.pool), choices=armory?armoryChoices(loot):[loot.id];
  const title=armory?loot.title:"发现 · "+weaponBook[loot.id].name;
  showModal(heading(title,armory?"可任选一把。武库在本层有效。":"拾取后立刻装备。两格都装满时，可选择换下哪一把。")+
    `<div class="choices armory ${armory?"":"one"}">${choices.map((id,i)=>weaponCard(id,i)).join("")}</div>`+row(btn("lootClose","稍后再选")),choices.map(id=>()=>takeWeapon(loot,id)));
  $("lootClose").onclick=closeWeaponLoot;
}
function takeWeapon(loot,id){
  if(player.weapons.includes(id))return;
  if(player.weapons.length===2){
    chooseWeaponSlot(id,"换下的武器留在原地。",slot=>equipWeapon(loot,id,slot),()=>openWeaponLoot(loot));
  }else equipWeapon(loot,id,player.weapons.length);
}
function chooseWeaponSlot(id,note,onPick,onBack){
  showModal(heading("装入哪一格？",`即将装备${weaponBook[id].name}。${note}`)+
    `<div class="choices armory replace">${player.weapons.map((carried,i)=>weaponCard(carried,i)).join("")}</div>`+row(btn("lootBack","返回武器选择")),player.weapons.map((_,i)=>()=>onPick(i)));
  $("lootBack").onclick=onBack;
}
function equipWeapon(loot,id,slot){
  const drops=loot.pool?floor.armories:floor.loot;
  const index=drops.indexOf(loot);
  if(index===-1||player.weapons.includes(id))return;
  drops.splice(index,1);
  equipCarriedWeapon(id,slot,loot);
  closeWeaponLoot();
}
function equipCarriedWeapon(id,slot,{x,y}){
  const old=player.weapons[slot];
  if(old)floor.loot.push({x,y,id:old});
  player.weapons[slot]=id;player.weaponSlot=slot;
  Object.assign(player,{pending:null,buffer:null,comboT:0,parry:0,weaponInput:0});
  label(player.x,player.y-52,"装备 · "+weaponBook[id].name,weaponBook[id].color);sfx("choose");
}
function closeWeaponLoot(){
  state="fight";closeModal();nearby=nearInteraction();drawHud();
}

const weaponModels={
  glaive:{blade:[[6,-7],[42,-11],[67,-7],[83,0],[67,7],[42,11],[6,7]],guard:[[0,-17],[9,-11],[13,0],[9,11],[0,17],[4,0]]},
  spear:{shaft:73,blade:[[59,-4],[70,-12],[89,0],[70,12],[59,5],[69,0]],guard:[[42,0],[54,-7],[62,0],[54,7]]},
  sickle:{shaft:31,blade:[[24,4],[29,-18],[42,-31],[61,-34],[73,-25],[59,-29],[45,-22],[38,-7],[41,7]],guard:[[18,-6],[32,-6],[37,4],[28,10]],chain:true},
  bow:{bow:true},
  hammer:{shaft:47,blade:[[28,-19],[34,-25],[57,-25],[66,-16],[66,16],[57,25],[34,25],[28,19]],guard:[[37,-16],[60,-16],[60,16],[37,16]]},
  daggers:{blade:[[4,-5],[33,-8],[48,-3],[38,4],[14,7],[5,4]],guard:[[-1,-12],[9,-8],[9,8],[-1,12],[2,0]]},
  gauntlets:{blade:[[-12,-8],[-2,-14],[17,-14],[25,-8],[27,7],[17,14],[-4,14],[-12,7]],guard:[[2,0],[11,-11],[21,0],[11,11]]},
  shield:{blade:[[-7,-20],[11,-29],[30,-20],[31,11],[12,29],[-7,11]],guard:[[-3,-12],[12,-22],[25,-12],[24,9],[12,21],[-3,9]]},
  prism:{shaft:51,blade:[[45,0],[60,-17],[75,-11],[84,0],[75,11],[60,17]],guard:[[51,0],[62,-11],[76,0],[62,11]]},
  bellstaff:{shaft:39,blade:[[22,-15],[46,-16],[58,-22],[66,-17],[66,17],[58,22],[46,16],[22,15],[33,10],[33,-10]],guard:[[57,-20],[65,-17],[65,17],[57,20]]}
};
const weaponCanvases=new Map();
function weaponModel(id){
  if(weaponCanvases.has(id))return weaponCanvases.get(id);
  const w=weaponBook[id], shape=weaponModels[id], canvas=document.createElement("canvas");
  canvas.width=210;canvas.height=108;const pen=canvas.getContext("2d");
  pen.translate(37,54);
  const metal=pen.createLinearGradient(0,-27,0,24);
  metal.addColorStop(0,"#fff2c4");metal.addColorStop(.34,w.color);metal.addColorStop(.53,"#4f384b");metal.addColorStop(.74,w.color);metal.addColorStop(1,"#31202a");
  const poly=(points,fill,stroke="#1d1420",width=1.6)=>{
    pen.beginPath();points.forEach(([x,y],i)=>i?pen.lineTo(x,y):pen.moveTo(x,y));pen.closePath();
    pen.fillStyle=fill;pen.fill();pen.strokeStyle=stroke;pen.lineWidth=width;pen.stroke();
  };
  const mark=(x,y,r)=>poly([[x-r,y],[x,y-r],[x+r,y],[x,y+r]],w.color,"#251827",1.2);
  if(shape.bow){
    pen.beginPath();pen.moveTo(-5,-37);pen.bezierCurveTo(24,-31,32,-15,26,0);pen.bezierCurveTo(32,15,24,31,-5,37);
    pen.lineWidth=8;pen.strokeStyle="#2a1a20";pen.stroke();pen.lineWidth=5;pen.strokeStyle=metal;pen.stroke();
    pen.beginPath();pen.moveTo(-6,-36);pen.lineTo(-11,0);pen.lineTo(-6,36);pen.strokeStyle="#f5dfb6";pen.lineWidth=1.4;pen.stroke();
    poly([[13,-3],[37,-3],[43,0],[37,3],[13,3]],metal);mark(25,0,4);
  }else{
    poly([[-25,-4],[shape.shaft??11,-4],[shape.shaft??11,4],[-25,4]],shape.shaft?metal:"#5b352e");
    for(let x=-22;x<4;x+=5)poly([[x,-4],[x+2,-4],[x+6,4],[x+4,4]],"#d7a27c","#3d2831",.6);
    poly(shape.blade,metal,w.color+"ad",1.4);
    poly(shape.guard,id==="shield"?"#48303a":w.color,"#33202d",1.5);
    if(id==="shield"){mark(12,-6,8);poly([[3,0],[21,0],[16,13],[8,13]],metal)}
    else if(id==="hammer"){mark(49,0,10);mark(49,0,4)}
    else if(id==="gauntlets"){for(const x of [6,14,22])mark(x,0,4)}
    else if(id==="bellstaff"){mark(48,0,6);mark(68,0,5)}
    else if(id==="prism"){mark(64,0,8);mark(31,0,4)}
    else mark(6,0,4);
    if(shape.chain){for(let i=0;i<5;i++){pen.beginPath();pen.ellipse(-21-i*2,5+i*4,3.1,5.1,0,0,TAU);pen.lineWidth=1.4;pen.strokeStyle=w.color;pen.stroke()}}
  }
  weaponCanvases.set(id,canvas);return canvas;
}
function paintWeapon(id,x,y,a,size){
  const model=weaponModel(id);
  ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.scale(size,size);
  ctx.drawImage(model,-37,-54);ctx.restore();
}
function equippedHero(p,y,face,tilt){
  const id=p.weapons[p.weaponSlot], w=weaponBook[id], size=77;
  if(!id){sprite(heroFrame,p.x,y,size,face,"#ff9977",tilt);return}
  const base=spriteImage(),[sx,sy,sw,sh]=heroFrame, width=size*sw/sh;
  ctx.save();ctx.translate(p.x,y);ctx.rotate(tilt);ctx.scale(face,1);
  if(base){
    ctx.save();ctx.translate(-width/2,-size*.87);ctx.scale(width/sw,size/sh);
    ctx.beginPath();ctx.rect(0,0,sw,sh);
    ctx.moveTo(0,232);ctx.lineTo(86,211);ctx.lineTo(116,241);ctx.lineTo(77,296);ctx.lineTo(45,389);ctx.lineTo(0,389);ctx.closePath();
    ctx.clip("evenodd");ctx.drawImage(base,sx,sy,sw,sh,0,0,sw,sh);ctx.restore();
  }else drawSpriteSilhouette(heroFrame,size,"#ff9977",true);
  const directional=Math.atan2(Math.sin(p.a)*.55,Math.cos(p.a)*face);
  const moving=p.attack>0?1-p.attack/p.attackTotal:0;
  const sweep=moving?Math.sin(moving*PI)*((id==="glaive"||id==="sickle")?.95:.36):0;
  const pose=p.parry>0?Math.PI:directional-.20+sweep*(p.combo%2===0?1:-1);
  const x=-18-(p.attack>0?8*Math.sin(moving*PI):0), handY=-22;
  if(id==="daggers"||id==="gauntlets")paintWeapon(id,13,handY-5,pose-.54,.52);
  paintWeapon(id,x,handY,pose,p.dash>0?.6:.71);
  if(id!=="shield"&&id!=="gauntlets"){oval(x,handY,5,4,"#372530");oval(x-1,handY-1,3,2,w.color+"b2")}
  ctx.restore();
}
function drawWeaponCombat(){
  for(const bolt of weaponBolts){
    const {x,y,a,id,cast,move}=bolt, tail=range(x,y,a+PI,id==="bow"?51:29);
    line(tail.x,tail.y,x,y,cast.color+"a0",move.size*.58);
    if(id==="sickle")paintWeapon(id,x,y,visualTime*24,.40);
    else if(id==="bow"){
      const tip=range(x,y,a,12),rear=range(x,y,a+PI,25);
      line(rear.x,rear.y,tip.x,tip.y,"#fff2d4",2.3);
      for(const offset of [-.63,.63]){const barb=range(tip.x,tip.y,a+PI+offset,10);line(tip.x,tip.y,barb.x,barb.y,cast.color,2)}
    }
    else{glow(x,y,32,cast.color+"65");circle(x,y,move.size*.62,cast.color,2);oval(x,y,3,3,"#fff3e7")}
  }
  for(const f of weaponFields)if(!f.arc&&f.delay<.48){
    oval(f.x,f.y,f.r,f.r,f.cast.color+"18");circle(f.x,f.y,f.r,f.cast.color+"6f",1.6);
    circle(f.x,f.y,10+f.r*(.48-f.delay),f.cast.color+"a0",1.5);
  }
  for(const f of weaponTraces){
    const opacity=f.time/f.max;
    ctx.save();ctx.globalAlpha=opacity*.86;
    if(f.shape==="line"||f.shape==="lightning"){
      const end=range(f.x,f.y,f.a,f.r), width=f.shape==="line"?f.width*.68:3;
      line(f.x,f.y,end.x,end.y,f.color+"60",width+8);
      line(f.x,f.y,end.x,end.y,f.color,width*.46+2);
      line(f.x,f.y,end.x,end.y,"#fff5e5",1.4);
    }else if(f.shape==="area"){
      oval(f.x,f.y,f.r,f.r,f.color+"34");circle(f.x,f.y,f.r,f.color,2.6);
      circle(f.x,f.y,f.r*(.65+.35*opacity),f.color+"ac",2);
    }else{
      ctx.beginPath();ctx.arc(f.x,f.y,f.r*.83,f.a-(f.arc??1),f.a+(f.arc??1));ctx.strokeStyle=f.color+"66";ctx.lineWidth=18;ctx.stroke();
      ctx.strokeStyle=f.color;ctx.lineWidth=4;ctx.stroke();
      ctx.strokeStyle="#fff5e5";ctx.lineWidth=1.3;ctx.stroke();
    }
    ctx.restore();
  }
}
function drawWeaponDrops(){
  for(const item of floor.loot){
    if(item.x<camera.x-80||item.x>camera.x+W+80||item.y<camera.y-80||item.y>camera.y+H+80)continue;
    const w=weaponBook[item.id], y=item.y+Math.sin(visualTime*3+item.x)*4;
    glow(item.x,y,39,w.color+"53");oval(item.x,item.y+5,19,7,"#09060b99");
    line(item.x,item.y-46,item.x,item.y+5,w.color+"66",2);
    paintWeapon(item.id,item.x-7,y-14,-.65,.37);
  }
  for(const armory of floor.armories){
    const {x,y}=armory, options=armoryChoices(armory);
    glow(x,y,92,"#ffd49572");oval(x,y+12,47,16,"#20101dcc");circle(x,y,44,"#ffcb84",1.6);
    options.forEach((id,i)=>paintWeapon(id,x+(i-1)*32-5,y-26+Math.sin(visualTime*3+i)*4,-.82,.36));
  }
}
