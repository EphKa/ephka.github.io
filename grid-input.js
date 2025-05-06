/* ─────── Input replication helper ─────── */
export const preview = { anchor:null, hover:null };   // cosmetic only

/* One frame of replicated input */
export class GridInput extends netplayjs.NetplayInput {
  constructor(){ super(); this.action = null; }
  predictNext(){ return this; }
}

/* Reads local mouse events & produces GridInput */
export class GridInputReader {
  constructor(canvas, gridSize, cellPx){
    this.canvas = canvas;
    this.gs     = gridSize;
    this.cp     = cellPx;
    this.pending = null;
    this.anchor  = null;
    this.hover   = null;

    const toGrid = evt=>{
      const r = canvas.getBoundingClientRect();
      return {
        x: Math.round((evt.clientX - r.left)/this.cp),
        y: Math.round((evt.clientY - r.top )/this.cp)
      };
    };

    canvas.addEventListener('mousemove',e=>{
      if(!this.anchor) return;
      this.hover = toGrid(e);
      preview.hover = this.hover;
    });

    canvas.addEventListener('click',e=>{
      const g = toGrid(e);

      if(!this.anchor){                       // first click
        this.anchor = g;
        preview.anchor = g; preview.hover = null;
        return;
      }
      // second click → commit line
      this.pending = { sx:this.anchor.x, sy:this.anchor.y, ex:g.x, ey:g.y };
      this.anchor = this.hover = null;
      preview.anchor = preview.hover = null;
    });
  }

  getInput(){
    const inp = new GridInput();
    if(this.pending){ inp.action = this.pending; this.pending = null; }
    return inp;
  }
}
