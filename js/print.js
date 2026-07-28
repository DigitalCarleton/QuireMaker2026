"use strict";

import { LAST } from "./preview.js";
import { PW, PH, panelStyles } from "./pagination.js";

const $ = i => document.getElementById(i);

/* print sheets — identical panel geometry to the measure panel via panelStyles() */
export function buildPrint(data){
  const src=data||LAST;
  if(!src){
    console.error("[Quire Maker] buildPrint: nothing composed yet.");
    return {sheets:0, pages:0, nG:0};
  }
  const {pages,im,sig,pt,fam,nG}=src;
  const per=im.leaves*2;
  const folioOn=$("fol").checked;
  const S=panelStyles(pt, fam, folioOn);

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
      o+=`<div class="psheet" style="grid-template-columns:repeat(${im.C},${PW}mm);grid-template-rows:repeat(${im.R},${PH}mm)">`;
      for(const row of side)for(const cl of row){
        const abs=base+cl.page;
        const leaf=Math.ceil(cl.page/2);
        const mk=folioOn
          ? `<div class="pfol" style="${S.folio}">`+
            `${sig}${g+1}.${leaf}${cl.page%2?"r":"v"} &middot; ${abs}</div>`
          : ``;
        o+=`<div class="pcell${cl.rot?" rot":""}" style="${S.cell}">`+
          `<div class="ptext" style="${S.text}">${pages[abs-1]||""}</div>`+
          mk+
          `</div>`;
      }
      o+=`</div>`;
    }
  }
  $("out").innerHTML=o;
  return {sheets:sheetCount, pages:pages.length, nG};
}
