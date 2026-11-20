"use strict";

const COMBAT_SAMPLE_RATE=24000;
const voice=(wave,from,to,end,gain,delay=0)=>({wave,from,to,end,gain,delay});
const texture=(from,to,end,gain,delay=0)=>voice("noise",from,to,end,gain,delay);
const thump=(from,to,end,gain,delay=0)=>voice("body",from,to,end,gain,delay);
const chime=(from,to,end,gain,delay=0)=>voice("metal",from,to,end,gain,delay);
const combatSounds={
  starter:[texture(960,3700,.065,.36),chime(1760,1190,.088,.21),thump(153,60,.10,.32)],
  glaive:[texture(1650,5550,.082,.37),chime(2360,1960,.15,.30),thump(135,46,.19,.46),chime(940,885,.13,.10,.014)],
  spear:[texture(2900,7500,.042,.29),voice("reed",1100,470,.060,.30),chime(3650,3220,.075,.17,.011),thump(230,97,.079,.25)],
  sickle:[texture(930,5000,.10,.30),chime(2040,1250,.095,.21),chime(1650,1790,.12,.19,.024),thump(192,88,.088,.29)],
  bow:[texture(2240,8050,.054,.41),voice("pluck",860,115,.10,.29),voice("pluck",1860,990,.08,.16,.011),thump(206,96,.088,.27)],
  hammer:[texture(570,3890,.10,.48),thump(180,41,.21,.61),chime(1280,864,.125,.20),texture(1770,4540,.053,.27,.039)],
  daggers:[texture(3970,9220,.036,.43),chime(3310,2140,.061,.24),texture(2300,6700,.035,.28,.014),thump(242,127,.064,.23)],
  gauntlets:[texture(790,3800,.048,.29),voice("spark",820,420,.09,.35),thump(212,56,.113,.46),voice("spark",2180,1070,.065,.19,.014)],
  shield:[texture(1360,5660,.069,.31),chime(1240,989,.115,.34),chime(3270,2580,.073,.18),thump(175,69,.145,.43)],
  prism:[texture(3700,9600,.051,.35),chime(3050,2960,.145,.26),chime(4350,4040,.085,.21,.015),thump(350,191,.078,.21)],
  bellstaff:[texture(1870,4640,.039,.25),chime(657,635,.25,.37),chime(1510,1465,.185,.27,.012),thump(215,92,.13,.24)],

  glaiveR:[texture(1420,6720,.09,.45),chime(2190,1160,.19,.36),thump(152,44,.24,.50),texture(2170,5480,.065,.20,.036),chime(1280,720,.18,.17,.049)],
  spearR:[texture(3600,9300,.064,.36),voice("reed",1660,540,.12,.33),chime(4160,2710,.15,.30,.017),thump(260,100,.12,.36)],
  sickleR:[texture(950,5960,.11,.38),chime(2380,1480,.12,.30),voice("reed",444,150,.20,.27),chime(1650,1070,.13,.23,.037),texture(790,4240,.067,.23,.065)],
  bowR:[texture(2170,8850,.079,.51),voice("pluck",1190,145,.14,.33),thump(228,72,.15,.41),chime(2570,1720,.095,.21,.018)],
  hammerR:[texture(530,4160,.15,.48),thump(194,58,.28,.64),texture(1500,3750,.12,.26,.047),chime(978,580,.19,.26,.014),thump(242,86,.18,.39,.037),thump(126,42,.24,.27,.085)],
  daggersR:[texture(3400,9540,.064,.47),chime(3200,2000,.095,.31),texture(3900,8900,.054,.32,.023),voice("reed",1270,330,.12,.29,.030),thump(275,107,.11,.23)],
  gauntletsR:[texture(1460,7250,.105,.36),voice("spark",2150,470,.12,.36),thump(205,46,.18,.48),voice("spark",1030,2180,.13,.24,.031),voice("spark",2900,1200,.076,.19,.064)],
  shieldR:[texture(1160,4890,.069,.35),chime(1350,1070,.14,.40),thump(170,65,.15,.41),chime(2480,2190,.13,.22,.019)],
  prismR:[texture(3600,9920,.084,.41),chime(2450,2300,.19,.36),chime(3420,3210,.19,.29,.032),chime(4650,4260,.13,.21,.057),thump(312,108,.17,.40)],
  bellstaffR:[texture(2510,6430,.055,.29),chime(524,506,.38,.38),chime(786,766,.29,.34,.016),chime(1180,1140,.25,.20,.054),thump(163,69,.18,.32)],

  shieldCounter:[texture(1680,6840,.095,.49),chime(1660,1450,.22,.39),chime(2910,2550,.19,.27,.017),thump(155,41,.25,.55)],
  emberImpact:[texture(1850,7900,.075,.40),voice("spark",1040,430,.11,.32),thump(250,84,.14,.40),texture(2660,6140,.052,.17,.025)],
  emberBurst:[texture(1380,5970,.12,.33),thump(204,58,.14,.29),voice("spark",1470,990,.095,.17,.016)],
  bellCast:[chime(318,309,.52,.32),chime(910,885,.40,.21,.011),chime(1710,1655,.33,.14,.039),thump(146,67,.19,.30)],
  bellImpact:[texture(860,4500,.13,.42),thump(178,42,.32,.56),chime(485,453,.39,.34),chime(1320,1280,.25,.26,.017),chime(2490,2210,.17,.13,.035)],
  dashImpact:[texture(2750,7910,.064,.41),voice("reed",1430,350,.095,.29),chime(2040,1740,.074,.17),thump(245,76,.11,.28)],
  crowdImpact:[thump(154,63,.16,.52),texture(240,2650,.09,.42),texture(720,3350,.067,.28,.022)],

  deathHound:[texture(730,3150,.092,.38),voice("reed",635,156,.17,.47,.009),thump(228,89,.14,.35),texture(510,2250,.072,.27,.059)],
  deathArcher:[texture(2840,9220,.078,.38),chime(3400,3150,.13,.37,.008),chime(2260,2010,.18,.25,.046),texture(910,4150,.22,.30,.059),thump(309,157,.12,.22)],
  deathBrute:[texture(320,2860,.19,.46),thump(184,48,.28,.61),texture(520,2270,.11,.33,.063),thump(238,70,.18,.33,.076),texture(850,2330,.10,.21,.13)],
  deathEye:[voice("spark",830,2460,.12,.43),chime(2410,960,.20,.31,.073),texture(1640,7060,.14,.43,.090),thump(331,91,.19,.48,.083),texture(1110,4740,.12,.22,.126)],
  deathWarden:[texture(1180,6120,.12,.44),chime(1470,1130,.30,.35,.016),thump(182,49,.43,.62,.033),
    chime(845,758,.45,.32,.14),texture(405,2750,.28,.34,.18),thump(148,42,.38,.49,.23),chime(496,390,.51,.24,.32)],
  deathBell:[chime(283,256,.89,.50),chime(910,839,.78,.32,.035),thump(163,47,.47,.56,.061),
    texture(480,5940,.26,.41,.082),chime(648,502,.70,.39,.20),thump(140,36,.56,.41,.26),texture(510,3270,.63,.28,.32),chime(345,291,.82,.20,.46)],
  deathSentinel:[chime(1280,1160,.22,.43),texture(1200,6420,.095,.46,.019),thump(282,91,.19,.38,.041),chime(735,716,.17,.22,.072)]
};
const deathCues={
  hound:{cue:"deathHound",delay:.024}, archer:{cue:"deathArcher",delay:.038},
  brute:{cue:"deathBrute",delay:.052}, eye:{cue:"deathEye",delay:.066},
  warden:{cue:"deathWarden",delay:.045,gain:1.17,clearDelay:.66},
  bell:{cue:"deathBell",delay:.045,gain:1.30,clearDelay:.94},
  sentinel:{cue:"deathSentinel",delay:.035}
};
const recentDeaths=new Map();
const impactBuffers=new Map();
const IMPACT_VOICES=10;
let combatBus, impactVoices=0, impactVariation=0, bossDeathAudioUntil=0;
const combatScriptUrl=typeof document!=="undefined"?document.currentScript?.src:"";
const combatWorkerSource="";
const pendingImpacts=new Map();
let soundWorker, soundWorkerFailed=false;

