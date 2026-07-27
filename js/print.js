"use strict";

import { LAST } from "./preview.js";

const $ = i => document.getElementById(i);

/* print sheets */
export function buildPrint(){
  const {pages,im,sig,pt,fam,nG}=LAST;
  let o="";
  for(let g=0;g<nG;g++){
    const base=g*im.leaves*2;
    for(const side of [im.outer,im.inner]){
      o+=`<div class="psheet" style="grid-template-columns:repeat(${im.C},1fr);grid-template-rows:repeat(${im.R},1fr)">`;
      for(const row of side)for(const cl of row){
        const n=base+cl.page, leaf=Math.ceil(cl.page/2);
        const mk=$("fol").checked
          ? `<div class="pfol">${sig}${g+1}.${leaf}${cl.page%2?"r":"v"} &middot; ${n}</div>`:``;
        o+=`<div class="pcell${cl.rot?" rot":""}">`
          +`<div class="ptext" style="font-family:${fam};font-size:${pt}pt">${pages[n-1]||""}</div>`
          +mk+`</div>`;
      }
      o+=`</div>`;
    }
  }
  $("out").innerHTML=o;
}
