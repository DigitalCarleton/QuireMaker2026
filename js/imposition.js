"use strict";

/* formats & fold simulation  */
export const FORMATS = {
  folio :{name:"Folio",       sym:"2&deg;", C:2,R:1, folds:[["V","LR"]]},
  quarto:{name:"Quarto",      sym:"4&deg;", C:2,R:2, folds:[["H","TB"],["V","LR"]]},
  octavo:{name:"Octavo",      sym:"8&deg;", C:4,R:2, folds:[["V","LR"],["H","TB"],["V","LR"]]},
  sexto :{name:"Sextodecimo", sym:"16&deg;",C:4,R:4, folds:[["V","LR"],["H","TB"],["V","LR"],["H","TB"]]}
};

export function simulate(C,R,folds){
  let grid=[],h=R,w=C;
  for(let r=0;r<R;r++){grid.push([]);for(let c=0;c<C;c++)grid[r].push([{r,c,flip:0,face:"front"}]);}
  const turn=(p,rot)=>p.slice().reverse().map(l=>({r:l.r,c:l.c,flip:(l.flip+rot)%360,
    face:l.face==="front"?"back":"front"}));
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
  }
  return grid[0][0];
}

export function impose(key){
  const f=FORMATS[key], stack=simulate(f.C,f.R,f.folds);
  const mk=()=>Array.from({length:f.R},()=>Array(f.C).fill(null));
  const A=mk(),B=mk();
  // leafOrder: outermost leaf first (pages 1/2), innermost last — matches a real gathering
  const leafOrder=stack.map((l,i)=>({
    r:l.r, c:l.c, face:l.face, flip:l.flip,
    leaf:i, p1:2*i+1, p2:2*i+2
  }));
  stack.forEach((l,i)=>{
    const p1=2*i+1,p2=2*i+2;
    if(l.face==="front"){A[l.r][l.c]={page:p1,rot:l.flip};B[l.r][f.C-1-l.c]={page:p2,rot:l.flip};}
    else                {B[l.r][f.C-1-l.c]={page:p1,rot:l.flip};A[l.r][l.c]={page:p2,rot:l.flip};}
  });
  const aOne=A.flat().some(x=>x.page===1);
  return {outer:aOne?A:B, inner:aOne?B:A, sideA:A, sideB:B,
          C:f.C,R:f.R,leaves:f.C*f.R,folds:f.folds, leafOrder};
}
