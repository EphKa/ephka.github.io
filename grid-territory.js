import {GridInputReader, preview} from './grid‑input.js';

/*  ───────────────  Board constants  ───────────────  */
const gridSize = 21;
const cellPx   = 20;

/*  ───────────────  Pure helper functions (unchanged from original) ───────────────  */

const isStraight3 = (sx,sy,ex,ey)=>{
  const dx = Math.abs(ex-sx), dy = Math.abs(ey-sy);
  return (dx===3 && dy===0) || (dx===0 && dy===3);
};

const interior = (sx,sy,ex,ey) => sx===ex
  ? [{x:sx, y:Math.min(sy,ey)+1}, {x:sx, y:Math.min(sy,ey)+2}]
  : [{x:Math.min(sx,ex)+1, y:sy}, {x:Math.min(sx,ex)+2, y:sy}];

const noCross = (state,sx,sy,ex,ey)=>{
  const ni = interior(sx,sy,ex,ey);
  return !state.lines.some(ln =>
    interior(ln.sx,ln.sy,ln.ex,ln.ey).some(a =>
      ni.some(b => a.x===b.x && a.y===b.y)
    )
  );
};

const touches = (state,sx,sy,ex,ey)=>
  state.lines.length===0 || state.nodes[sy][sx] || state.nodes[ey][ex];

function occupy(state,sx,sy,ex,ey,p){
  state.lines.push({sx,sy,ex,ey,player:p});

  if(sx===ex){                              // vertical segment
    const x = sx, y0 = Math.min(sy,ey);
    for(let d=0; d<3; d++){
      state.vert[y0+d][x] = true;
      state.nodes[y0+d][x] = state.nodes[y0+d+1][x] = true;
    }
  }else{                                    // horizontal segment
    const y = sy, x0 = Math.min(sx,ex);
    for(let d=0; d<3; d++){
      state.horiz[y][x0+d] = true;
      state.nodes[y][x0+d] = state.nodes[y][x0+d+1] = true;
    }
  }
  fillTerritories(state,p);
}

function fillTerritories(state,p){
  const visited = Array.from({length:gridSize-1},()=>Array(gridSize-1).fill(false));
  const q = [];

  // flood‑fill from outside border
  for(let i=0;i<gridSize-1;i++)
    [[0,i],[gridSize-2,i],[i,0],[i,gridSize-2]]
    .forEach(([x,y])=>{
      if(!visited[y][x]){ visited[y][x]=true; q.push({x,y}); }
    });

  const pass = (x,y,nx,ny)=> x===nx
    ? !state.horiz[Math.min(y,ny)+1][x]
    : !state.vert [y][Math.min(x,nx)+1];

  while(q.length){
    const {x,y} = q.shift();
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
      const nx=x+dx, ny=y+dy;
      if(nx>=0&&nx<gridSize-1 && ny>=0&&ny<gridSize-1 &&
         !visited[ny][nx] && pass(x,y,nx,ny)){
        visited[ny][nx]=true; q.push({x:nx,y:ny});
      }
    });
  }

  for(let y=0;y<gridSize-1;y++)
    for(let x=0;x<gridSize-1;x++)
      if(!visited[y][x] && state.cells[y][x]===0)
        state.cells[y][x]=p;
}

/*  ───────────────  NetplayJS Game class  ───────────────  */

class GridTerritory extends netplayjs.Game {

  /* NetplayJS metadata */
  static timestep   = 1000/60;               // 60 fps
  static numPlayers = {min:2,max:2};

  constructor(canvas){
    super();
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.initState();
  }

  /* -------- deterministic game‑state reset -------- */
  initState(){
    this.turn = 1;                            // player 1 starts
    this.lines = [];

    this.nodes = Array.from({length:gridSize},()=>Array(gridSize)    .fill(false));
    this.horiz = Array.from({length:gridSize},()=>Array(gridSize-1) .fill(false));
    this.vert  = Array.from({length:gridSize-1},()=>Array(gridSize) .fill(false));
    this.cells = Array.from({length:gridSize-1},()=>Array(gridSize-1).fill(0));
  }

  /* -------- called by NetplayJS each simulation step -------- */
  tick(playerInputs){
    for(const [player,input] of playerInputs.entries()){
      if(!input || !input.action) continue;          // no move

      // only process if it's this player's turn
      if(player.getID()+1 !== this.turn) continue;

      const {sx,sy,ex,ey} = input.action;
      if(isStraight3(sx,sy,ex,ey) &&
         touches(this,sx,sy,ex,ey) &&
         noCross (this,sx,sy,ex,ey))
      {
        occupy(this,sx,sy,ex,ey,this.turn);
        this.turn = this.turn===1 ? 2 : 1;
      }
    }
  }

  /* -------- draw current state to the canvas -------- */
  draw(){
    const ctx = this.ctx;

    ctx.clearRect(0,0,420,420);

    /* grid */
    ctx.strokeStyle='#ddd'; ctx.lineWidth=1;
    for(let i=0;i<=gridSize;i++){
      const p=i*cellPx;
      ctx.beginPath(); ctx.moveTo(p,0);   ctx.lineTo(p,420); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,p);   ctx.lineTo(420,p); ctx.stroke();
    }

    /* filled territory */
    for(let y=0;y<gridSize-1;y++)
      for(let x=0;x<gridSize-1;x++)
        if(this.cells[y][x]){
          ctx.globalAlpha=.2;
          ctx.fillStyle=this.cells[y][x]===1?'red':'blue';
          ctx.fillRect(x*cellPx,y*cellPx,cellPx,cellPx);
          ctx.globalAlpha=1;
        }

    /* permanent lines */
    for(const ln of this.lines){
      ctx.beginPath();
      ctx.lineWidth=4;
      ctx.strokeStyle=ln.player===1?'red':'blue';
      ctx.moveTo(ln.sx*cellPx,ln.sy*cellPx);
      ctx.lineTo(ln.ex*cellPx,ln.ey*cellPx);
      ctx.stroke();
    }

    /* dashed preview (local only) */
    if(preview.anchor && preview.hover){
      ctx.beginPath();
      ctx.setLineDash([5,5]); ctx.lineWidth=2; ctx.strokeStyle='gray';
      ctx.moveTo(preview.anchor.x*cellPx, preview.anchor.y*cellPx);
      ctx.lineTo(preview.hover .x*cellPx, preview.hover .y*cellPx);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

/*  ───────────────  Bootstrapping  ───────────────  */

const canvas = document.getElementById('game');
const info   = document.getElementById('info');
const debug  = document.getElementById('debug');

const wrapper = new netplayjs.RollbackWrapper(GridTerritory,{
  canvas,
  createInputReader: () => new GridInputReader(canvas,gridSize,cellPx),

  onStatus: s=>{
    if(s.type==='lobby-created')
      info.textContent = `Share link with friend → ${s.url}`;
    else if(s.type==='player-joined')
      info.textContent = 'Opponent connected – game on!';
    else if(s.type==='synchronising')
      info.textContent = 'Synchronising…';
  },
  onPlayerTurn: p=>{
    info.textContent = `Turn: Player ${p.getID()+1}`;
  },
  onError: err=>{
    debug.textContent = err;
  }
});

wrapper.start();

/* Restart button simply resets deterministic state and re‑syncs peers */
document.getElementById('restart').onclick = () => wrapper.reset();
