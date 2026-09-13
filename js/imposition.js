"use strict";

/* formats + fold / imposition.
   The last fold is the one that makes the spine, so every format has to end on a
   vertical fold — otherwise the leaves end up joined at the head and the quire
   opens like a calendar instead of a book. */
export const FORMATS = {
  folio :{name:"Folio",       sym:"2&deg;", C:2,R:1, folds:[["V","LR"]]},
  quarto:{name:"Quarto",      sym:"4&deg;", C:2,R:2, folds:[["H","TB"],["V","LR"]]},
  octavo:{name:"Octavo",      sym:"8&deg;", C:4,R:2, folds:[["V","LR"],["H","TB"],["V","LR"]]},
  sexto :{name:"Sextodecimo", sym:"16&deg;",C:4,R:4, folds:[["H","TB"],["V","LR"],["H","TB"],["V","LR"]]}
};

/* how to say each crease out loud — the order and the direction both matter,
   so the theatre spells them out rather than just naming the axis */
export const FOLD_TEXT = {
  "V:LR":"left half over onto the right",
  "V:RL":"right half over onto the left",
  "H:TB":"top half down onto the bottom",
  "H:BT":"bottom half up onto the top"
};

/* turning a flap over reverses its layers and shows the other side of each one */
const turn=(p,rot)=>p.slice().reverse().map(l=>({r:l.r,c:l.c,flip:(l.flip+rot)%360,
  face:l.face==="front"?"back":"front"}));

/* fold the sheet one crease at a time, keeping every intermediate stack */
export function foldSteps(C,R,folds){
  let grid=[],h=R,w=C;
  for(let r=0;r<R;r++){grid.push([]);for(let c=0;c<C;c++)grid[r].push([{r,c,flip:0,face:"front"}]);}
  const steps=[grid];
  for(const [ax,dir] of folds){
    if(ax==="V"){
      const nw=w/2,ng=[];
      for(let r=0;r<h;r++){ng.push([]);
        for(let k=0;k<nw;k++){
          const st=dir==="RL"?grid[r][k]:grid[r][nw+k];
          const mv=dir==="RL"?grid[r][w-1-k]:grid[r][nw-1-k];
          ng[r].push(turn(mv,0).concat(st));}}
      grid=ng;w=nw;
    }else{
      const nh=h/2,ng=[];
      for(let k=0;k<nh;k++){ng.push([]);
        for(let c=0;c<w;c++){
          const st=dir==="BT"?grid[k][c]:grid[nh+k][c];
          const mv=dir==="BT"?grid[h-1-k][c]:grid[nh-1-k][c];
          ng[k].push(turn(mv,180).concat(st));}}
      grid=ng;h=nh;
    }
    steps.push(grid);
  }
  return steps;
}

export function simulate(C,R,folds){
  const steps=foldSteps(C,R,folds);
  return steps[steps.length-1][0][0];
}

/* where each cell sits in the pile after k folds — the theatre needs this to
   draw the layers in the right order */
function depthMap(grid){
  const depth=Object.create(null);
  let layers=1;
  for(const row of grid) for(const st of row){
    layers=st.length;
    st.forEach((l,i)=>{ depth[l.r+","+l.c]=i; });
  }
  return {depth, layers};
}

export function impose(key){
  const f=FORMATS[key], steps=foldSteps(f.C,f.R,f.folds);
  const stack=steps[steps.length-1][0][0];
  const mk=()=>Array.from({length:f.R},()=>Array(f.C).fill(null));
  const A=mk(),B=mk();
  // top of the pile is the outermost leaf, so it carries pages 1/2
  stack.forEach((l,i)=>{
    const p1=2*i+1,p2=2*i+2;
    if(l.face==="front"){A[l.r][l.c]={page:p1,rot:l.flip};B[l.r][f.C-1-l.c]={page:p2,rot:l.flip};}
    else                {B[l.r][f.C-1-l.c]={page:p1,rot:l.flip};A[l.r][l.c]={page:p2,rot:l.flip};}
  });
  const aOne=A.flat().some(x=>x.page===1);
  return {outer:aOne?A:B, inner:aOne?B:A, sideA:A, sideB:B,
          C:f.C,R:f.R,leaves:f.C*f.R,folds:f.folds, stacks:steps.map(depthMap)};
}
