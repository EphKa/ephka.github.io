// A single frame of player‑input that NetplayJS will replicate.
export class GridInput extends netplayjs.NetplayInput {
  // null = no action this frame; otherwise {sx,sy,ex,ey}
  action = null;

  // the API NetplayJS calls each predictive frame.
  predictNext() {
    // by default keep the same (no speculative clicks)
    return this;
  }
}

// Per‑player input reader.  One instance for each local player.
export class GridInputReader {

  constructor(canvas, gridSize, cellPx) {
    this.canvas = canvas;
    this.gs = gridSize;
    this.cp = cellPx;

    // click/drag bookkeeping identical to your original file
    this.anchor = null;
    canvas.addEventListener("mousemove", e => {
      if (!this.anchor) return;
      const {x,y}=this._toGrid(e);
      this.hover = {x,y};
    });

    canvas.addEventListener("click", e => {
      const {x,y}=this._toGrid(e);
      if (!this.anchor) {
        this.anchor = {x,y};
        this.hover  = null;
      } else {
        const act = {sx:this.anchor.x, sy:this.anchor.y, ex:x, ey:y};
        // Stash this action so getInput() can consume it next frame.
        this.pending = act;
        this.anchor  = this.hover = null;
      }
    });
  }

  _toGrid(evt){
    const rect=this.canvas.getBoundingClientRect();
    return {
      x: Math.round((evt.clientX-rect.left)/this.cp),
      y: Math.round((evt.clientY-rect.top )/this.cp)
    };
  }

  /** Called once every simulation step by NetplayJS. */
  getInput(){
    const inp = new GridInput();
    if (this.pending) {
      inp.action = this.pending;
      this.pending = null;        // consume
    }
    return inp;
  }
}
