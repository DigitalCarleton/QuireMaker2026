"use strict";

import { FORMATS } from "./imposition.js";
import { PW, PH, setPanelSize, splitPages, verifyWordIntegrity, panelStyles, wordsFromHtml } from "./pagination.js";
import { readPaperUI } from "./paper.js";

const $ = i => document.getElementById(i);
const escHtml = s => String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

/* Read the page-furniture toggles into one options object. */
export function panelOpts(){
  const pgOn  = $("pgnum")   ? $("pgnum").checked   : true;
  const sigOn = $("sigmark") ? $("sigmark").checked : true;
  const catchOn = $("catch") ? $("catch").checked   : false;
  const runOn = $("runtitle") ? $("runtitle").checked : false;
  const runText = $("runtitletext") ? $("runtitletext").value.trim() : "";
  // running title only reserves space / shows when it is ticked AND has text
  const runningTitle = runOn && !!runText;
  // restart page numbers at 1 in every gathering (display only; content unchanged)
  const restartNum = $("restartpg") ? $("restartpg").checked : false;
  const readM = id => {
    const el=$(id);
    if(!el) return 0;
    const v=parseFloat(el.value);
    return Number.isFinite(v) ? Math.min(48, Math.max(0, v)) : 0;
  };
  return {pgOn, sigOn, catchOn, runOn, runText, runningTitle, restartNum,
          // bottom signature strip moves with margins; page numbers are fixed top-right
          folioMarks: sigOn, pageNums: pgOn, catchwords: catchOn,
          marginBind:readM("mBind"), marginFore:readM("mFore"),
          marginTop:readM("mTop"), marginBot:readM("mBot")};
}

/* Options that affect panel geometry / pagination. */
function geomOpts(o){
  return {
    folioMarks:o.folioMarks, pageNums:o.pageNums,
    catchwords:o.catchwords, runningTitle:o.runningTitle,
    marginBind:o.marginBind, marginFore:o.marginFore,
    marginTop:o.marginTop, marginBot:o.marginBot
  };
}
/* First word of a page (for the catchword on the previous page). */
function firstWordOf(html){ return wordsFromHtml(html)[0] || ""; }

/* fold theatre — fixed centered stage
   The stack of panels always stays centered. Panels have a fixed leaf
   size; each panel is placed relative to the stack CENTER, so as the
   sheet folds down the footprint shrinks toward the middle and never
   drifts out of frame. Works identically for every format, forward
   and backward. */
const LW=88, LH=116, GAP=1;   // one leaf, on screen

export const T={step:0, back:false, key:"octavo", im:null};

function stackScale(){
  // shrink so the FLAT sheet (the widest state) fits the stage with margin
  const im=T.im;
  const flatW = im.C*(LW+GAP), flatH = im.R*(LH+GAP);
  const availW = 560, availH = 300;   // stage inner box
  return Math.min(1, availW/flatW, availH/flatH);
}
export function applyStackTransform(){
  const s=stackScale();
  $("stack").style.transform =
    `scale(${s}) rotateY(${T.back?180:0}deg)`;
}
export function buildScene(){
  const im=T.im, stack=$("stack");
  stack.innerHTML="";
  applyStackTransform();
  for(let r=0;r<im.R;r++)for(let c=0;c<im.C;c++){
    const fr=im.sideA[r][c], bk=im.sideB[r][im.C-1-c];
    const el=document.createElement("div");
    el.className="pc"+(fr.rot?" inv":"");
    el.style.width=LW+"px"; el.style.height=LH+"px";
    el.dataset.r=r; el.dataset.c=c;
    el.innerHTML=`<div class="lbl">${fr.page}</div><div class="lbl bk">${bk.page}</div>`;
    stack.appendChild(el);
  }
  layout();
}

