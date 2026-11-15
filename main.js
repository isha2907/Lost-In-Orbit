const sc=runtimeScene;
const game=sc.getGame();
const input=game.getInputManager();

const dt=Math.min(
  sc.getElapsedTime()/1000,
  0.05
);

const W=game.getGameResolutionWidth();
const H=game.getGameResolutionHeight();

const get=name=>sc.getObjects(name)[0];

const rocket=get("Rocket");
const explosion=get("Explosion");
const hero=get("Astronaut");
const arrow=get("AimArrow");
const earth=get("Earth");

const start=get("StartButton");
const retry=get("RetryButton");
const status=get("StatusText");
const fade=get("FadeOverlay");

const base=sc.getLayer("");
const ui=sc.getLayer("UI");
const transition=sc.getLayer("Transition");

// ====================================
// SPACE OBJECTS
// ====================================

const names=[
  "Planet","Planet2","Planet3",
  "Planet4","Planet5","Planet6",
  "Planet7","Planet8","Planet9",
  "Planet10",
  "Star","Star2","Star3",
  "Star4","Star5",
  "Asteroid","Asteroid2",
  "Asteroid3","Asteroid4",
  "Asteroid5"
];

const bodies=names.map(get);

const levels=[
  {name:"SPACE ROOKIE",time:2.0},
  {name:"COSMIC EXPLORER",time:1.2},
  {name:"GALACTIC MASTER",time:0.6}
];

// ====================================
// WORLD LAYOUT
// ====================================

// Larger, closer columns.
const BODY_SIZE=210;
const HERO_SIZE=120;

const COL_X=[
  480,930,1380,1830,2280
];

// Three vertical lanes.
const ROW_Y=[
  280,600,920
];

const START_X=90;
const START_Y=600;

const EARTH_X=2700;
const EARTH_Y=600;

// Memory: see all 5 groups.
const MEMORY_ZOOM=Math.min(
  1,
  W/3000,
  H/1300
);

// Gameplay: show ~3 groups.
const PLAY_ZOOM=Math.min(
  1,
  W/1450,
  H/1200
);

// ====================================
// HELPERS
// ====================================

function show(o,on){
  if(o)o.hide(!on);
}

function say(o,t){
  if(o)o.setString(t);
}

function clamp(n,a,b){
  return Math.max(a,Math.min(b,n));
}

function randomInt(a,b){
  return Math.floor(
    a+Math.random()*(b-a+1)
  );
}

function center(o){
  return {
    x:o.getX()+o.getWidth()/2,
    y:o.getY()+o.getHeight()/2
  };
}

function moveCenter(o,x,y){
  if(!o)return;

  o.setPosition(
    x-o.getWidth()/2,
    y-o.getHeight()/2
  );
}

function distance(a,b){
  return Math.hypot(
    a.x-b.x,a.y-b.y
  );
}

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=randomInt(0,i);
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function phase(name){
  s.phase=name;
  s.time=0;
}

// ====================================
// GLOW CONTROL
// ====================================

function glow(o,on){
  if(!o)return;

  try{
    o.enableEffect("PlanetGlow",on);
  }catch(e){}
}

function clearGlows(){
  bodies.forEach(o=>{
    if(!o)return;
    glow(o,false);
    o.setOpacity(255);
  });
}

function highlightOnly(index,time){
  for(let i=0;i<bodies.length;i++){
    const o=bodies[i];
    if(!o)continue;

    const active=i===index;

    glow(o,active);

    o.setOpacity(
      active
        ?Math.round(
          205+50*Math.abs(Math.sin(time*8))
        )
        :255
    );
  }
}

// ====================================
// STATE
// ====================================

const save=sc.getVariables()
  .get("BounceBackHorizontalV18");

let s;

try{
  s=JSON.parse(save.getAsString());
}catch(e){
  s=null;
}

if(!s||s.version!==18){
  const opening=rocket
    ?center(rocket)
    :{x:W/2,y:H/2};

  s={
    version:18,
    phase:"menu",
    time:0,
    level:1,
    columns:[],
    column:0,
    current:-1,
    orbitAngle:Math.PI,
    dragging:false,
    vx:0,
    vy:0,
    flightTime:0,
    mouseWasDown:false,
    cameraX:opening.x,
    cameraY:opening.y,
    zoom:1,
    openingX:opening.x,
    openingY:opening.y,
    rocketX:rocket?rocket.getX():0,
    rocketY:rocket?rocket.getY():0,
    safeX:START_X,
    safeY:START_Y
  };

  [
    explosion,hero,arrow,earth,
    retry,status,fade,...bodies
  ].forEach(o=>show(o,false));

  show(rocket,true);
  show(start,true);

  clearGlows();

  say(start,"START GAME");

  if(start){
    start.setPosition(
      W/2-100,H/2+140
    );
  }

  if(status){
    status.setPosition(25,25);
  }

  if(retry){
    retry.setPosition(
      W/2-100,H/2+100
    );
  }

  base.setCameraX(opening.x);
  base.setCameraY(opening.y);
  base.setCameraZoom(1);
}

