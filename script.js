/* No Due Quest — a small graph traversal arcade game. */
'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const departments = [
  { id:'print', name:'PRINT SHOP', x:92, y:290, color:'#ffbb3b', task:'Collect No Due Form', message:'Here is your No Due Form.', icon:'P' },
  { id:'library', name:'LIBRARY', x:380, y:83, color:'#58c8ff', task:'Verify pending books', message:'No pending books. Signature granted.', icon:'B' },
  { id:'finance', name:'FINANCE', x:666, y:290, color:'#78e686', task:'Verify pending fees', message:'No fee dues found. Signature granted.', icon:'₹' },
  { id:'labs', name:'LABS', x:380, y:342, color:'#bd7cff', task:'Verify lab damages', message:'No lab damages found. Signature granted.', icon:'L' },
  { id:'teacher', name:'CLASS TEACHER', x:270, y:520, color:'#ff719f', task:'Verify all subjects', message:'All subjects cleared. Signature granted.', icon:'T' },
  { id:'hod', name:'HOD', x:505, y:565, color:'#ffd43b', task:'Get final approval', message:'Congratulations, Shivam! Your No Due Certificate is approved.', icon:'H' }
];

// Road graph: each segment is an edge; junctions create alternate routes.
const roads = [
  [92,290,380,290],[380,83,380,342],[380,290,666,290],
  [380,342,270,520],[270,520,505,565],[505,565,505,430],
  [505,430,666,290],[92,290,92,430],[92,430,270,520],
  [380,83,540,150],[540,150,666,290]
];

const state = { playerName:'SHIVAM', avatar:0, player:{x:380,y:290,r:11}, keys:{}, collected:new Set(), closed:new Map(), started:0, elapsed:0, won:false, dialogUntil:0, raf:0, last:0 };
const avatars = [
  { className:'avatar-blue', shirt:'#20e0e8', hair:'#17213b' },
  { className:'avatar-red', shirt:'#ff477e', hair:'#4a251e' },
  { className:'avatar-green', shirt:'#40f59b', hair:'#d97736' },
  { className:'avatar-purple', shirt:'#bd7cff', hair:'#070914' }
];
const closureReasons = { print:'OUT OF PAPER', labs:'MAINTENANCE', library:'STOCK CHECK', finance:'SERVER DOWN', teacher:'IN A MEETING' };

function distanceToSegment(px,py,x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;
  let t=l2?((px-x1)*dx+(py-y1)*dy)/l2:0;t=Math.max(0,Math.min(1,t));
  return Math.hypot(px-(x1+t*dx),py-(y1+t*dy));
}
function onRoad(x,y){ return roads.some(r=>distanceToSegment(x,y,...r)<18); }
function fmt(sec){const m=Math.floor(sec/60),s=Math.floor(sec%60);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}

function resetGame(){
  cancelAnimationFrame(state.raf); state.player={x:380,y:290,r:11};state.keys={};state.collected=new Set();state.closed=new Map();state.started=performance.now();state.elapsed=0;state.won=false;state.last=0;
  document.getElementById('winScreen').classList.add('hidden');document.getElementById('dialogue').classList.add('hidden');
  const candidates=departments.filter(d=>!['hod','teacher'].includes(d.id)).sort(()=>Math.random()-.5);
  const count=Math.random()<.5?1:2;
  candidates.slice(0,count).forEach((d,i)=>state.closed.set(d.id,performance.now()+9000+i*3500));
  setMessage('Find the Print Shop and collect your No Due Form.');updateUI();state.raf=requestAnimationFrame(loop);
}

function showLogin(){
  cancelAnimationFrame(state.raf);state.keys={};
  document.getElementById('loginScreen').classList.remove('hidden');
  const input=document.getElementById('playerName');
  input.value=state.playerName==='SHIVAM'?'':state.playerName;
  document.querySelector(`input[name="avatar"][value="${state.avatar}"]`).checked=true;
  setTimeout(()=>input.focus(),0);
}

function beginQuest(name,avatar){
  state.playerName=name.trim().replace(/\s+/g,' ').toUpperCase();
  state.avatar=Number(avatar);
  document.getElementById('profileName').textContent=state.playerName;
  document.getElementById('winnerName').textContent=state.playerName;
  document.getElementById('profileAvatar').className=`portrait ${avatars[state.avatar].className}`;
  document.getElementById('loginScreen').classList.add('hidden');
  resetGame();
}

