(() => {
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const overlay = document.querySelector('#overlay');
  const startBtn = document.querySelector('#startBtn');
  const toast = document.querySelector('#toast');
  const keys = Object.create(null);
  const pressed = Object.create(null);
  let started = false, won = false, muted = true, last = 0, tick = 0, camera = 0, toastTimer = 0;
  let audio;
  const worldW = 4680, floorY = 242;
  const platforms = [
    {x:0,y:242,w:1935,h:80}, {x:1975,y:242,w:520,h:80}, {x:2540,y:242,w:2140,h:80},
    {x:280,y:196,w:130,h:12},{x:500,y:171,w:115,h:12},{x:690,y:202,w:130,h:12},
    {x:890,y:180,w:140,h:12},{x:1110,y:205,w:145,h:12},{x:1370,y:183,w:140,h:12},
    {x:1580,y:195,w:160,h:12},{x:1805,y:182,w:140,h:12},
    {x:2020,y:202,w:120,h:12},{x:2200,y:170,w:155,h:12},{x:2390,y:198,w:110,h:12},
    {x:2620,y:203,w:150,h:12},{x:2830,y:178,w:140,h:12},{x:3050,y:196,w:155,h:12},
    {x:3280,y:168,w:145,h:12},{x:3500,y:200,w:160,h:12},{x:3730,y:182,w:130,h:12},
    {x:3940,y:204,w:160,h:12},{x:4150,y:177,w:140,h:12},{x:4390,y:202,w:165,h:12}
  ];
  const sigils = [
    {x:555,y:146,got:false},{x:2320,y:141,got:false},{x:3610,y:171,got:false}
  ];
  const relic = {x:1228,y:174,got:false};
  const spikes = [{x:790,w:52},{x:1515,w:50},{x:2925,w:56},{x:3860,w:60}];
  const enemies = [
    {x:650,y:222,min:600,max:740,v:27,hp:1,alive:true,type:0},
    {x:1010,y:222,min:970,max:1080,v:31,hp:1,alive:true,type:0},
    {x:1770,y:222,min:1725,max:1840,v:32,hp:1,alive:true,type:0},
    {x:2670,y:222,min:2590,max:2770,v:29,hp:1,alive:true,type:0},
    {x:3220,y:222,min:3160,max:3260,v:35,hp:1,alive:true,type:0},
    {x:3990,y:222,min:3900,max:4090,v:32,hp:1,alive:true,type:0}
  ];
  const player = {x:90,y:206,vx:0,vy:0,w:13,h:22,face:1,onGround:false,coyote:0,jumps:0,hp:3,invuln:0,attack:0,dash:0,dashCD:0,checkpoint:90,anim:0};
  const boss = {x:4300,y:205,hp:4,alive:true,flash:0,wind:0,phase:0};
  const particles = [];
  let gateMessageShown = false;
  const zones = [
    {x:0,name:'BOSQUE DOS SUSSURROS',c1:'#1b3040',c2:'#101b2b',accent:'#55b5a2'},
    {x:1120,name:'RUÍNAS DA FRONTEIRA',c1:'#433044',c2:'#211e32',accent:'#d08c71'},
    {x:2220,name:'ABISMO DE VIDRO',c1:'#20364a',c2:'#101c31',accent:'#70c6d1'},
    {x:3300,name:'SANTUÁRIO CAÍDO',c1:'#473344',c2:'#241c2f',accent:'#e3ae68'}
  ];
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const rand = (a,b) => a + Math.random()*(b-a);
  function beep(freq=440,dur=.07,type='sine',vol=.025){
    if(muted) return;
    try { audio ||= new (window.AudioContext||window.webkitAudioContext)(); const o=audio.createOscillator(),g=audio.createGain(); o.type=type;o.frequency.value=freq;g.gain.value=vol;g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+dur); } catch {}
  }
  function notify(text){toast.textContent=text;toast.classList.add('show');toastTimer=2.2;}
  function emit(x,y,color,n=8){for(let i=0;i<n;i++)particles.push({x,y,vx:rand(-55,55),vy:rand(-85,20),life:rand(.35,.8),max:.8,color,size:Math.random()<.6?2:3});}
  function zoneAt(x){let z=zones[0];for(const q of zones)if(x>=q.x)z=q;return z;}
  function reset(){Object.assign(player,{x:player.checkpoint,y:206,vx:0,vy:0,hp:3,invuln:1.2,dash:0});}
  function start(){if(started)return;started=true;overlay.classList.add('hidden');notify('A FRONTEIRA AGUARDA...');beep(392,.18);}
  startBtn.addEventListener('click',start);
  document.querySelector('#soundBtn').addEventListener('click',e=>{muted=!muted;e.currentTarget.innerHTML=(muted?'♫':'♪')+' <span>'+(muted?'ÁUDIO':'ATIVO')+'</span>';if(!muted)beep(540,.08);});
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if([' ','arrowleft','arrowright','arrowup'].includes(k))e.preventDefault();if(!keys[k])pressed[k]=true;keys[k]=true;if(!started&&(k==='enter'||k===' '))start();if(won&&k==='enter')location.reload();});
  window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
  document.querySelectorAll('.mobile-controls button').forEach(btn=>{const key=btn.dataset.key;const down=e=>{e.preventDefault();keys[key]=true;pressed[key]=true;};const up=e=>{e.preventDefault();keys[key]=false;};btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointerleave',up);btn.addEventListener('pointercancel',up);});
  function down(...k){return k.some(x=>keys[x]);} function hit(...k){return k.some(x=>pressed[x]);}
  function update(dt){
    tick+=dt; if(!started||won)return;
    const p=player; p.anim+=dt*(Math.abs(p.vx)>8?10:3);p.invuln=Math.max(0,p.invuln-dt);p.attack=Math.max(0,p.attack-dt);p.dashCD=Math.max(0,p.dashCD-dt);
    const left=down('a','arrowleft','left'),right=down('d','arrowright','right');
    const axis=(right?1:0)-(left?1:0);if(axis)p.face=axis;
    if(hit('z','j','attack')&&p.attack<=0){p.attack=.27;beep(210,.08,'triangle',.04);emit(p.x+p.face*16,p.y+9,'#f3d37e',4);}
    if(hit(' ','arrowup','w','jump')&&(p.onGround||p.coyote>0||p.jumps<(relic.got?2:1))){p.vy=-255;p.onGround=false;p.coyote=0;p.jumps++;beep(280,.07,'square',.02);}
    if(hit('x','k','dash')&&relic.got&&p.dashCD<=0){p.dash=.19;p.dashCD=.58;p.vy=0;p.vx=p.face*270;beep(520,.1,'sawtooth',.025);emit(p.x,p.y+10,'#7ad7d0',8);}
    if(p.dash>0){p.dash-=dt;p.vx=p.face*270;}else{p.vx+=(axis*100-p.vx)*Math.min(1,dt*11);p.vy=Math.min(300,p.vy+560*dt);}
    const prevY=p.y;p.x=clamp(p.x+p.vx*dt,0,worldW-p.w);
    if(!relic.got&&p.x+p.w>1920&&p.x<1940){p.x=1919-p.w;if(!gateMessageShown){notify('O SELO BLOQUEIA O CAMINHO · BUSQUE A RELÍQUIA');gateMessageShown=true;}}
    p.y+=p.vy*dt;p.onGround=false;
    if(p.vy>=0){for(const q of platforms)if(p.x+p.w>q.x&&p.x<q.x+q.w&&prevY+p.h<=q.y+2&&p.y+p.h>=q.y){p.y=q.y-p.h;p.vy=0;p.onGround=true;p.jumps=0;}}
    if(p.onGround)p.coyote=.1;else p.coyote=Math.max(0,p.coyote-dt);
    if(p.y>H+120){p.hp=0;}
    if(p.hp<=0){notify('A LUZ SE APAGA...');beep(100,.3,'sawtooth');reset();}
    if(p.x>500&&p.checkpoint<500){p.checkpoint=520;notify('PONTO DE RETORNO ATIVADO');}
    if(p.x>2250&&p.checkpoint<2250){p.checkpoint=2260;notify('PONTO DE RETORNO ATIVADO');}
    if(p.x>3480&&p.checkpoint<3480){p.checkpoint=3490;notify('PONTO DE RETORNO ATIVADO');}
    for(const s of sigils)if(!s.got&&Math.abs((p.x+p.w/2)-s.x)<17&&Math.abs((p.y+p.h/2)-s.y)<22){s.got=true;emit(s.x,s.y,'#f2cd7e',24);beep(660,.25);notify('RUNA ANTIGA ADQUIRIDA');}
    if(!relic.got&&Math.abs((p.x+p.w/2)-relic.x)<20&&Math.abs((p.y+p.h/2)-relic.y)<25){relic.got=true;emit(relic.x,relic.y,'#67d9ce',28);beep(780,.3);notify('RELÍQUIA DESPERTA · INVESTIDA + PULO DUPLO');}
    for(const e of enemies){if(!e.alive)continue;e.x+=e.v*dt;if(e.x<e.min||e.x>e.max){e.v*=-1;e.x=clamp(e.x,e.min,e.max);}if(p.invuln<=0&&Math.abs(p.x-e.x)<17&&Math.abs(p.y-e.y)<19){hurt();}}
    if(p.attack>0){for(const e of enemies){if(e.alive&&Math.abs((p.x+p.w/2+p.face*17)-e.x)<22&&Math.abs(p.y-e.y)<28){e.alive=false;emit(e.x,e.y,'#e89b69',12);beep(120,.08,'square');}}
      if(boss.alive&&Math.abs((p.x+p.w/2+p.face*18)-boss.x)<34&&Math.abs(p.y-boss.y)<34&&boss.flash<=0){boss.hp--;boss.flash=.6;emit(boss.x,boss.y,'#f4cb82',15);beep(150,.12,'square',.045);if(boss.hp<=0){boss.alive=false;notify('O GUARDIÃO FOI LIBERTADO');}}
    }
    if(boss.alive){boss.flash=Math.max(0,boss.flash-dt);boss.phase+=dt;if(boss.wind>0){boss.wind-=dt;if(boss.wind<=0&&Math.abs(p.x-boss.x)<75)hurt();}else if(Math.abs(p.x-boss.x)<115&&boss.phase>1.3){boss.wind=.48;boss.phase=0;}}
    if(boss.alive&&p.invuln<=0&&Math.abs(p.x-boss.x)<23&&Math.abs(p.y-boss.y)<27)hurt();
    if(p.x>4540){if(sigils.every(s=>s.got)&&!boss.alive){won=true;showWin();}else if(sigils.some(s=>!s.got))notify('O SANTUÁRIO EXIGE AS TRÊS RUNAS');else notify('O GUARDIÃO AINDA VIVE');p.x=4510;}
    for(const s of spikes){if(p.x+p.w>s.x&&p.x<s.x+s.w&&p.y+p.h>228&&p.invuln<=0)hurt();}
    for(let i=particles.length-1;i>=0;i--){const a=particles[i];a.life-=dt;a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy+=95*dt;if(a.life<=0)particles.splice(i,1);}
    camera+=(clamp(p.x-170,0,worldW-W)-camera)*Math.min(1,dt*5);
    toastTimer-=dt;if(toastTimer<=0)toast.classList.remove('show');
    for(const k in pressed)delete pressed[k];
  }
  function hurt(){player.hp--;player.invuln=1.2;player.vy=-115;player.vx=-player.face*80;emit(player.x+7,player.y+10,'#f07679',10);beep(95,.18,'sawtooth',.04);if(player.hp<=0){notify('A LUZ SE APAGA...');reset();}}
  function showWin(){overlay.classList.remove('hidden');overlay.innerHTML='<div class="title-card"><div class="eyebrow"><i></i> FIM DE JORNADA · NOVO COMEÇO <i></i></div><h1>LUZ<br><span>RENASCIDA</span></h1><p>As runas voltaram a cantar.<br>A fronteira respira mais uma vez.</p><button id="againBtn" class="start-btn">JOGAR NOVAMENTE <b>↻</b></button></div><div class="title-art"><div class="moon"></div><div class="art-spire spire-a"></div><div class="art-spire spire-b"></div><div class="art-hero">✦</div><div class="art-ground"></div></div>';document.querySelector('#againBtn').onclick=()=>location.reload();beep(660,.5);}
  const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.floor(x),Math.floor(y),Math.ceil(w),Math.ceil(h));};
  function drawBackground(){
    const z=zoneAt(camera+W/2);const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,z.c1);g.addColorStop(1,z.c2);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // distant moon and drifting motes
    ctx.globalAlpha=.72;ctx.fillStyle=z.accent;ctx.beginPath();ctx.arc(376-camera*.025,54,23,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.16;ctx.beginPath();ctx.arc(376-camera*.025,54,34,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    for(let i=0;i<42;i++){let x=((i*137-camera*.12)%540+540)%540,y=(i*67%150)+15;rect(x,y,1,1,'#d7e3dc88');}
    for(let layer=0;layer<3;layer++){const speed=[.12,.24,.42][layer],base=layer===0?145:layer===1?184:218;const color=layer===0?'#111a2a':layer===1?'#182234':'#202b39';ctx.fillStyle=color;for(let i=-1;i<12;i++){const x=i*65-(camera*speed%65),h=30+(i*31%53);ctx.beginPath();ctx.moveTo(x,base);ctx.lineTo(x+12,base-h);ctx.lineTo(x+20,base-h-13);ctx.lineTo(x+31,base-h+5);ctx.lineTo(x+41,base);ctx.fill();}}
    // thin atmospheric streaks
    ctx.globalAlpha=.16;for(let i=0;i<7;i++){const x=((i*113-camera*.55)%600+600)%600;rect(x,120+(i*19%65),22+(i%3)*15,1,z.accent);}ctx.globalAlpha=1;
  }
  function drawWorld(){
    ctx.save();ctx.translate(-Math.floor(camera),0);const z=zoneAt(camera+W/2);
    // ground and floating ledges
    for(const q of platforms){rect(q.x,q.y,q.w,q.h,q.y===floorY?'#26303a':'#303743');rect(q.x,q.y,q.w,3,z.accent);rect(q.x,q.y+4,q.w,2,'#121b27');for(let x=q.x+4;x<q.x+q.w-3;x+=18){rect(x,q.y+7,1,2,'#75807155');if(q.y===floorY)rect(x+5,q.y+17,5,1,'#46505a');}}
    // sealed passage: the relic is the key to crossing into the outer ruins
    if(!relic.got){rect(1917,49,26,193,'#121826');rect(1919,53,22,187,'#263143');rect(1922,55,2,183,'#d7ad6a');rect(1934,55,2,183,'#d7ad6a');rect(1924,112,10,30,'#473c51');rect(1927,122,4,8,'#e9c779');rect(1920,48,20,5,'#c29c68');rect(1914,239,32,5,'#58434b');}
    else{ctx.globalAlpha=.6;rect(1920,227,22,2,'#83d9cd');ctx.globalAlpha=1;}
    // roots / ruin columns at area boundaries
    for(let i=0;i<16;i++){const x=i*310+150;rect(x,194,5,48,'#182431');rect(x-4,190,13,5,'#394047');rect(x+2,208,2,2,'#e0ad6b66');}
    // spike beds
    for(const s of spikes){for(let x=s.x;x<s.x+s.w;x+=8){ctx.fillStyle='#bd6970';ctx.beginPath();ctx.moveTo(x,230);ctx.lineTo(x+4,219);ctx.lineTo(x+8,230);ctx.fill();rect(x+2,230,4,2,'#723d54');}}
    // relic altar
    if(!relic.got){rect(relic.x-13,198,26,6,'#7c6554');rect(relic.x-9,189,18,9,'#514354');ctx.fillStyle='#79ded1';ctx.globalAlpha=.7+Math.sin(tick*4)*.2;ctx.beginPath();ctx.arc(relic.x,174,6,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;rect(relic.x-1,178,2,14,'#99f6df');}
    for(const s of sigils){if(s.got)continue;const bob=Math.sin(tick*3+s.x)*3;ctx.fillStyle='#f0cb79';ctx.beginPath();ctx.moveTo(s.x, s.y-10+bob);ctx.lineTo(s.x+7,s.y+bob);ctx.lineTo(s.x,s.y+10+bob);ctx.lineTo(s.x-7,s.y+bob);ctx.fill();ctx.fillStyle='#fff0bb';ctx.fillRect(s.x-1,s.y-4+bob,2,8);}
    // enemy sprites
    for(const e of enemies)if(e.alive){const x=Math.floor(e.x),y=Math.floor(e.y);rect(x-7,y+6,15,10,'#b66f64');rect(x-5,y,11,11,'#cc8670');rect(x-3,y+3,2,2,'#f8db9c');rect(x+2,y+3,2,2,'#f8db9c');rect(x-6,y+14,4,5,'#593e50');rect(x+3,y+14,4,5,'#593e50');rect(x-9,y+8,3,5,'#e9ad72');}
    // guardian sentinel
    if(boss.alive){const bx=Math.floor(boss.x),by=Math.floor(boss.y);if(boss.wind>.01){ctx.globalAlpha=.45;rect(bx-19,by+10,38,3,'#e7af69');ctx.globalAlpha=1;}const col=boss.flash>0?'#fff1c8':'#786078';rect(bx-13,by-17,26,29,col);rect(bx-17,by-8,34,17,col);rect(bx-10,by-23,20,8,'#bf936e');rect(bx-8,by-12,5,3,'#f5cb77');rect(bx+4,by-12,5,3,'#f5cb77');rect(bx-11,by+12,7,9,'#4c4054');rect(bx+4,by+12,7,9,'#4c4054');rect(bx-18,by-15,4,9,'#e3b46d');}
    // player, cloak and sword arc
    const p=player;ctx.save();if(p.invuln>0&&Math.floor(tick*14)%2)ctx.globalAlpha=.4;const px=Math.floor(p.x),py=Math.floor(p.y),bob=p.onGround&&Math.abs(p.vx)>10?Math.sin(p.anim)*2:0;
    if(p.dash>0){ctx.globalAlpha=.32;rect(px-p.face*19,py+4,17,14,'#6dddd2');ctx.globalAlpha=1;}
    rect(px+3,py+7+bob,9,13,'#d8b073');rect(px+1,py+10+bob,11,12,'#58677a');rect(px+3,py+2+bob,9,9,'#ead6b4');rect(px+2,py+1+bob,10,4,'#252b3b');rect(px+(p.face>0?9:2),py+5+bob,2,2,'#28303d');rect(px+2,py+18+bob,4,4,'#303749');rect(px+8,py+18+bob,4,4,'#303749');rect(px+(p.face>0?0:10),py+10+bob,3,8,'#bb795e');
    if(p.attack>0){const sx=px+(p.face>0?13:-15);ctx.fillStyle='#fff0b4';ctx.beginPath();ctx.moveTo(sx,py+5);ctx.lineTo(sx+p.face*15,py+10);ctx.lineTo(sx+p.face*14,py+13);ctx.lineTo(sx,py+11);ctx.fill();rect(sx+p.face*9,py+6,2,2,'#fff');}ctx.restore();
    // grass accents
    for(let x=Math.floor(camera/37)*37;x<camera+W+30;x+=37){if(Math.sin(x*7)>-.5){rect(x,floorY-4,2,4,'#6e8d77');rect(x+3,floorY-3,1,3,'#91a381');}}
    ctx.restore();
  }
  function drawHUD(){
    const p=player;ctx.fillStyle='#0c1220d9';ctx.fillRect(10,9,142,36);ctx.strokeStyle='#e7d19c55';ctx.strokeRect(10.5,9.5,141,35);for(let i=0;i<3;i++){const x=21+i*17;ctx.fillStyle=i<p.hp?'#eb8d82':'#4c4854';ctx.beginPath();ctx.moveTo(x,18);ctx.bezierCurveTo(x-7,12,x-10,21,x,28);ctx.bezierCurveTo(x+10,21,x+7,12,x,18);ctx.fill();}
    ctx.fillStyle='#d5c6a9';ctx.font='7px monospace';ctx.fillText('RUNAS',72,19);sigils.forEach((s,i)=>{ctx.fillStyle=s.got?'#eecb7b':'#4b4e5b';ctx.fillRect(72+i*15,25,7,7);});ctx.fillStyle='#99e7da';ctx.fillRect(121,25,7,7);if(!relic.got)ctx.fillStyle='#646570';ctx.fillText('✦',120,32);
    const z=zoneAt(p.x);ctx.fillStyle='#111725c9';ctx.fillRect(162,10,156,18);ctx.fillStyle='#d4c398';ctx.font='7px monospace';ctx.fillText(z.name,171,22);
    // map strip
    ctx.fillStyle='#0e1420cc';ctx.fillRect(363,10,106,16);ctx.fillStyle='#3d4952';ctx.fillRect(370,17,91,2);[555,2320,3610].forEach((x,i)=>{ctx.fillStyle=sigils[i].got?'#f0ca7a':'#838391';ctx.fillRect(370+x/worldW*91,15,3,5);});ctx.fillStyle='#f4dfae';ctx.fillRect(370+p.x/worldW*91-1,13,3,9);
    if(boss.alive&&p.x>4150){ctx.fillStyle='#e4ddd0';ctx.font='7px monospace';ctx.fillText('GUARDIÃO',396,36);ctx.fillStyle='#222334';ctx.fillRect(396,40,65,4);ctx.fillStyle='#ce7880';ctx.fillRect(396,40,65*(boss.hp/4),4);}
    if(relic.got&&p.dashCD>0){ctx.fillStyle='#91ddd5';ctx.fillRect(10,51,Math.max(0,1-p.dashCD/.58)*36,2);}
  }
  function render(){ctx.clearRect(0,0,W,H);drawBackground();drawWorld();drawHUD();}
  function frame(now){const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);render();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();