// ====================================
// MOUSE INPUT
// ====================================

const down=input.isMouseButtonPressed(0);
const pressed=down&&!s.mouseWasDown;
const released=!down&&s.mouseWasDown;

const zoom=Math.max(
  0.01,base.getCameraZoom()
);

const mouse={
  x:base.getCameraX()+
    (input.getMouseX()-W/2)/zoom,
  y:base.getCameraY()+
    (input.getMouseY()-H/2)/zoom
};

s.time+=dt;

// ====================================
// GENERATE FIVE GROUPS
// ====================================

function generateColumns(){
  const pool=shuffle(
    Array.from({length:20},(_,i)=>i)
  );

  bodies.forEach(o=>{
    show(o,false);
    glow(o,false);
  });

  const columns=[];

  for(let c=0;c<5;c++){
    const selected=pool.slice(
      c*3,c*3+3
    );

    const correctSlot=randomInt(0,2);

    for(let r=0;r<3;r++){
      const body=bodies[selected[r]];
      if(!body)continue;

      body.setWidth(BODY_SIZE);
      body.setHeight(BODY_SIZE);

      moveCenter(
        body,COL_X[c],ROW_Y[r]
      );

      body.setOpacity(255);
      glow(body,false);
      show(body,true);
    }

    columns.push({
      objects:selected,
      correct:selected[correctSlot]
    });
  }

  return columns;
}

// ====================================
// ORBIT
// ====================================

function orbit(){
  if(s.current<0||!hero)return;

  const body=bodies[s.current];
  if(!body)return;

  const c=center(body);
  const radius=BODY_SIZE/2+70;

  moveCenter(
    hero,
    c.x+Math.cos(s.orbitAngle)*radius,
    c.y+Math.sin(s.orbitAngle)*radius
  );

  hero.setAngle(
    s.orbitAngle*180/Math.PI+90
  );
}

// ====================================
// START LEVEL
// ====================================

function startLevel(level){
  s.level=level;
  s.columns=generateColumns();

  s.column=0;
  s.current=-1;
  s.dragging=false;
  s.vx=0;
  s.vy=0;

  s.safeX=START_X;
  s.safeY=START_Y;

  if(hero){
    hero.setWidth(HERO_SIZE);
    hero.setHeight(HERO_SIZE);

    moveCenter(
      hero,START_X,START_Y
    );

    hero.setAngle(0);
    hero.setOpacity(255);
    show(hero,true);
  }

  if(earth){
    earth.setWidth(270);
    earth.setHeight(270);

    moveCenter(
      earth,EARTH_X,EARTH_Y
    );

    show(earth,true);
  }

  [
    rocket,explosion,start,
    retry,arrow,fade
  ].forEach(o=>show(o,false));

  show(status,true);
  clearGlows();

  s.cameraX=1400;
  s.cameraY=600;
  s.zoom=MEMORY_ZOOM;

  base.setCameraX(s.cameraX);
  base.setCameraY(s.cameraY);
  base.setCameraZoom(s.zoom);

  say(
    status,
    "LEVEL "+level+" - "+
    levels[level-1].name
  );

  phase("intro");
}

// ====================================
// LOSE
// ====================================

function lose(index){
  clearGlows();
  phase("lost");

  show(hero,false);
  show(arrow,false);
  show(retry,true);

  say(status,"WRONG OBJECT!");
  say(retry,"TRY AGAIN");

  const target=index<0
    ?earth
    :bodies[index];

  if(explosion&&target){
    const c=center(target);
    moveCenter(explosion,c.x,c.y);

    if(explosion.setAnimationFrame){
      explosion.setAnimationFrame(0);
    }

    show(explosion,true);
  }
}

// ====================================
// FINISH
// ====================================

function finish(){
  clearGlows();
  show(arrow,false);
  show(retry,true);

  if(s.level<3){
    phase("complete");
    say(status,"LEVEL COMPLETE!");
    say(retry,"NEXT LEVEL");
  }else{
    phase("won");
    say(status,"YOU REACHED EARTH!");
    say(retry,"PLAY AGAIN");
  }
}

// ====================================
// ROCKET OPENING
// ====================================

