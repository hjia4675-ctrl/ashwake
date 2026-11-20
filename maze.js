"use strict";

const TILE=52, MAZE_COLS=59, MAZE_ROWS=48;
const WORLD_W=MAZE_COLS*TILE, WORLD_H=MAZE_ROWS*TILE;
const BOSS_ROOM_SEAL=3;
const tileIndex=(x,y)=>y*MAZE_COLS+x;
const tileAt=(x,y)=>tileIndex(Math.floor(x/TILE),Math.floor(y/TILE));
const tileDirections=[[-1,0],[1,0],[0,-1],[0,1]];

const roomForms={
  landing:{name:"阶梯前庭",crop:[.13,.25,.71,.58]},
  nave:{name:"多层主殿",crop:[.14,.12,.72,.75]},
  cloister:{name:"四柱回廊",crop:[.26,.3,.48,.58]},
  rift:{name:"断层双桥",crop:[.08,.43,.78,.45]},
  chapel:{name:"偏殿龛室",crop:[.38,.18,.56,.61]},
  switchback:{name:"错台长廊",crop:[.28,.16,.62,.67]},
  basin:{name:"阶环沉庭",crop:[.14,.31,.73,.5]},
  archives:{name:"折角藏库",crop:[.19,.13,.72,.64]},
  gallery:{name:"双翼长厅",crop:[.13,.22,.74,.55]}
};

function roomFeature(form,x,y,w,h,flip){
  const u=x*flip;
  const corner=Math.abs(x)>=w-1&&Math.abs(y)>=h-1;
  if(form==="cloister"&&Math.abs(x)===3&&Math.abs(y)===2)return 1;
  if(form==="rift"&&x===3*flip&&(y===0||Math.abs(y)>=3)&&Math.abs(y)<h)return 2;
  if(form==="archives"&&u===-3&&y>=1&&y<=3)return 1;
  if(form==="switchback"&&Math.abs(x)>=3&&Math.abs(x)<=4&&Math.abs(y)===2&&x*y*flip>0)return 1;
  if(form==="chapel"&&u>=3&&y>=2&&y<=3)return 3;
  if(form==="gallery"&&Math.abs(x)>=4&&Math.abs(y)>=h-1)return 3;
  if(form==="nave"&&Math.abs(x)===4&&Math.abs(y)===2)return 1;
  if(form==="landing"&&corner&&y>0)return 3;
  if(form!=="nave"&&form!=="landing"&&corner)return 3;
  if(form==="archives"&&u>=4&&y<=-2)return 3;
  return 0;
}

