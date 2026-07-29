"use strict";

import { LAST, panelOpts } from "./preview.js";
import { PW, PH, panelStyles, wordsFromHtml } from "./pagination.js";

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
  const S=panelStyles(pt, fam, {folioMarks:o.folioMarks, catchwords:o.catchwords, runningTitle:o.runningTitle});

  if(pages.length!==nG*per){
    console.error(
      "[Quire Maker] buildPrint: page array length "+pages.length+
      " does not match nG*per="+(nG*per)
    );
  }

  let o_html="";
  let sheetCount=0;
  for(let g=0;g<nG;g++){
    const base=g*per;
    for(const side of [im.outer,im.inner]){
      sheetCount++;
      o_html+=`<div class="psheet" style="grid-template-columns:repeat(${im.C},${PW}mm);grid-template-rows:repeat(${im.R},${PH}mm)">`;
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
        // empty (left) | signature (centred) | page number (right), all one line
        // page number restarts at 1 per gathering when the option is on
        const shownNum = o.restartNum ? cl.page : abs;
        const foot = o.folioMarks
          ? `<div class="pfol" style="${S.folio}">`
            + `<span></span>`
            + `<span>${o.sigOn?`${sig}${g+1}.${leaf}${rv}`:""}</span>`
            + `<span>${o.pgOn?shownNum:""}</span></div>`
          : ``;

        // running title: reserved on every page, printed only from page 2 on non-blank pages
        const runEl = o.runningTitle
          ? `<div class="prun" style="${S.run}">${(abs>=2 && (pages[abs-1]||"").trim())?escHtml(o.runText):""}</div>`
          : ``;

        // pages that sit upside-down on the sheet carry the .rot (180deg) class
        o_html+=`<div class="pcell${cl.rot?" rot":""}" style="${S.cell}">`+
          runEl+
          `<div class="ptext" style="${S.text}">${pages[abs-1]||""}</div>`+
          catchEl+
          foot+
          `</div>`;
      }
      o_html+=`</div>`;
    }
  }
  $("out").innerHTML=o_html;
  return {sheets:sheetCount, pages:pages.length, nG};
}