function update(dt){
  if(state.won)return;
  const now=performance.now();state.elapsed=(now-state.started)/1000;
  let dx=(state.keys.ArrowRight?1:0)-(state.keys.ArrowLeft?1:0),dy=(state.keys.ArrowDown?1:0)-(state.keys.ArrowUp?1:0);
  if(dx||dy){const mag=Math.hypot(dx,dy);dx/=mag;dy/=mag;const speed=145;const nx=state.player.x+dx*speed*dt,ny=state.player.y+dy*speed*dt;if(onRoad(nx,ny)){state.player.x=nx;state.player.y=ny;}}
  for(const [id,until] of [...state.closed]){if(now>=until){state.closed.delete(id);const d=departments.find(x=>x.id===id);showDialogue('SYSTEM',`${d.name} is open again!`, '✓');setMessage(`${d.name} reopened. The route is clear.`);}}
  checkDepartment(now);updateUI();
}

function checkDepartment(now){
  for(const d of departments){
    if(Math.hypot(state.player.x-d.x,state.player.y-d.y)>32)continue;
    if(state.closed.has(d.id)){if(now>state.dialogUntil)showDialogue('CAMPUS ALERT',`${d.name} is temporarily closed. Find another route and return later.`,'!');return;}
    if(state.collected.has(d.id))return;
    if(d.id!=='print'&&!state.collected.has('print')){if(now>state.dialogUntil)showDialogue(d.name,'Collect the No Due Form from the Print Shop first.','?');return;}
    if(d.id==='hod'&&state.collected.size<5){if(now>state.dialogUntil)showDialogue('HOD',`Get all signatures first, ${titleName()}.`,'H');return;}
    const message=d.id==='hod'?`Congratulations, ${titleName()}! Your No Due Certificate is approved.`:d.message;
    state.collected.add(d.id);showDialogue(d.id==='teacher'?'CLASS TEACHER':d.name,message,d.icon);setMessage(d.id==='hod'?'Certificate approved!':`${d.name} signed. Continue to the next department.`);
    if(d.id==='hod')win();return;
  }
}

function showDialogue(speaker,text,icon){
  document.getElementById('speaker').textContent=speaker;document.getElementById('dialogueText').textContent=text;document.getElementById('speakerIcon').textContent=icon;
  document.getElementById('dialogue').classList.remove('hidden');state.dialogUntil=performance.now()+2800;
  clearTimeout(state.dialogTimer);state.dialogTimer=setTimeout(()=>document.getElementById('dialogue').classList.add('hidden'),2800);
}
function setMessage(text){document.getElementById('messageBox').textContent=text;}
function titleName(){return state.playerName.toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase());}
function win(){state.won=true;document.getElementById('finalTime').textContent=fmt(state.elapsed);setTimeout(()=>document.getElementById('winScreen').classList.remove('hidden'),900);}

function updateUI(){
  document.getElementById('signatureCount').textContent=`${state.collected.size} / 6`;document.getElementById('progressBar').style.width=`${state.collected.size/6*100}%`;
  const hasForm=state.collected.has('print');const form=document.getElementById('formStatus');form.textContent=hasForm?'COLLECTED':'NOT COLLECTED';form.style.color=hasForm?'var(--green)':'var(--pink)';document.getElementById('timer').textContent=fmt(state.elapsed);
  document.getElementById('mapStatus').textContent=state.closed.size?'DETOUR ACTIVE':'ALL ROUTES OPEN';
  document.getElementById('obstacleList').innerHTML=state.closed.size?[...state.closed].map(([id,until])=>{const d=departments.find(x=>x.id===id),left=Math.max(0,Math.ceil((until-performance.now())/1000));return `<div class="obstacle"><strong>⚠ ${d.name}</strong>${closureReasons[id]} · ${left}s</div>`}).join(''):'<div class="obstacle" style="border-color:var(--green)"><strong style="color:var(--green)">✓ CLEAR</strong>All departments open.</div>';
  document.getElementById('questList').innerHTML=departments.map((d,i)=>{let cls=state.collected.has(d.id)?'done':(!state.collected.has('print')&&d.id==='print')||(state.collected.size===5&&d.id==='hod')?'active':'';return `<li class="${cls}">${state.collected.has(d.id)?'✓':'□'} ${d.task}</li>`}).join('');
}