function renderCombatImpact(cue,step=0,perfect=false){
  const recipe=combatSounds[cue];
  const mass=recipe.find(layer=>layer.wave==="body");
  const layers=recipe.map(layer=>layer.wave==="body"?{
    ...layer,
    end:layer.end*(step===2?1.20:1.09),
    gain:layer.gain*(step===2?1.56:1.25)
  }:layer);
  if(step===1)layers.push(chime(3200,2450,.068,.16,.016));
  if(step===2){
    layers.push(thump(mass.from*1.25,Math.max(50,mass.to*.83),.15,mass.gain*.69,.017));
    layers.push(texture(mass.from*1.6,2500,.067,.27,.008),texture(2570,7020,.05,.21,.016));
  }
  if(perfect)layers.push(thump(mass.from*1.4,mass.from*.62,.094,.20,.011),chime(2640,2510,.13,.22,.012),chime(3960,3800,.12,.10,.030));
  const rate=COMBAT_SAMPLE_RATE, length=Math.ceil(rate*Math.max(...layers.map(v=>v.delay+v.end)));
  const data=new Float32Array(length), pitch=[1,1.10,.91][step];
  let random=0x812ff549;
  for(const layer of layers){
    const offset=Math.round(layer.delay*rate), count=Math.floor(layer.end*rate);
    const {wave,from,to,gain}=layer;
    const body=wave==="body", sweep=Math.pow(to/from,1/count);
    const lowMix=1-Math.exp(-2*Math.PI*from*pitch/rate), highMix=1-Math.exp(-2*Math.PI*to*pitch/rate);
    let frequency=from*pitch, phase=0, low=0, band=0, previous=0;
    for(let i=0;i<count;i++){
      const progress=i/count;
      const attack=Math.min(1,i/(rate*(body?.0024:.0013))), tail=Math.min(1,(count-i)/(rate*(body?.018:.004)));
      const envelope=attack*tail*Math.exp(-(body?3.7:6)*progress);
      let sample;
      if(wave==="noise"){
        random=(Math.imul(random,1664525)+1013904223)>>>0;
        const white=random/2147483648-1;
        low+=lowMix*(white-low);band+=highMix*(white-low-band);
        sample=band*2;
      }else{
        const fundamental=Math.sin(phase);
        if(body)sample=fundamental*.59+Math.sin(phase*2)*.25+Math.sin(phase*3)*.13+Math.sin(phase*4)*.085;
        else if(wave==="metal")sample=fundamental*.62+Math.sin(phase*2.76)*.27+Math.sin(phase*4.07)*.11;
        else if(wave==="reed")sample=fundamental*.69+Math.sin(phase*3)*.21+Math.sin(phase*5)*.10;
        else if(wave==="pluck")sample=fundamental*.66+Math.sin(phase*2)*.23+Math.sin(phase*3.06)*.11;
        else if(wave==="spark")sample=Math.sin(phase+1.1*Math.sin(phase*2.3))*(.79+.21*Math.sin(i*.16));
        else sample=fundamental;
        phase+=2*Math.PI*frequency/rate;frequency*=sweep;
      }
      const clean=sample-previous;previous=sample;
      data[offset+i]+=gain*envelope*(wave==="noise"?sample:sample*.88+clean*.12);
    }
  }
  let peak=0;
  for(const sample of data)peak=Math.max(peak,Math.abs(sample));
  const scale=.93/Math.max(.50,peak);
  for(let i=0;i<data.length;i++)data[i]=Math.tanh(data[i]*scale*1.15);
  return data;
}

