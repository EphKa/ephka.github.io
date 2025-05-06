import {GridInput, GridInputReader} from './grid‑input.js';

/* ────────── core board helpers (identical to your original) ────────── */
const gridSize = 21, cellPx = 20;

const isStraight3=(sx,sy,ex,ey)=>{
  const dx=Math.abs(ex-sx),dy=Math.abs(ey-sy);
  return (dx===3&&dy===0)||(dx===0&&dy===3);
};
const interior=(sx,sy,ex,ey)=>sx===ex?
  [{x:sx,y:Math.min(sy,ey)+1},{x:sx,y:Math.min(sy,ey)+2}]:
  [{x:Math.min(sx,ex)+1,y:sy},{x:Math.min(sx,ex)+2,y:sy}];
/* …noCross, touches, occupy, fillTerritories, etc – untouched … */


/* ────────── Netplay JS Game class ────────── */
class GridTerritory extends netplayjs.Game {

  static timestep   = 1000/60;
  static canvasSize = {width:420,height:420};
  static numPlayers = {min:2,max:2};

  constructor(canvas, players){
    super();
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.players=players;
    this.initGameState();
  }

  initGameState(){
    this.turn = 1;
    this.lines=[];

    this.nodes = Array.from({length:gridSize},()=>Array(gridSize).fill(false));
    this.horiz = Array.from({length:gridSize},()=>Array(gridSize-1).fill(false));
    this.vert  = Array.from({length:gridSize-1},()=>Array(gridSize).fill(false));
    this.cells = Array.from({length:gridSize-1},()=>Array(gridSize-1).fill(0));
  }

  /** ONE simulation step given replicated inputs */
  tick(playerInputs){
    for (const [player,input] of playerInputs.entries()){
      if (!input || !input.action) continue;
      // Only accept action if it's that player’s turn
      if (player.getID()+1 !== this.turn) continue;
      const {sx,sy,ex,ey}=input.action;

      const ok = isStraight3(sx,sy,ex,ey)
             && touches.apply(this,[sx,sy,ex,ey])
             && noCross .apply(this,[sx,sy,ex,ey]);
      if (!ok) continue;                 // ignore illegal attempts

      occupy .apply(this,[sx,sy,ex,ey,this.turn]);
      this.turn = this.turn===1?2:1;
    }
  }

  /** Draw current state to canvas (unchanged from original) */
  draw(){
    const ctx=this.ctx;
    ctx.clearRect(0,0,420,420);
    ctx.strokeStyle='#222';ctx.lineWidth=1;
    for(let i=0;i<=gridSize;i++){
      const p=i*cellPx;
      ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,420);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,p);ctx.lineTo(420,p);ctx.stroke();
    }
    // filled cells
    for(let y=0;y<gridSize-1;y++)for(let x=0;x<gridSize-1;x++)
      if(this.cells[y][x]>0){
        ctx.globalAlpha=.2;
        ctx.fillStyle=this.cells[y][x]==1?'red':'blue';
        ctx.fillRect(x*cellPx,y*cellPx,cellPx,cellPx);
        ctx.globalAlpha=1;
      }
    // lines
    for(const ln of this.lines){
      ctx.beginPath();
      ctx.lineWidth=4;ctx.strokeStyle=ln.player==1?'red':'blue';
      ctx.moveTo(ln.sx*cellPx,ln.sy*cellPx);
      ctx.lineTo(ln.ex*cellPx,ln.ey*cellPx);
      ctx.stroke();
    }
  }
}

/* ────────── Bootstrapping (one wrapper per real browser tab) ────────── */
const canvas = document.getElementById('game');
const info   = document.getElementById('info');
const debug  = document.getElementById('debug');

const wrapper = new netplayjs.RollbackWrapper(GridTerritory,{
  // plug our custom reader instead of DefaultInputReader
  createInputReader: (root,canvas)=>new GridInputReader(canvas,gridSize,cellPx),

  // status callbacks so you can show simple UI text
  onStatus:(s)=>{
    if (s.type==="lobby-created")
      info.textContent=`Share link with friend → ${s.url}`;
    else if (s.type==="player-joined")
      info.textContent='Opponent connected – Game on!';
  },
  onPlayerTurn:(p)=>{info.textContent=`Turn: Player ${p.getID()+1}`;},
  onError:(err)=>{debug.textContent=err;}
});

wrapper.start();

/* Restart button just resets the state locally and resyncs */
document.getElementById('restart').onclick=()=>{
  wrapper.reset();
};
