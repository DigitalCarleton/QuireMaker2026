"use strict";

import { LAST } from "./preview.js";

const $ = i => document.getElementById(i);

/* print sheets — one outer + one inner forme per gathering, for every gathering */
export function buildPrint(data){
  const src=data||LAST;
  if(!src){
    console.error("[Quire Maker] buildPrint: nothing composed yet.");
    return {sheets:0, pages:0, nG:0};
  }
  const {pages,im,sig,pt,fam,nG}=src;
  const per=im.leaves*2;

  if(pages.length!==nG*per){
    console.error(
      "[Quire Maker] buildPrint: page array length "+pages.length+
      " does not match nG*per="+(nG*per)
    );
  }

  let o="";
  let sheetCount=0;
  for(let g=0;g<nG;g++){
    const base=g*per;
    for(const side of [im.outer,im.inner]){
      sheetCount++;
      o+=`<div class="psheet" style="grid-template-columns:repeat(${im.C},1fr);grid-template-rows:repeat(${im.R},1fr)">`;
      for(const row of side)for(const cl of row){
        // cl.page is 1..per within the gathering; absolute index is base+cl.page-1
        const abs=base+cl.page;
        const leaf=Math.ceil(cl.page/2);
        const mk=$("fol").checked
          ? `<div class="pfol">${sig}${g+1}.${leaf}${cl.page%2?"r":"v"} &middot; ${abs}</div>`:``;
        o+=`<div class="pcell${cl.rot?" rot":""}">`
          +`<div class="ptext" style="font-family:${fam};font-size:${pt}pt">${pages[abs-1]||""}</div>`
          +mk+`</div>`;
      }
      o+=`</div>`;
    }
  }
  $("out").innerHTML=o;
  return {sheets:sheetCount, pages:pages.length, nG};
}
