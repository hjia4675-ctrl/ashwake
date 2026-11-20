"use strict";

const MERCHANT_CHANCE=.30, MERCHANT_PRICE=50;
const merchantColor="#f5c57e";

function rollMerchant(map,random=Math.random){
  if(random()>=MERCHANT_CHANCE)return null;
  const node=map.nodes.find(room=>room.kind==="coil");
  return {node,x:node.x+2*TILE,y:node.y-2*TILE,weapon:weaponIds[Math.floor(random()*weaponIds.length)],sold:false};
}

function merchantInteraction(){
  const shop=floor.merchant;
  if(!shop||!shop.node.done||shop.sold||dist(player,shop)>64||!floorSight(floor,player,shop))return null;
  return {type:"merchant",label:"与收钟人交易",detail:`任购一件 · ${MERCHANT_PRICE} 余烬 · 持有 ${Math.floor(player.ash)}`};
}

function merchantBalance(){
  const missing=MERCHANT_PRICE-Math.floor(player.ash);
  const stock=missing>0?`还差 ${missing} 点余烬，可先看看货物。`:"任选一件，成交后收摊。";
  return `每件 ${MERCHANT_PRICE} 余烬 · 现有 ${Math.floor(player.ash)}。 ${stock}`;
}

function activeMerchant(shop){
  return state==="merchant"&&floor.merchant===shop&&shop.node.done&&!shop.sold;
}
function payMerchant(shop){
  if(!activeMerchant(shop)||player.ash<MERCHANT_PRICE)return false;
  player.ash-=MERCHANT_PRICE;
  shop.sold=true;
  return true;
}

function showMerchant(){
  const shop=floor.merchant;
  if(!shop||shop.sold||!shop.node.done)return;
  state="merchant";resetInput();
  const ownsWeapon=player.weapons.includes(shop.weapon);
  const weaponDisabled=ownsWeapon||player.ash<MERCHANT_PRICE;
  const relicDisabled=!relics.some(canTakeRelic);
  let relicNote=touchUI?"按流派浏览。每件遗物都标有叠加上限。":RELIC_STACK_NOTE;
  if(relicDisabled)relicNote="所有遗物都已达上限。";
  const relicOffer=`<button class="card merchant-relic" data-pick="0"${relicDisabled?" disabled":""}><span class="icon" aria-hidden="true">◈</span><kbd>1</kbd><b>挑选遗物</b><small>${relicNote}</small></button>`;
  const weaponOffer=weaponCard(shop.weapon,1,weaponDisabled);
  const note=merchantBalance()+(ownsWeapon?" 这层售卖的武器已在你的行囊里。":"");
  showModal(heading("收钟人",note)+`<div class="choices two armory merchant-options">${relicOffer}${weaponOffer}</div>`+
    row(btn("merchantLeave","稍后再来")),[relicDisabled?null:()=>showMerchantRelics(shop),weaponDisabled?null:()=>chooseMerchantWeapon(shop)]);
  $("merchantLeave").onclick=leaveMerchant;
}

function showMerchantRelics(shop,school){
  if(!activeMerchant(shop))return;
  const available=relics.filter(canTakeRelic);
  const groups=Object.keys(schools).filter(key=>available.some(r=>r.school===key));
  const active=groups.includes(school)?school:groups[0];
  const items=available.filter(r=>r.school===active), disabled=player.ash<MERCHANT_PRICE;
  const tabs=groups.map(key=>`<button type="button" class="quiet" id="merchant-school-${key}" aria-pressed="${key===active}">${schools[key].name}</button>`).join("");
  showModal(heading("收钟人 · 遗物",merchantBalance())+`<div class="merchant-schools" role="group" aria-label="遗物流派">${tabs}</div>`+
    cards(items,"rewards merchant-relics",disabled)+row(btn("merchantBack","返回货摊"),btn("merchantLeave","离开")),
    items.map(r=>disabled?null:()=>buyMerchantRelic(shop,r)));
  for(const key of groups)$("merchant-school-"+key).onclick=()=>showMerchantRelics(shop,key);
  if(active)$("merchant-school-"+active).focus({preventScroll:true});
  $("merchantBack").onclick=showMerchant;
  $("merchantLeave").onclick=leaveMerchant;
}

function buyMerchantRelic(shop,relic){
  if(!canTakeRelic(relic)||!payMerchant(shop))return;
  grantRelic(relic);
  sfx("choose");announce("已购入 · "+relicTitle(relic),"收钟人已完成本层交易",1.65);
  leaveMerchant();
}

function chooseMerchantWeapon(shop){
  if(!activeMerchant(shop)||player.ash<MERCHANT_PRICE||player.weapons.includes(shop.weapon))return;
  if(player.weapons.length===2){
    chooseWeaponSlot(shop.weapon,`支付 ${MERCHANT_PRICE} 余烬，换下的武器留在原地。`,slot=>buyMerchantWeapon(shop,slot),showMerchant);
  }else buyMerchantWeapon(shop,player.weapons.length);
}

function buyMerchantWeapon(shop,slot){
  if(player.weapons.includes(shop.weapon)||!payMerchant(shop))return;
  equipCarriedWeapon(shop.weapon,slot,shop);
  announce("已购入 · "+weaponBook[shop.weapon].name,"收钟人已完成本层交易",1.65);
  leaveMerchant();
}

function leaveMerchant(){
  if(state!=="merchant")return;
  state="fight";closeModal();nearby=nearInteraction();drawHud();
}

function drawMerchant(){
  const shop=floor.merchant;
  if(!shop||!shop.node.visited)return;
  const {x,y}=shop;
  if(x<camera.x-92||x>camera.x+W+92||y<camera.y-110||y>camera.y+H+110)return;
  const trading=shop.node.done&&!shop.sold;
  const light=shop.sold?"#9a8476":merchantColor;
  const bob=smallMotion?0:Math.sin(visualTime*2.2)*1.6;
  glow(x,y-13,77,trading?"#f6a96360":"#c78d6732");
  oval(x,y+7,49,15,"#120b17c8");
  ctx.save();ctx.translate(x,y+bob);
  ctx.fillStyle="#302333";ctx.strokeStyle=light;ctx.lineWidth=1.6;
  ctx.beginPath();ctx.moveTo(-24,-6);ctx.lineTo(-17,-41);ctx.quadraticCurveTo(-7,-54,-10,-63);
  ctx.quadraticCurveTo(0,-82,12,-66);ctx.quadraticCurveTo(10,-54,20,-44);
  ctx.lineTo(27,-6);ctx.quadraticCurveTo(0,4,-24,-6);ctx.closePath();ctx.fill();ctx.stroke();
  oval(0,-58,8,10,"#160e19");
  line(-4,-60,4,-60,light,1.4);
  line(-29,-5,-29,-39,"#9f7763",2.6);
  line(-29,-39,-23,-34,light,1.4);
  oval(-24,-29,5,7,"#b48355");
  ctx.restore();
  line(x-43,y+5,x+44,y+5,"#66432f",7);
  line(x-42,y+2,x+43,y+2,"#b58d61",2);
  if(trading)paintWeapon(shop.weapon,x-13,y-8,.04,.31);
  ctx.textAlign="center";ctx.font="700 13px system-ui";ctx.lineWidth=3.5;ctx.strokeStyle="#19101b";
  ctx.fillStyle=light;
  const name=shop.sold?"收钟人 · 已成交":shop.node.done?"收钟人":"收钟人 · 清场后交易";
  ctx.strokeText(name,x,y-86);ctx.fillText(name,x,y-86);
}
