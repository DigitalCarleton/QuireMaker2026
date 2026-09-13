"use strict";

import { FORMATS, FOLD_TEXT } from "./imposition.js";
import { PW, PH, setPanelSize, splitPages, verifyWordIntegrity, panelStyles, wordsFromHtml } from "./pagination.js";
import { readPaperUI } from "./paper.js";

const $ = i => document.getElementById(i);
const escHtml = s => String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

/* read UI toggles / margins */
export function panelOpts(){
  const pgOn  = $("pgnum")   ? $("pgnum").checked   : true;
  const sigOn = $("sigmark") ? $("sigmark").checked : true;
  const catchOn = $("catch") ? $("catch").checked   : false;
  const runOn = $("runtitle") ? $("runtitle").checked : false;
  const runText = $("runtitletext") ? $("runtitletext").value.trim() : "";
  const runningTitle = runOn && !!runText; // need both the checkbox and some text
  const restartNum = $("restartpg") ? $("restartpg").checked : false;
  const readM = id => {
    const el=$(id);
    if(!el) return 0;
    const v=parseFloat(el.value);
    return Number.isFinite(v) ? Math.min(48, Math.max(0, v)) : 0;
  };
  return {pgOn, sigOn, catchOn, runOn, runText, runningTitle, restartNum,
          folioMarks: sigOn, pageNums: pgOn, catchwords: catchOn,
          marginBind:readM("mBind"), marginFore:readM("mFore"),
          marginTop:readM("mTop"), marginBot:readM("mBot")};
}

/* subset of opts that change page geometry */
function geomOpts(o){
  return {
    folioMarks:o.folioMarks, pageNums:o.pageNums,
    catchwords:o.catchwords, runningTitle:o.runningTitle,
    marginBind:o.marginBind, marginFore:o.marginFore,
    marginTop:o.marginTop, marginBot:o.marginBot
  };
}
function firstWordOf(html){ return wordsFromHtml(html)[0] || ""; }

/* fold theatre — leaf size on screen */
const LW=88, LH=116, GAP=1;

export const T={step:0, back:false, key:"octavo", im:null};

function stackScale(){
  // fit the flat sheet inside the stage
  const im=T.im;
  const flatW = im.C*(LW+GAP), flatH = im.R*(LH+GAP);
  const availW = 560, availH = 300;
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
  const pile=im.stacks[T.step]; // real layer order after this many creases

  document.querySelectorAll(".pc").forEach(el=>{
    const r0=+el.dataset.r, c0=+el.dataset.c;
    let w=im.C, h=im.R, ox=0, oy=0;
    let ry=0, rx=0;
    let landCol=c0, landRow=r0;

    for(const [ax,dir] of folds){
      if(ax==="V"){
        const nw=w/2, loc=landCol-ox;
        const moving = dir==="LR" ? loc<nw : loc>=nw;
        if(moving){ landCol = ox + (w-1-loc); ry+=180; }
        if(dir==="LR") ox+=nw;
        w=nw;
      }else{
        const nh=h/2, loc=landRow-oy;
        const moving = dir==="TB" ? loc<nh : loc>=nh;
        if(moving){ landRow = oy + (h-1-loc); rx+=180; }
        if(dir==="TB") oy+=nh;
        h=nh;
      }
    }
    const fcx = ox + w/2 - 0.5;
    const fcy = oy + h/2 - 0.5;
    const x = (landCol - fcx)*stepW;
    const y = (landRow - fcy)*stepH;

    el.style.left = "50%"; el.style.top="50%";
    el.style.marginLeft = (-LW/2)+"px";
    el.style.marginTop  = (-LH/2)+"px";

    // depth 0 is the top of the pile, so lift it closest to the viewer
    const lift = pile.layers - pile.depth[r0+","+c0];
    el.style.transform =
      `translate3d(${x}px,${y}px,${lift*2.6}px) rotateY(${ry}deg) rotateX(${rx}deg)`;
    el.style.zIndex = 10+lift;
  });

  const n=im.folds.length;
  const crease = k => FOLD_TEXT[im.folds[k].join(":")];
  const upSide = im.outer===im.sideA ? "outer" : "inner";
  $("stepTxt").textContent = T.step===0
    ? `flat sheet \u00b7 ${upSide} forme facing you \u00b7 ${n} fold${n>1?"s":""} to go`
    : T.step===n
      ? `fold ${n} of ${n} \u00b7 ${crease(n-1)} \u00b7 page 1 is now on top`
      : `fold ${T.step} of ${n} \u00b7 ${crease(T.step-1)}`;
  $("back").disabled=T.step===0;
  $("fwd").disabled=T.step===n;
}

/* outer / inner forme maps */
export function drawFormes(){
  const im=T.im, sig=($("sig").value||"A").trim(), f=FORMATS[T.key];
  $("fx").innerHTML=`${f.sym}: ${sig}<sup>${im.leaves}</sup>`
    +`<small>${f.name} &middot; ${im.leaves} leaves &middot; ${im.leaves*2} pages</small>`;
  const g=(side,title,mk)=>{
    let h=`<div class="forme"><h3><b>${mk}</b> ${title}</h3>`
      +`<div class="sheet" style="grid-template-columns:repeat(${im.C},1fr)">`;
    // data-leaf ties recto+verso so a click highlights both
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
      if(!on) document.querySelectorAll(`.cell[data-leaf="${leaf}"]`).forEach(x=>x.classList.add("hi"));
    };
  });
}

export let LAST=null; // last compose() result

export function compose(){
  const im=T.im, pt=Math.min(20, Math.max(1, parseFloat($("fs").value)||9.2)), fam=$("face").value;
  const sig=($("sig").value||"A").trim();
  const raw=$("txt").value;
  const per=im.leaves*2;
  const o=panelOpts();
  const sheet=readPaperUI();
  setPanelSize(sheet.w/im.C, sheet.h/im.R);
  const pages=splitPages(raw,$("para").checked,per,pt,fam,geomOpts(o));

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

  const o=panelOpts();
  const gOpts=geomOpts(o);
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

      const cwWord = o.catchOn ? firstWordOf(pages[n]) : "";
      const catchEl = o.catchOn
        ? `<div class="catch" style="${S.catch}">${cwWord?("["+escHtml(cwWord)+"]"):""}</div>`
        : ``;

      const foot = o.sigOn
        ? `<div class="foot" style="${S.folio}">`+
            `<span class="corner">${sig}${g+1}.${leaf}${side}</span></div>`
        : ``;

      const shownNum = o.restartNum ? (p+1) : n;
      const pnumEl = o.pgOn
        ? `<div class="pnum" style="${S.pnum}">${shownNum}</div>`
        : ``;

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

  // scale true-size leaves down to fit the grid cells
  requestAnimationFrame(()=>{
    document.querySelectorAll(".leaf").forEach(leaf=>{
      const frame=leaf.querySelector(".leafframe");
      const w=frame.getBoundingClientRect().width;
      const cellW=leaf.clientWidth;
      const scale=cellW/w;
      const h=frame.getBoundingClientRect().height;
      frame.style.transform=`scale(${scale})`;
      leaf.style.height=(h*scale)+"px";
    });
  });
}