function mazeLayout(bossFloor=false){
  const cells=new Uint8Array(MAZE_COLS*MAZE_ROWS), doors=[], entrances=[];
  let bossDoor=null;
  const owners=new Int8Array(cells.length).fill(-1);
  const seals=new Uint8Array(cells.length),features=new Uint8Array(cells.length);
  const seen=new Uint8Array(cells.length);
  const wing=Math.random()<.5?0:2;
  const entrySlot=7, gateSlot=Math.random()<.5?wing:1;
  const neighbors=(a,b)=>Math.abs(a%3-b%3)+Math.abs(Math.floor(a/3)-Math.floor(b/3))===1;
  const shuffle=list=>{
    for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]]}
    return list;
  };
  const slots=[entrySlot,gateSlot,...shuffle([4,3+wing,6+wing])];

  const forms=["landing","nave",...shuffle(["cloister","rift","chapel","switchback","basin","archives","gallery"]).slice(0,3)];
  const mazeRooms=slots.map((slot,i)=>{
    const tx=29+(slot%3-1)*17+(wing===0?8:-8),ty=8+Math.floor(slot/3)*14;
    const form=forms[i], flip=Math.random()<.5?-1:1;
    const halfW=form==="gallery"?7:form==="chapel"?5:6;
    const halfH=form==="gallery"?4:form==="chapel"?4:5;
    const node={slot,tx,ty,form,flip,number:i,x:(tx+.5)*TILE,y:(ty+.5)*TILE,
      left:tx-halfW,right:tx+halfW+1,top:ty-halfH,bottom:ty+halfH+1};
    for(let y=node.top;y<node.bottom;y++)for(let x=node.left;x<node.right;x++){
      const k=tileIndex(x,y), feature=roomFeature(form,x-tx,y-ty,halfW,halfH,flip);
      features[k]=feature;
      if(!feature){cells[k]=2;owners[k]=i}
    }
    return node;
  });
  const regular=mazeRooms.filter(n=>n.number!==1);
  const possibilities=[];
  for(const a of regular)for(const b of regular)if(a.number<b.number&&neighbors(a.slot,b.slot))possibilities.push([a,b]);
  const groups=mazeRooms.map(n=>n.number), paths=[], spare=[];
  for(const [a,b] of shuffle(possibilities)){
    if(groups[a.number]===groups[b.number]){spare.push([a,b]);continue}
    const old=groups[b.number],next=groups[a.number];
    groups.forEach((g,i)=>{if(g===old)groups[i]=next});
    paths.push([a,b,0]);
  }
  if(spare.length){
    const [a,b]=spare[0];paths.push([a,b,2]);
  }
  const gate=mazeRooms[1], connection=shuffle(regular.filter(n=>neighbors(n.slot,gateSlot)))[0];
  paths.push([connection,gate,1]);

  function carve(x,y){
    const k=tileIndex(x,y);
    if(!cells[k]){cells[k]=1;features[k]=0}
  }
  for(const [a,b,lock] of paths){
    const sameRow=a.ty===b.ty;
    const first=(sameRow?a.tx<b.tx:a.ty<b.ty)?a:b, last=first===a?b:a;
    const start=sameRow?first.tx:first.ty, end=sameRow?last.tx:last.ty;
    const cross=sameRow?a.ty:a.tx;
    const offsetA=Math.floor(Math.random()*5)-2,offsetB=Math.floor(Math.random()*5)-2;
    const bend=Math.floor((start+end)/2);
    const edgeA=sameRow?first.right:first.bottom, edgeB=sameRow?last.left:last.top;
    for(const [edge,offset,sign] of [[edgeA,offsetA,1],[edgeB,offsetB,-1]]){
      const center=(cross+offset+.5)*TILE;
      entrances.push({x:sameRow?edge*TILE:center,y:sameRow?center:edge*TILE,a:sameRow?0:Math.PI/2,sign});
    }
    if(lock){
      const center=cross+(offsetA+offsetB)/2;
      doors.push({type:lock,x:((sameRow?bend:center)+.5)*TILE,y:((sameRow?center:bend)+.5)*TILE});
    }
    let bossDoorTile=-1;
    if(bossFloor&&lock===1){
      const inward=last===gate?1:-1;
      const edge=inward===1?edgeB:edgeA;
      const center=cross+(inward===1?offsetB:offsetA);
      bossDoorTile=inward===1?edge-1:edge;
      bossDoor={type:BOSS_ROOM_SEAL,axis:sameRow?"x":"y",boundary:edge*TILE,inward,locked:false,
        x:((sameRow?bossDoorTile:center)+.5)*TILE,y:((sameRow?center:bossDoorTile)+.5)*TILE};
      doors.push(bossDoor);
    }
    for(let along=start;along<=end;along++){
      const from=cross+(along===bend?Math.min(offsetA,offsetB):along<bend?offsetA:offsetB);
      const to=cross+(along===bend?Math.max(offsetA,offsetB):along<bend?offsetA:offsetB);
      const fromRoom=along<bend?along-edgeA:edgeB-1-along;
      const lower=along!==bend&&(fromRoom===0||fromRoom===1)?2:1;
      const upper=along!==bend&&fromRoom===0?2:1;
      for(let normal=from-lower;normal<=to+upper;normal++){
        const x=sameRow?along:normal,y=sameRow?normal:along;
        if(along>=edgeA-1&&along<=edgeB)carve(x,y);
        if(lock&&along===bend)seals[tileIndex(x,y)]=lock;
        if(along===bossDoorTile)seals[tileIndex(x,y)]=BOSS_ROOM_SEAL;
      }
    }
    if(!lock&&Math.abs(offsetA-offsetB)<=2){
      const side=Math.random()<.5?-1:1, turnOffset=cross+offsetA+side*2;
      for(let i=-1;i<=1;i++)for(let j=0;j<=1;j++){
        if(edgeA<=bend+i&&bend+i<edgeB){const n=turnOffset+side*j;carve(sameRow?bend+i:n,sameRow?n:bend+i)}
      }
    }
  }
  return {cells,owners,seals,features,seen,doors,bossDoor,entrances,nodes:mazeRooms,cleared:0,safe:false,hostile:false,rewarded:false,viewTile:-1,field:null};
}