if(typeof document==="undefined"&&typeof self!=="undefined"){
  self.onmessage=({data:{cue,step,perfect,key}})=>{
    const pcm=renderCombatImpact(cue,step,perfect);
    self.postMessage({key,pcm},[pcm.buffer]);
  };
}

function storeImpactBuffer(key,data){
  const buffer=audio.createBuffer(1,data.length,COMBAT_SAMPLE_RATE);
  buffer.getChannelData(0).set(data);
  impactBuffers.set(key,buffer);
  return buffer;
}
function getSoundWorker(){
  if(!touchUI||soundWorkerFailed||typeof Worker==="undefined")return null;
  if(soundWorker)return soundWorker;
  let blobUrl;
  const releaseUrl=()=>{if(blobUrl){URL.revokeObjectURL(blobUrl);blobUrl=null}};
  try{
    if(!combatScriptUrl&&!combatWorkerSource)return null;
    if(!combatScriptUrl)blobUrl=URL.createObjectURL(new Blob([combatWorkerSource],{type:"text/javascript"}));
    soundWorker=new Worker(combatScriptUrl||blobUrl);
    soundWorker.onmessage=({data:{key,pcm}})=>{
      releaseUrl();
      const pending=pendingImpacts.get(key);
      pendingImpacts.delete(key);
      if(!pending||!audio)return;
      storeImpactBuffer(key,pcm);
      const play=pending.play;
      if(play&&play.owner===player&&Date.now()-play.at<=240&&!document.hidden){
        const [cue,step,perfect,gain,pan,rate,delay,priority]=play.args;
        playCombatCue(cue,step,perfect,gain,pan,rate,Math.max(0,delay-(audio.currentTime-play.audioTime)),priority);
      }
    };
    soundWorker.onerror=()=>{
      releaseUrl();soundWorker.terminate();soundWorker=null;soundWorkerFailed=true;
      pendingImpacts.clear();
    };
  }catch{
    releaseUrl();soundWorkerFailed=true;
  }
  return soundWorker;
}
function queueImpactBuffer(cue,step=0,perfect=false,play=null){
  const key=cue+":"+step+":"+Number(perfect);
  if(impactBuffers.has(key))return false;
  const worker=getSoundWorker();
  if(!worker)return false;
  const pending=pendingImpacts.get(key);
  if(pending){if(!pending.play)pending.play=play}
  else{
    pendingImpacts.set(key,{play});
    worker.postMessage({cue,step,perfect,key});
  }
  return true;
}
function warmCombatAudio(level){
  if(!touchUI||!audio||save.muted)return;
  if(level===0){
    for(let step=0;step<3;step++){
      queueImpactBuffer("starter",step);
      queueImpactBuffer("starter",step,true);
    }
    for(const cue of ["emberImpact","deathHound","deathArcher","deathBrute","deathEye"])queueImpactBuffer(cue);
  }else if(level===3||level===6){
    queueImpactBuffer(level===3?"deathWarden":"deathBell");
    queueImpactBuffer("deathSentinel");
  }
}

