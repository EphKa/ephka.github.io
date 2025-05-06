import { GridInputReader, preview } from './grid‑input.js';

/* Board constants */
export const gridSize = 21;
export const cellPx   = 20;

/* ───── helper functions (unchanged logic) ───── */
const isStraight3 = (sx,sy,ex,ey)=>{
  const dx=Math.abs(ex-sx), dy=Math.abs(ey-sy);
  return (dx===3&&dy===0)||(dx===0&&dy===3);
};

const interior = (sx,sy,ex,ey)=> sx===ex
  ? [{x:sx, y:Math.min(sy,ey)+1},{x:sx, y:Math.min(sy,ey)+2}]
  : [{x:Math.min(sx,ex)+1, y:sy},{x:Math.min(sx,ex)+2, y:sy}];

const noCross = (st,sx,sy,ex,ey)=>{
  const ni = interior(sx,sy,ex,ey);
  return !st.lines.some(ln =>
    interior(ln.sx,ln.sy,ln.ex,ln.ey).some(a =>
      ni.some(b=>a.x===b.x && a.y===b.y)));
};

const touches = (st,sx,sy,ex,ey)=>
  st.lines.length===0 || st.nodes[sy][sx] || st.nodes[ey][ex];

function occupy(st,sx,sy,ex,ey,p){
  st.lines.push({sx,sy,ex,ey,player:p});

  if(sx===ex){
    const x=sx, y0=Math.min(sy,ey);
    for(let d=0;d<3;d++){
      st.vert[y0+d][x]=true;
      st.nodes[y0+d][x]=st.nodes[y0+d+1][x]=true;
    }
  }else{
    const y=sy, x0=Math.min(sx,ex);
    for(let d=0;d<3;d++){
      st.horiz[y][x0+d]=true;
      st.nodes[y][x0+d]=st.nodes[y][x0+d+1]=true;
    }
  }
  fillTerritories(st,p);
}

function fillTerritories(st,p){
  const visited = Array.from({length:gridSize-1},()=>Array(gridSize-1).fill(false));
  const q=[];

  for(let i=0;i<gridSize-1;i++)
    [[0,i],[gridSize-2,i],[i,0],[i,gridSize-2]].forEach(([x,y])=>{
      if(!visited[y][x]){ visited[y][x]=true; q.push({x,y}); }
    });

  const pass=(x,y,nx,ny)=> x===nx
    ? !st.horiz[Math.min(y,ny)+1][x]
    : !st.vert [y][Math.min(x,nx)+1];

  while(q.length){
    const {x,y}=q.shift();
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
      const nx=x+dx, ny=y+dy;
      if(nx>=0&&nx<gridSize-1&&ny>=0&&ny<gridSize-1&&!visited[ny][nx]&&pass(x,y,nx,ny)){
        visited[ny][nx]=true; q.push({x:nx,y:ny});
      }
    });
  }

  for(let y=0;y<gridSize-1;y++)
    for(let x=0;x<gridSize-1;x++)
      if(!visited[y][x] && st.cells[y][x]===0) st.cells[y][x]=p;
}

/* ───── NetplayJS Game class (also used for local) ───── */
export class GridTerritory extends netplayjs.Game{

  static timestep = 1000/60;                    // 60 fps
  static numPlayers = {min:2,max:2};

  constructor(canvas){
    super();
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.initState();
  }

  initState(){
    this.turn = 1;
    this.lines = [];
    this.nodes = Array.from({length:gridSize},()=>Array(gridSize)   .fill(false));
    this.horiz = Array.from({length:gridSize},()=>Array(gridSize-1).fill(false));
    this.vert  = Array.from({length:gridSize-1},()=>Array(gridSize).fill(false));
    this.cells = Array.from({length:gridSize-1},()=>Array(gridSize-1).fill(0));
  }

  tick(playerInputs){
    for(const [pl,input] of playerInputs.entries()){
      if(!input || !input.action || pl.getID()+1!==this.turn) continue;
      const {sx,sy,ex,ey} = input.action;
      if(isStraight3(sx,sy,ex,ey) &&
         touches(this,sx,sy,ex,ey) &&
         noCross(this,sx,sy,ex,ey)){
        occupy(this,sx,sy,ex,ey,this.turn);
        this.turn = this.turn===1?2:1;
      }
    }
  }

  draw(){
    const ctx=this.ctx;
    ctx.clearRect(0,0,420,420);

    /* grid */
    ctx.strokeStyle='#ddd'; ctx.lineWidth=1;
    for(let i=0;i<=gridSize;i++){
      const p=i*cellPx;
      ctx.beginPath();ctx.moveTo(p,0);   ctx.lineTo(p,420); ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,p);   ctx.lineTo(420,p); ctx.stroke();
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