export function layout(){
  const im=T.im, folds=im.folds.slice(0,T.step);
  const stepW=LW+GAP, stepH=LH+GAP;
  const fullyFolded = T.step===im.folds.length;
  // Map sheet cell -> leaf index in the finished gathering (0 = outermost = pages 1/2)
  const leafByCell = Object.create(null);
  if(im.leafOrder){
    for(const L of im.leafOrder) leafByCell[L.r+","+L.c] = L;
  }

  document.querySelectorAll(".pc").forEach(el=>{
    const r0=+el.dataset.r, c0=+el.dataset.c;
    // live footprint bookkeeping
    let w=im.C, h=im.R, ox=0, oy=0;   // origin (top-left cell index) of live footprint
    let ry=0, rx=0, depth=0;
    let landCol=c0, landRow=r0;

    for(const [ax,dir] of folds){
      if(ax==="V"){
        const nw=w/2, loc=landCol-ox;
        const moving = dir==="LR" ? loc<nw : loc>=nw;
        if(moving){ landCol = ox + (w-1-loc); ry+=180; depth++; }
        if(dir==="LR") ox+=nw;        // survivors occupy the right half
        w=nw;
      }else{
        const nh=h/2, loc=landRow-oy;
        const moving = dir==="TB" ? loc<nh : loc>=nh;
        if(moving){ landRow = oy + (h-1-loc); rx+=180; depth++; }
        if(dir==="TB") oy+=nh;        // survivors occupy the bottom half
        h=nh;
      }
    }
    // final footprint is w x h cells, its top-left at (ox,oy).
    // Center that footprint in the stage: place landing cell relative to footprint centre.
    const fcx = ox + w/2 - 0.5;       // centre column of live footprint
    const fcy = oy + h/2 - 0.5;
    const x = (landCol - fcx)*stepW;
    const y = (landRow - fcy)*stepH;

    el.style.left = "50%"; el.style.top="50%";
    el.style.marginLeft = (-LW/2)+"px";
    el.style.marginTop  = (-LH/2)+"px";

    /* Fully folded: restack in true gathering order so the outside front is page 1
       and Turn over shows the outside back (last page), not a random inner leaf.
       Page 1 lives on the BACK face of the outermost sheet cell, so that leaf is
       spun 180° around Y to face the viewer. */
    if(fullyFolded && leafByCell[r0+","+c0]){
      const L = leafByCell[r0+","+c0];
      const z = 20 + (im.leaves - L.leaf);   // leaf 0 on top (toward viewer)
      // face==="back" => odd page is on the .lbl.bk side of this panel
      const oddOnBack = L.face === "back";
      let fry = ry, frx = rx;
      if(L.leaf === 0){
        // Outside front = page 1 toward viewer
        fry = oddOnBack ? 180 : 0;
        frx = 0;
      }else if(L.leaf === im.leaves - 1){
        // Outside back = last page facing away; Turn over brings it forward
        fry = oddOnBack ? 180 : 0;
        frx = 0;
      }
      el.style.transform =
        `translate3d(${x}px,${y}px,${(im.leaves-L.leaf)*2.6}px) rotateY(${fry}deg) rotateX(${frx}deg)`;
      el.style.zIndex = z;
    }else{
      el.style.transform =
        `translate3d(${x}px,${y}px,${depth*2.6}px) rotateY(${ry}deg) rotateX(${rx}deg)`;
      el.style.zIndex = 10+depth;
    }
  });

  const n=im.folds.length, nm={V:"vertical fold",H:"horizontal fold"};
  $("stepTxt").textContent = T.step===0
    ? `flat sheet \u00b7 ${n} fold${n>1?"s":""} to go`
    : T.step===n
      ? `folded \u00b7 outside front is page 1 \u00b7 Turn over for page ${im.leaves*2}`
      : `fold ${T.step} of ${n} \u00b7 ${nm[im.folds[T.step-1][0]]}`;
  $("back").disabled=T.step===0;
  $("fwd").disabled=T.step===n;
}

/*  forme maps  */
export function drawFormes(){
  const im=T.im, sig=($("sig").value||"A").trim(), f=FORMATS[T.key];
  $("fx").innerHTML=`${f.sym}: ${sig}<sup>${im.leaves}</sup>`
    +`<small>${f.name} &middot; ${im.leaves} leaves &middot; ${im.leaves*2} pages</small>`;
  const g=(side,title,mk)=>{
    let h=`<div class="forme"><h3><b>${mk}</b> ${title}</h3>`
      +`<div class="sheet" style="grid-template-columns:repeat(${im.C},1fr)">`;
    // data-leaf groups the two pages of one physical leaf (recto + verso),
    // which sit on opposite formes — clicking spotlights the whole leaf.
    for(const row of side)for(const cl of row)
      h+=`<div class="cell${cl.rot?" rot":""}" data-p="${cl.page}" data-leaf="${Math.ceil(cl.page/2)}">`
       +`<span class="num">${cl.page}</span>`
       +(cl.rot?`<span class="flag">180&deg;</span>`:``)+`</div>`;
    return h+`</div></div>`;
  };
  $("formes").innerHTML=g(im.outer,"Outer forme &mdash; print first","1")
                      +g(im.inner,"Inner forme &mdash; the reverse","2");
  document.querySelectorAll(".cell").forEach(el=>{
    el.onclick=()=>{
      const leaf=el.dataset.leaf, on=el.classList.contains("hi");
      document.querySelectorAll(".cell").forEach(x=>x.classList.remove("hi"));
      // highlight both pages of this leaf, so it lights up across both formes
      if(!on) document.querySelectorAll(`.cell[data-leaf="${leaf}"]`).forEach(x=>x.classList.add("hi"));
    };
  });
}