function prepareCombatAudio(){
  if(combatBus)return;
  combatBus=audio.createDynamicsCompressor();
  combatBus.threshold.value=-7;combatBus.knee.value=9;combatBus.ratio.value=4;
  combatBus.attack.value=.002;combatBus.release.value=.075;
  combatBus.connect(audioOut);
}

function playCombatCue(cue,step=0,perfect=false,gain=.73,pan=0,rate=1,delay=0,bossPriority=false){
  const maxVoices=IMPACT_VOICES+(bossPriority?2:0);
  if(save.muted||!audio||audio.state!=="running"||impactVoices>=maxVoices)return false;
  const key=cue+":"+step+":"+Number(perfect);
  let buffer=impactBuffers.get(key);
  if(!buffer){
    if(touchUI&&queueImpactBuffer(cue,step,perfect,{
      args:[cue,step,perfect,gain,pan,rate,delay,bossPriority],owner:player,at:Date.now(),audioTime:audio.currentTime
    }))return true;
    buffer=storeImpactBuffer(key,renderCombatImpact(cue,step,perfect));
  }
  prepareCombatAudio();
  const source=audio.createBufferSource(), volume=audio.createGain();
  source.buffer=buffer;
  source.playbackRate.value=rate*[1,.985,1.013,.972,1.025][impactVariation++%5];
  volume.gain.value=gain;source.connect(volume);
  const panner=audio.createStereoPanner?.();
  if(panner){panner.pan.value=pan;volume.connect(panner);panner.connect(combatBus)}
  else volume.connect(combatBus);
  impactVoices++;
  source.onended=()=>{impactVoices--;source.disconnect();volume.disconnect();panner?.disconnect()};
  source.start(audio.currentTime+delay);
  return true;
}

function makeImpact(cue,step=0,perfect=false,limit=3){
  return {cue,step,perfect,limit,played:0,last:-Infinity,clusterStart:-Infinity,clusterTargets:new Set(),crowdPlayed:false};
}
function playImpact(impact,target,shift=0){
  if(!impact||!audio||save.muted||audio.state!=="running")return;
  const now=audio.currentTime;
  const pan=clamp((target.x-player.x)/Math.max(200,W*.64),-.42,.42);
  const pitch=(target.boss?.92:1)*(1+shift);
  if(impact.played<impact.limit&&now-impact.last>=.055){
    const count=impact.played++;
    impact.last=now;
    const skill=impact.cue.endsWith("R")||impact.cue==="bellImpact"||impact.cue==="shieldCounter";
    const weight=skill?1.19:[.96,1.03,1.16][impact.step];
    playCombatCue(impact.cue,impact.step,impact.perfect&&!count,count?.50:weight,pan,pitch);
  }
  if(!impact.crowdPlayed){
    if(now-impact.clusterStart>.056){impact.clusterStart=now;impact.clusterTargets.clear()}
    impact.clusterTargets.add(target);
    if(impact.clusterTargets.size===3){
      impact.crowdPlayed=true;
      playCombatCue("crowdImpact",0,false,.47,pan*.6,pitch,.022);
    }
  }
}

function playDeathSound(enemy){
  if(!audio||save.muted||audio.state!=="running")return;
  const now=audio.currentTime, {cue,delay,gain,clearDelay}=deathCues[enemy.id];
  if(enemy.boss){
    if(playCombatCue(cue,0,false,gain,0,1,delay,true))bossDeathAudioUntil=now+clearDelay;
    return;
  }
  if(now-(recentDeaths.get(enemy.id)??-Infinity)<.075)return;
  const pan=clamp((enemy.x-player.x)/Math.max(200,W*.64),-.38,.38);
  if(playCombatCue(cue,0,false,enemy.elite?.76:.61,pan,enemy.elite?.90:1,delay))recentDeaths.set(enemy.id,now);
}