function sealOpen(map,lock){
  if(lock===1)return map.cleared>=map.nodes.length-1;
  if(lock===2)return map.safe;
  return lock!==BOSS_ROOM_SEAL||!map.bossDoor.locked;
}
function openTile(map,tx,ty){
  if(tx<0||tx>=MAZE_COLS||ty<0||ty>=MAZE_ROWS)return false;
  const k=tileIndex(tx,ty);
  return map.cells[k]!==0&&sealOpen(map,map.seals[k]);
}
function standOn(map,x,y,r=0){
  const left=Math.floor((x-r)/TILE),right=Math.floor((x+r)/TILE),top=Math.floor((y-r)/TILE),bottom=Math.floor((y+r)/TILE);
  for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++)if(!openTile(map,col,row))return false;
  return true;
}
function walkBody(map,body,dx,dy){
  if(!dx&&!dy)return;
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/(TILE*.33)));
  const x=dx/steps,y=dy/steps,r=body.r??0;
  for(let i=0;i<steps;i++){
    if(x&&standOn(map,body.x+x,body.y,r))body.x+=x;
    if(y&&standOn(map,body.x,body.y+y,r))body.y+=y;
  }
}
function floorSight(map,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/(TILE/4)));
  let previousX, previousY;
  for(let i=1;i<=steps;i++){
    const x=Math.floor((a.x+dx*i/steps)/TILE),y=Math.floor((a.y+dy*i/steps)/TILE);
    if(x===previousX&&y===previousY)continue;
    if(!openTile(map,x,y))return false;
    previousX=x;previousY=y;
  }
  return true;
}
function mapDistances(map,origin){
  const result=new Int16Array(map.cells.length).fill(-1);
  const queue=new Int16Array(result.length);
  let size=1;
  queue[0]=origin;result[origin]=0;
  for(let i=0;i<size;i++){
    const k=queue[i],x=k%MAZE_COLS,y=Math.floor(k/MAZE_COLS);
    for(const [dx,dy] of tileDirections){
      const nx=x+dx,ny=y+dy;
      const n=tileIndex(nx,ny);
      if(result[n]>=0||!openTile(map,nx,ny))continue;
      result[n]=result[k]+1;queue[size++]=n;
    }
  }
  return result;
}

