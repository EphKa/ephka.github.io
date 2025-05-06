/*  ─────────────   Input replication helper for NetplayJS   ───────────── */

export const preview = { anchor:null, hover:null };   // cosmetic only

// One frame of replicated input ------------------------------------------------
export class GridInput extends netplayjs.NetplayInput {
  constructor(){ super(); this.action = null; }       // {sx,sy,ex,ey} or null
  predictNext(){ return this; }                       // no speculative changes
}

// Reads local mouse events and produces GridInput each simulation step ----------
export class GridInputReader {

  constructor(canvas, gridSize, cellPx){
    this.canvas = canvas;
    this.gs  = gridSize;
    this.cp  = cellPx;
    this.pending = null;
    this.anchor  = null;
    this.hover   = null;

    // convert pixel coord to grid index
    const toGrid = evt=>{
      const r = canvas.getBoundingClientRect();
      return {
        x: Math.round((evt.clientX - r.left) / this.cp),
        y: Math.round((evt.clientY - r.top ) / this.cp)
      };
    };

    canvas.addEventListener('mousemove', e=>{
      if(!this.anchor) return;
      this.hover = toGrid(e);
      preview.hover = this.hover;
    });

    canvas.addEventListener('click', e=>{
      const g = toGrid(e);

      // 1st click: set anchor
      if(!this.anchor){
        this.anchor = g;
        preview.anchor = this.anchor;
        preview.hover  = null;
        return;
      }

      // 2nd click: commit segment
      this.pending = { sx:this.anchor.x, sy:this.anchor.y, ex:g.x, ey:g.y };
      this.anchor  = this.hover = null;
      preview.anchor = preview.hover = null;
    });
  }

  /* NetplayJS calls this once per sim‑step */
  getInput(){
    const inp = new GridInput();
    if(this.pending){
      inp.action = this.pending;
      this.pending = null;          // consume
    }
    return inp;
  }
}
