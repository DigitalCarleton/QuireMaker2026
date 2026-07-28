"use strict";

import { LAST, panelOpts } from "./preview.js";
import { panelStyles, wordsFromHtml } from "./pagination.js";

const $ = i => document.getElementById(i);
const escHtml = s => String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const firstWordOf = html => wordsFromHtml(html)[0] || "";

/* print sheets — identical panel geometry to the measure panel via panelStyles() */
export function buildPrint(data){
  const src=data||LAST;
  if(!src){
    console.error("[Quire Maker] buildPrint: nothing composed yet.");
    return {sheets:0, pages:0, nG:0};
  }
  const {pages,im,sig,pt,fam,nG}=src;
  const per=im.leaves*2;
  const o=(src.opts)||panelOpts();
  const S=panelStyles(pt, fam, {folioMarks:o.folioMarks, catchwords:o.catchwords});

  if(pages.length!==nG*per){
    console.error(
      "[Quire Maker] buildPrint: page array length "+pages.length+
      " does not match nG*per="+(nG*per)
    );
  }

  // The physical sheet cell for this format. Folio/octavo are portrait cells;
  // quarto/sextodecimo are landscape cells, so the portrait page inside them is
  // rotated 90 deg to fit. The whole booklet then reads portrait after folding.
  const sheetCW=297/im.C, sheetCH=210/im.R;
  const fmtRot=(sheetCW>sheetCH+1e-6)?90:0;

  let o_html="";
  let sheetCount=0;
  for(let g=0;g<nG;g++){
    const base=g*per;
    for(const side of [im.outer,im.inner]){
      sheetCount++;
      o_html+=`<div class="psheet" style="grid-template-columns:repeat(${im.C},1fr);grid-template-rows:repeat(${im.R},1fr)">`;
      for(const row of side)for(const cl of row){
        const abs=base+cl.page;
        const leaf=Math.ceil(cl.page/2);
        const rv=cl.page%2?"r":"v";

        // catchword = first word of the NEXT page (reading order), bracketed
        const cwWord = o.catchwords ? firstWordOf(pages[abs]) : "";
        const catchEl = o.catchwords
          ? `<div class="pcatch" style="${S.catch}">${cwWord?("["+escHtml(cwWord)+"]"):""}</div>`
          : ``;

        // folio strip: signature (left) + page number (right), independent toggles
        const foot = o.folioMarks
          ? `<div class="pfol" style="${S.folio}">`
            + `<span>${o.sigOn?`${sig}${g+1}.${leaf}${rv}`:""}</span>`
            + `<span>${o.pgOn?abs:""}</span></div>`
          : ``;

        // page flip (180) from imposition + format rotation (0 or 90),
        // portrait page content centered inside the physical sheet cell
        const deg=(cl.rot?180:0)+fmtRot;
        o_html+=`<div class="pcell">`+
          `<div class="pcontent" style="${S.cell};position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(${deg}deg)">`+
            `<div class="ptext" style="${S.text}">${pages[abs-1]||""}</div>`+
            catchEl+
            foot+
          `</div>`+
          `</div>`;
      }
      o_html+=`</div>`;
    }
  }
  $("out").innerHTML=o_html;
  return {sheets:sheetCount, pages:pages.length, nG};
}