const formTints={landing:"#e6ae6c",nave:"#d2ab77",cloister:"#aa95c2",rift:"#81c2df",chapel:"#ce89a5",switchback:"#d49b77",basin:"#8bbeb3",archives:"#b1a37b",gallery:"#a5acd4"};
const floorMaterial=["#351c19","#142b38","#1d3429","#4a2117","#253a47","#291f46","#3e1d29"];
function paintRoomFeatures(pen,map,level,color,nodes=map.nodes){
  function ellipse(x,y,rx,ry,fill,stroke,width=1){
    pen.beginPath();pen.ellipse(x,y,rx,ry,0,0,Math.PI*2);
    if(fill){pen.fillStyle=fill;pen.fill()}
    if(stroke){pen.strokeStyle=stroke;pen.lineWidth=width;pen.stroke()}
  }
  function stripe(x,y,w,h,accent){
    pen.fillStyle="#100b16a2";pen.fillRect(x,y+3,w,h+3);
    pen.fillStyle=accent+"7b";pen.fillRect(x,y,w,1.5);
  }
  function lantern(x,y,tint){
    const glow=pen.createRadialGradient(x,y,0,x,y,52);
    glow.addColorStop(0,tint+"86");glow.addColorStop(.33,tint+"3c");glow.addColorStop(1,tint+"00");
    pen.fillStyle=glow;pen.fillRect(x-52,y-52,104,104);
    ellipse(x,y+5,10,5,"#0f0b15c9");
    ellipse(x,y,6,4,tint+"cf","#30212a",2);
    ellipse(x,y-1,2.6,1.7,"#fff1c4");
  }
  for(const n of nodes){
    const tint=formTints[n.form], w=(n.right-n.left)*TILE,h=(n.bottom-n.top)*TILE;
    const left=n.left*TILE,top=n.top*TILE;
    pen.save();pen.beginPath();
    for(let y=n.top;y<n.bottom;y++)for(let x=n.left;x<n.right;x++)if(map.owners[tileIndex(x,y)]===n.number)pen.rect(x*TILE,y*TILE,TILE,TILE);
    pen.clip();
    const lighting=pen.createLinearGradient(left,top,left+w*.68,top+h);
    lighting.addColorStop(0,floorMaterial[level]+"9a");lighting.addColorStop(.48,tint+"13");lighting.addColorStop(1,"#110e1995");
    pen.fillStyle=lighting;pen.fillRect(left,top,w,h);
    switch(n.form){
      case "landing":
      case "nave":{
        const half=n.form==="nave"?110:73;
        const axis=n.form==="nave"?n.y-105:n.y+15;
        pen.fillStyle=floorMaterial[level]+"c0";pen.fillRect(n.x-half,top,half*2,h);
        for(const side of [-1,1]){pen.fillStyle=tint+"75";pen.fillRect(n.x+side*half,top,2,h)}
        for(let y=-2;y<=2;y++)stripe(n.x-half-25,axis+y*13,half*2+50,5,tint);
        ellipse(n.x,n.y+65,60,35,null,tint+"68",2);ellipse(n.x,n.y+65,44,25,null,tint+"54");
        break;
      }
      case "basin":
        ellipse(n.x,n.y+8,212,151,"#11182184",tint+"9c",3);
        ellipse(n.x,n.y+14,193,129,null,tint+"68",3);
        ellipse(n.x,n.y+19,171,110,floorMaterial[level]+"98",tint+"42",2);
        ellipse(n.x-18,n.y+18,119,72,null,tint+"38",1.2);
        for(let i=0;i<6;i++)ellipse(n.x+(i%2?1:-1)*(29+22*i),n.y-33+(i*21)%89,32-i*2,5,null,tint+"46");
        break;
      case "rift":{
        const fault=(n.tx+3*n.flip+.5)*TILE;
        const cold=pen.createLinearGradient(fault-79,n.y,fault+75,n.y);
        cold.addColorStop(0,tint+"00");cold.addColorStop(.40,tint+"36");cold.addColorStop(.60,tint+"36");cold.addColorStop(1,tint+"00");
        pen.fillStyle=cold;pen.fillRect(fault-79,n.y-h*.42,154,h*.84);
        for(const direction of [-1,1]){
          const y=n.y+direction*78;
          pen.fillStyle="#28232f";pen.fillRect(fault-57,y-36,114,72);
          for(let x=-52;x<53;x+=14){pen.fillStyle=tint+"56";pen.fillRect(fault+x,y-34,2,68)}
          for(const side of [-1,1]){
            stripe(fault-61,y+side*39,122,4,tint);
            lantern(fault+side*61,y-32,tint);
          }
        }
        break;
      }
      case "cloister":
        pen.strokeStyle=tint+"6f";pen.lineWidth=3;pen.strokeRect(n.x-128,n.y-102,256,204);
        pen.strokeStyle=tint+"38";pen.strokeRect(n.x-118,n.y-92,236,184);
        ellipse(n.x,n.y,78,48,null,tint+"75",2);
        break;
      case "chapel":{
        const x=n.x+142*n.flip,y=n.y-82;
        ellipse(x,y,102,76,floorMaterial[level]+"bb",tint+"73",3);
        ellipse(x,y,66,49,null,tint+"93",2);ellipse(x,y,34,31,null,tint+"58");
        for(let i=0;i<4;i++)stripe(x-82,y+71+i*8,164,4,tint);
        break;
      }
      case "switchback":
        for(const side of [-1,1])for(let i=0;i<4;i++)stripe(n.x+(side<0?-180:8),n.y+side*83+i*9,172,4,tint);
        break;
      case "archives":
        for(let i=-2;i<=2;i++){
          pen.fillStyle=i%2?"#140e16a0":floorMaterial[level]+"90";pen.fillRect(n.x+i*63-30,top,51,h);
          pen.fillStyle=tint+"57";pen.fillRect(n.x+i*63-33,top,2,h);
        }
        break;
      case "gallery":
        for(const side of [-1,1]){
          const x=n.x+side*194,y=n.y-28*side;
          pen.fillStyle=floorMaterial[level]+"c9";pen.fillRect(x-92,y-91,184,182);
          ellipse(x,y,66,50,null,tint+"9b",2);ellipse(x,y,45,33,null,tint+"63");
        }
        break;
    }
    for(let y=n.top;y<n.bottom;y++)for(let x=n.left;x<n.right;x++){
      if(map.owners[tileIndex(x,y)]!==n.number)continue;
      const outer=Math.abs(x-n.tx)>3||Math.abs(y-n.ty)>3;
      if(!outer||(x*53+y*97+level*11)%13>2)continue;
      const px=x*TILE+9+(x*13+y*3)%24,py=y*TILE+12+(y*11+x*7)%21;
      pen.fillStyle=tint+"23";pen.fillRect(px-1,py+6,13,1);
      pen.beginPath();pen.moveTo(px,py);pen.lineTo(px+8,py-2);pen.lineTo(px+14,py+3);pen.lineTo(px+8,py+6);pen.lineTo(px+2,py+4);pen.closePath();
      pen.fillStyle="#21192391";pen.fill();pen.strokeStyle=tint+"41";pen.lineWidth=1;pen.stroke();
    }
    if(n.form==="nave"||n.form==="chapel"){
      for(const side of [-1,1])lantern(n.x+side*(n.form==="nave"?112:177),n.y-128,tint);
    }
    pen.restore();
    for(let y=n.top;y<n.bottom;y++)for(let x=n.left;x<n.right;x++){
      const k=tileIndex(x,y), type=map.features[k];
      if(type!==1&&type!==2)continue;
      const px=x*TILE,py=y*TILE;
      if(type===2){
        const pit=pen.createLinearGradient(px,py,px+TILE,py);
        pit.addColorStop(0,tint+"52");pit.addColorStop(.18,"#130f1b");pit.addColorStop(.58,"#080710");pit.addColorStop(1,tint+"43");
        pen.fillStyle=pit;pen.fillRect(px,py,TILE,TILE);
        pen.fillStyle="#120d19";pen.fillRect(px+3,py+3,4,TILE-6);pen.fillRect(px+TILE-7,py+3,4,TILE-6);
        if((x+y)%2)ellipse(px+25,py+27,15,4,color+"24");
      }else{
        const pillar=pen.createLinearGradient(px,py,px+TILE,py+12);
        pillar.addColorStop(0,"#231925");pillar.addColorStop(.46,tint+"79");pillar.addColorStop(1,"#352638");
        ellipse(px+32,py+46,31,11,"#10091192");
        pen.fillStyle=pillar;pen.fillRect(px+3,py+3,TILE-6,TILE-7);
        pen.fillStyle="#4d3e49";pen.fillRect(px+2,py+3,TILE-4,14);
        pen.strokeStyle=tint+"a1";pen.lineWidth=1.4;pen.strokeRect(px+4,py+3,TILE-8,12);
        pen.fillStyle="#34222d";pen.fillRect(px+9,py+4,TILE-18,9);
        ellipse(px+26,py+8,6,3,tint+"94");
        pen.fillStyle="#201620";pen.fillRect(px+3,py+43,TILE-6,6);
      }
    }
  }
}