if(s.phase==="menu"){
  show(rocket,true);
  show(start,true);

  if(pressed){
    show(start,false);
    phase("shake");
  }
}

else if(s.phase==="shake"){
  show(rocket,true);

  if(rocket){
    rocket.setX(
      s.rocketX+Math.sin(s.time*45)*8
    );

    rocket.setY(
      s.rocketY+Math.cos(s.time*38)*5
    );

    rocket.setAngle(
      Math.sin(s.time*30)*9
    );
  }

  if(s.time>1.6){
    if(explosion&&rocket){
      const c=center(rocket);
      moveCenter(explosion,c.x,c.y);

      if(explosion.setAnimationFrame){
        explosion.setAnimationFrame(0);
      }

      show(explosion,true);
    }

    show(rocket,false);
    phase("rocketExplosion");
  }
}

else if(s.phase==="rocketExplosion"){
  if(s.time>0.65){
    if(hero){
      moveCenter(
        hero,s.openingX,s.openingY
      );
      hero.setAngle(0);
      show(hero,true);
    }

    phase("escape");
  }
}

else if(s.phase==="escape"){
  show(explosion,false);

  if(hero){
    hero.setX(hero.getX()+135*dt);
    hero.setY(hero.getY()-90*dt);
    hero.setAngle(
      hero.getAngle()+250*dt
    );
  }

  if(s.time>1.8){
    show(hero,false);
    show(fade,true);
    phase("blackout");
  }
}

else if(s.phase==="blackout"){
  if(s.time>0.65){
    show(fade,false);
    startLevel(1);
  }
}

// ====================================
// MEMORY
// ====================================

else if(s.phase==="intro"){
  clearGlows();

  say(
    status,
    "MEMORISE THE CORRECT OBJECTS!"
  );

  if(s.time>1.5){
    phase("memory");
  }
}

else if(s.phase==="memory"){
  const duration=levels[s.level-1].time;
  const index=Math.floor(
    s.time/duration
  );

  if(index<5){
    const correct=
      s.columns[index].correct;

    highlightOnly(correct,s.time);

    say(
      status,
      "MEMORISE "+(index+1)+" / 5"
    );
  }else{
    clearGlows();
    phase("ready");
    say(status,"MEMORY COMPLETE!");
  }
}

// ====================================
// READY
// ====================================

else if(s.phase==="ready"){
  clearGlows();
  show(hero,true);

  if(s.time>1.3){
    phase("aim");
    say(status,"DRAG BACK TO JUMP!");
  }
}

// ====================================
// AIMING
// ====================================

else if(s.phase==="aim"){
  clearGlows();
  show(hero,true);

  if(s.current>=0&&!s.dragging){
    s.orbitAngle+=0.5*dt;
    orbit();
  }

  if(hero){
    const c=center(hero);

    // Click within a generous
    // radius of the astronaut.
    if(
      pressed&&
      distance(c,mouse)<220
    ){
      s.dragging=true;
    }

    // Arrow ALWAYS visible while
    // waiting to launch.
    if(arrow){
      show(arrow,true);

      arrow.setOpacity(255);
      arrow.setWidth(200);
      arrow.setHeight(55);

      arrow.setAngle(0);

      moveCenter(
        arrow,c.x+145,c.y
      );
    }

    if(s.dragging){
      const dx=c.x-mouse.x;
      const dy=c.y-mouse.y;

      const length=Math.hypot(dx,dy);
      const power=clamp(length,0,350);
      const angle=Math.atan2(dy,dx);

      if(arrow){
        const size=Math.max(
          120,power
        );

        arrow.setWidth(size);
        arrow.setHeight(55);

        arrow.setAngle(
          angle*180/Math.PI
        );

        moveCenter(
          arrow,
          c.x+Math.cos(angle)*size/2,
          c.y+Math.sin(angle)*size/2
        );
      }

      say(
        status,
        "COLUMN "+(s.column+1)+
        " | POWER "+Math.round(power)
      );

      if(released){
        s.dragging=false;
        show(arrow,false);

        if(length>20){
          const speed=clamp(
            length*7,600,2300
          );

          s.vx=dx/length*speed;
          s.vy=dy/length*speed;
          s.flightTime=0;

          s.safeX=c.x;
          s.safeY=c.y;

          phase("flying");
          say(
            status,
            "REACH THE CORRECT OBJECT!"
          );
        }
      }
    }
  }
}

// ====================================
// FLYING
// ====================================