/*  live on-screen preview  */
export let LAST=null;   // {pages, im, sig, pt, fam, nG}

export function compose(){
  const im=T.im, pt=Math.min(20, Math.max(1, parseFloat($("fs").value)||9.2)), fam=$("face").value;
  const sig=($("sig").value||"A").trim();
  const raw=$("txt").value;
  const per=im.leaves*2;
  const o=panelOpts();
  const sheet=readPaperUI();
  setPanelSize(sheet.w/im.C, sheet.h/im.R);
  const pages=splitPages(raw,$("para").checked,per,pt,fam,geomOpts(o));

  // Pages must form whole gatherings; pad only happens inside splitPages.
  if(pages.length%per!==0){
    console.error("[Quire Maker] Page count "+pages.length+" is not a multiple of gathering size "+per);
  }
  if(!verifyWordIntegrity(raw, pages)){
    console.error("[Quire Maker] compose(): word integrity check failed.");
  }

  const nG=pages.length/per;
  LAST={pages, im, sig, pt, fam, nG, raw, opts:o, sheet};
  return LAST;
}

export function renderPreview(){
  const {pages,im,sig,pt,fam,nG}=LAST;
  const book=$("book");
  let filled=0; pages.forEach(p=>{ if(p && p.trim()) filled++; });
  const blanks=pages.length-filled;
  $("pvMeta").textContent =
    `${nG} gathering${nG>1?"s":""} \u00b7 ${filled} filled`
    + (blanks?` \u00b7 ${blanks} blank (text ran short of a full gathering)`:``)
    + ` \u00b7 reads 1 \u2192 ${pages.length}`;

  // Identical panel geometry to measure + print (panelStyles).
  const o=panelOpts();
  const gOpts=geomOpts(o);
  // Precompute recto + verso styles (binding/fore-edge swap)
  const Sr=panelStyles(pt, fam, gOpts, "r");
  const Sv=panelStyles(pt, fam, gOpts, "v");

  let html="";
  for(let g=0;g<nG;g++){
    if(nG>1) html+=`<div class="gatherlabel">Gathering ${sig}${g+1}</div>`;
    for(let p=0;p<im.leaves*2;p++){
      const n=g*im.leaves*2+p+1;
      const body=pages[n-1]||"";
      const leaf=Math.ceil((p+1)/2);
      const side=(p%2===0)?"r":"v";
      const S=side==="r"?Sr:Sv;
      const blank = !body.trim();

      // catchword = first word of the NEXT page, in brackets, bottom-right
      const cwWord = o.catchOn ? firstWordOf(pages[n]) : "";
      const catchEl = o.catchOn
        ? `<div class="catch" style="${S.catch}">${cwWord?("["+escHtml(cwWord)+"]"):""}</div>`
        : ``;

      // signature at the bottom (moves with margins)
      const foot = o.sigOn
        ? `<div class="foot" style="${S.folio}">`+
            `<span class="corner">${sig}${g+1}.${leaf}${side}</span></div>`
        : ``;

      // page number: fixed top-right of the page cell (does not move with margins)
      const shownNum = o.restartNum ? (p+1) : n;
      const pnumEl = o.pgOn
        ? `<div class="pnum" style="${S.pnum}">${shownNum}</div>`
        : ``;

      // running title: reserved on every page, printed only from page 2 on non-blank pages
      const runEl = o.runningTitle
        ? `<div class="run" style="${S.run}">${(n>=2 && !blank)?escHtml(o.runText):""}</div>`
        : ``;

      html+=`<div class="leaf${blank?" blank":""}">`
          + `<div class="leafframe" style="${S.cell}">`
          + pnumEl
          + runEl
          + `<div class="body" style="${S.text}">${body}</div>`
          + catchEl
          + foot
          + `</div></div>`;
    }
  }
  book.innerHTML=html;

  // scale each true-size (mm) leaf down to its grid cell, preserving fill proportion
  requestAnimationFrame(()=>{
    document.querySelectorAll(".leaf").forEach(leaf=>{
      const frame=leaf.querySelector(".leafframe");
      const w=frame.getBoundingClientRect().width;   // real rendered mm width in px
      const cellW=leaf.clientWidth;
      const scale=cellW/w;
      const h=frame.getBoundingClientRect().height;
      frame.style.transform=`scale(${scale})`;
      leaf.style.height=(h*scale)+"px";
    });
  });
}