function draw(){
  ctx.fillStyle='#071126';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#102447';ctx.lineWidth=1;for(let x=0;x<W;x+=38){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=38){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  // Edges.
  ctx.lineCap='square';roads.forEach((r,i)=>{ctx.strokeStyle='#203c61';ctx.lineWidth=30;ctx.beginPath();ctx.moveTo(r[0],r[1]);ctx.lineTo(r[2],r[3]);ctx.stroke();ctx.strokeStyle='#4b6281';ctx.lineWidth=3;ctx.setLineDash([10,12]);ctx.stroke();ctx.setLineDash([])});
  // Vertices/buildings.
  departments.forEach(d=>drawDepartment(d));drawPlayer();
  ctx.fillStyle='#6581a5';ctx.font='16px VT323';ctx.textAlign='left';ctx.fillText('V = 6 DEPARTMENTS',14,25);ctx.textAlign='right';ctx.fillText('E = 11 ROADS',W-14,25);
}
function drawDepartment(d){
  const locked=state.closed.has(d.id),done=state.collected.has(d.id),w=d.id==='teacher'?126:102,h=64,x=d.x-w/2,y=d.y-h/2;
  ctx.fillStyle=locked?'#29273b':'#101d3a';ctx.fillRect(x,y,w,h);ctx.strokeStyle=locked?'#ff477e':done?'#40f59b':d.color;ctx.lineWidth=4;ctx.strokeRect(x,y,w,h);
  ctx.fillStyle=locked?'#ff477e':d.color;ctx.fillRect(x+8,y+10,24,24);ctx.fillStyle='#071126';ctx.font='20px VT323';ctx.textAlign='center';ctx.fillText(locked?'×':done?'✓':d.icon,x+20,y+30);
  ctx.fillStyle=locked?'#718098':'#eef7ff';ctx.font=`${d.id==='teacher'?13:15}px VT323`;ctx.fillText(d.name,d.x,y+53);
  // Pixel roof.
  ctx.fillStyle=locked?'#69314b':d.color;ctx.fillRect(x-5,y-8,w+10,8);ctx.fillRect(x+8,y-14,w-16,6);
  if(locked){ctx.font='25px serif';ctx.fillText('🔒',d.x,y-20)}
  if(done){ctx.fillStyle='#40f59b';ctx.beginPath();ctx.arc(x+w-5,y+4,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#071126';ctx.font='15px VT323';ctx.fillText('✓',x+w-5,y+9)}
}
function drawPlayer(){
  const p=state.player,a=avatars[state.avatar];ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.fillStyle='#071126';ctx.fillRect(-10,10,20,4);ctx.fillStyle='#e8a56b';ctx.fillRect(-6,-17,12,9);ctx.fillStyle=a.hair;ctx.fillRect(-8,-20,16,5);ctx.fillStyle=a.shirt;ctx.fillRect(-9,-8,18,17);ctx.fillStyle='#ffb02e';ctx.fillRect(7,-7,7,16);ctx.fillStyle='#dae6f5';ctx.fillRect(-8,9,6,8);ctx.fillRect(3,9,6,8);ctx.restore();
  ctx.fillStyle='#ffd43b';ctx.font='13px Press Start 2P';ctx.textAlign='center';ctx.fillText(state.playerName,p.x,p.y-29);
}
function loop(t){const dt=Math.min(.035,(t-(state.last||t))/1000);state.last=t;update(dt);draw();state.raf=requestAnimationFrame(loop);}

window.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow')){e.preventDefault();state.keys[e.key]=true;}});window.addEventListener('keyup',e=>state.keys[e.key]=false);
document.querySelectorAll('[data-dir]').forEach(btn=>{const key={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[btn.dataset.dir];const on=e=>{e.preventDefault();btn.setPointerCapture?.(e.pointerId);state.keys[key]=true},off=e=>{e.preventDefault();state.keys[key]=false};btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('lostpointercapture',off);});
document.getElementById('loginForm').addEventListener('submit',e=>{
  e.preventDefault();
  const name=document.getElementById('playerName').value.trim();
  if(name.length<2){document.getElementById('nameError').textContent='NAME MUST HAVE AT LEAST 2 CHARACTERS';return;}
  const avatar=document.querySelector('input[name="avatar"]:checked').value;
  document.getElementById('nameError').textContent='';beginQuest(name,avatar);
});
document.getElementById('newGame').addEventListener('click',showLogin);document.getElementById('playAgain').addEventListener('click',resetGame);
draw();