else if(s.phase==="flying"){
  show(hero,true);
  show(arrow,false);

  s.flightTime+=dt;

  if(hero){
    const previous=center(hero);

    hero.setX(
      hero.getX()+s.vx*dt
    );

    hero.setY(
      hero.getY()+s.vy*dt
    );

    hero.setAngle(
      hero.getAngle()+180*dt
    );

    const current=center(hero);

    if(s.flightTime>0.12){
      let hit=-1;
      let bestT=Infinity;

      const dx=current.x-previous.x;
      const dy=current.y-previous.y;
      const len2=dx*dx+dy*dy;

      for(let i=0;i<bodies.length;i++){
        const body=bodies[i];

        if(
          !body||
          body.isHidden()||
          i===s.current
        )continue;

        const c=center(body);
        const radius=BODY_SIZE/2+22;

        const t=len2>0
          ?clamp(
            ((c.x-previous.x)*dx+
             (c.y-previous.y)*dy)/len2,
            0,1
          )
          :0;

        const nearest={
          x:previous.x+dx*t,
          y:previous.y+dy*t
        };

        if(
          distance(nearest,c)<radius&&
          t<bestT
        ){
          hit=i;
          bestT=t;
        }
      }

      if(hit>=0){
        const column=s.columns[s.column];

        if(column&&hit===column.correct){
          s.current=hit;
          s.column++;

          const c=center(bodies[hit]);

          s.orbitAngle=Math.atan2(
            current.y-c.y,
            current.x-c.x
          );

          phase("aim");

          say(
            status,
            s.column===5
              ?"ALL FIVE CORRECT! REACH EARTH!"
              :"CORRECT! NEXT COLUMN "+(s.column+1)
          );
        }else{
          lose(hit);
        }
      }

      if(s.phase==="flying"&&earth){
        const c=center(earth);

        const radius=Math.max(
          earth.getWidth(),
          earth.getHeight()
        )/2+25;

        const t=len2>0
          ?clamp(
            ((c.x-previous.x)*dx+
             (c.y-previous.y)*dy)/len2,
            0,1
          )
          :0;

        const nearest={
          x:previous.x+dx*t,
          y:previous.y+dy*t
        };

        if(distance(nearest,c)<radius){
          if(s.column===5){
            finish();
          }else{
            lose(-1);
          }
        }
      }
    }

    if(
      s.phase==="flying"&&
      s.flightTime>3.5
    ){
      moveCenter(
        hero,s.safeX,s.safeY
      );

      phase("aim");
      say(status,"MISSED! TRY AGAIN!");
    }
  }
}

// ====================================
// RETRY / NEXT LEVEL
// ====================================

else if(
  s.phase==="lost"||
  s.phase==="complete"||
  s.phase==="won"
){
  if(pressed){
    if(s.phase==="complete"){
      startLevel(s.level+1);
    }else if(s.phase==="won"){
      startLevel(1);
    }else{
      startLevel(s.level);
    }
  }
}

// ====================================
// CAMERA — LEFT TO RIGHT
// ====================================

const opening=[
  "menu","shake","rocketExplosion",
  "escape","blackout"
].includes(s.phase);

if(opening){
  s.cameraX=s.openingX;
  s.cameraY=s.openingY;
  s.zoom=1;
}

else if(
  s.phase==="intro"||
  s.phase==="memory"
){
  s.cameraX=1400;
  s.cameraY=600;
  s.zoom=MEMORY_ZOOM;
}

else{
  // Camera keeps astronaut on
  // the left with columns ahead.

  let targetX;

  if(s.column===0){
    targetX=480;
  }else if(s.column===1){
    targetX=930;
  }else if(s.column===2){
    targetX=1380;
  }else if(s.column===3){
    targetX=1830;
  }else if(s.column===4){
    targetX=2280;
  }else{
    targetX=2600;
  }

  // Follow the astronaut in flight
  // without leaving it behind.
  if(hero&&s.phase==="flying"){
    const c=center(hero);
    targetX=Math.max(
      targetX,c.x+250
    );
  }

  const smooth=Math.min(1,dt*4);

  s.cameraX+=
    (targetX-s.cameraX)*smooth;

  s.cameraY+=
    (600-s.cameraY)*smooth;

  s.zoom+=
    (PLAY_ZOOM-s.zoom)*smooth;
}

base.setCameraX(s.cameraX);
base.setCameraY(s.cameraY);
base.setCameraZoom(s.zoom);

// Fixed interface.
ui.setCameraX(W/2);
ui.setCameraY(H/2);
ui.setCameraZoom(1);

// Fixed transition.
transition.setCameraX(W/2);
transition.setCameraY(H/2);
transition.setCameraZoom(1);

// ====================================
// SAVE STATE
// ====================================

s.mouseWasDown=down;

save.setString(
  JSON.stringify(s)
);
