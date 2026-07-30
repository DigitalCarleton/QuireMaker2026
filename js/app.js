"use strict";

import { impose } from "./imposition.js";
import {
  T, applyStackTransform, buildScene, layout, drawFormes,
  LAST, compose, renderPreview
} from "./preview.js";
import { buildPrint } from "./print.js";
import {
  initPaperUI, fillPaperSelect, syncCustomEnabled,
  convertCustomFields, updateCustomUnitLabel
} from "./paper.js";

const $ = i => document.getElementById(i);

function refreshAfterPaperChange(){
  if(LAST){ compose(); renderPreview(); }
}

/* wiring  */
function reload(){
  T.key=$("fmt").value; T.im=impose(T.key); T.step=0; T.back=false;
  buildScene(); drawFormes();
  if(LAST){ compose(); renderPreview(); }   // keep preview in sync with format
}
$("fmt").onchange=reload;
$("sig").oninput=()=>{ drawFormes(); if(LAST){compose();renderPreview();} };

// Live update when any page-furniture / type option changes.
["pgnum","sigmark","catch","para","face","runtitle","restartpg"].forEach(id=>{
  const el=$(id);
  if(el) el.addEventListener("change",()=>{ if(LAST){ compose(); renderPreview(); } });
});
// Size field: free entry, but hard-capped at 20 so pages never blow up.
if($("fs")){
  $("fs").addEventListener("input",()=>{
    const el=$("fs");
    const v=parseFloat(el.value);
    if(Number.isFinite(v) && v>20) el.value="20";
    if(LAST){ compose(); renderPreview(); }
  });
  $("fs").addEventListener("change",()=>{
    const el=$("fs");
    let v=parseFloat(el.value);
    if(!Number.isFinite(v) || v<1) v=9.2;
    v=Math.min(20, Math.max(1, v));
    el.value=String(v);
    if(LAST){ compose(); renderPreview(); }
  });
}
// White-space margins: live update, clamp 0–48 pt
["mBind","mFore","mTop","mBot"].forEach(id=>{
  const el=$(id);
  if(!el) return;
  const clamp=()=>{
    let v=parseFloat(el.value);
    if(!Number.isFinite(v) || v<0) v=0;
    if(v>48) v=48;
    el.value=String(v);
  };
  el.addEventListener("input",()=>{
    const v=parseFloat(el.value);
    if(Number.isFinite(v) && v>48) el.value="48";
    if(LAST){ compose(); renderPreview(); }
  });
  el.addEventListener("change",()=>{ clamp(); if(LAST){ compose(); renderPreview(); } });
});
// Typing a running title updates the preview live.
if($("runtitletext")) $("runtitletext").addEventListener("input",()=>{ if(LAST){ compose(); renderPreview(); } });

// Printer: paper size, display unit, custom dimensions
initPaperUI();
if($("paper")){
  $("paper").addEventListener("change",()=>{
    syncCustomEnabled();
    refreshAfterPaperChange();
  });
}
if($("paperUnit")){
  let prevUnit=$("paperUnit").value;
  $("paperUnit").addEventListener("change",()=>{
    const next=$("paperUnit").value;
    convertCustomFields(prevUnit, next);
    prevUnit=next;
    fillPaperSelect();
    updateCustomUnitLabel();
    refreshAfterPaperChange();
  });
}
["paperW","paperH"].forEach(id=>{
  const el=$(id);
  if(!el) return;
  el.addEventListener("change",()=>{
    if($("paper") && $("paper").value==="CUSTOM") refreshAfterPaperChange();
  });
});

$("fwd").onclick=()=>{ if(T.step<T.im.folds.length){T.step++;layout();} };
$("back").onclick=()=>{ if(T.step>0){T.step--;layout();} };
$("turn").onclick=()=>{ T.back=!T.back; applyStackTransform(); };

$("go").onclick=()=>{
  compose(); renderPreview();
  $("go").textContent="Composed \u2713";
  setTimeout(()=>$("go").textContent="Impose & preview",1400);
  $("book").scrollIntoView({behavior:"smooth",block:"nearest"});
};
$("pr").onclick=()=>{
  // Always re-compose from the current textarea so Print never uses stale pages.
  const data=compose();
  renderPreview();
  const info=buildPrint(data);
  if(info.pages!==data.pages.length || info.nG!==data.nG){
    console.error("[Quire Maker] Print page count mismatch with preview.", info, data.nG, data.pages.length);
  }
  window.print();
};

$("txt").value=
`You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings. I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking.

I am already far north of London, and as I walk in the streets of Petersburgh, I feel a cold northern breeze play upon my cheeks, which braces my nerves and fills me with delight. Do you understand this feeling? This breeze, which has travelled from the regions towards which I am advancing, gives me a foretaste of those icy climes.

Inspirited by this wind of promise, my daydreams become more fervent and vivid. I try in vain to be persuaded that the pole is the seat of frost and desolation; it ever presents itself to my imagination as the region of beauty and delight. There, the sun is forever visible, its broad disk just skirting the horizon and diffusing a perpetual splendour.

There, for with your leave, my sister, I will put some trust in preceding navigators, there snow and frost are banished; and, sailing over a calm sea, we may be wafted to a land surpassing in wonders and in beauty every region hitherto discovered on the habitable globe. Its productions and features may be without example, as the phenomena of the heavenly bodies undoubtedly are in those undiscovered solitudes.

What may not be expected in a country of eternal light? I may there discover the wondrous power which attracts the needle and may regulate a thousand celestial observations that require only this voyage to render their seeming eccentricities consistent forever. I shall satiate my ardent curiosity with the sight of a part of the world never before visited, and may tread a land never before imprinted by the foot of man.

These are my enticements, and they are sufficient to conquer all fear of danger or death and to induce me to commence this laborious voyage with the joy a child feels when he embarks in a little boat, with his holiday mates, on an expedition of discovery up his native river. But supposing all these conjectures to be false, you cannot contest the inestimable benefit which I shall confer on all mankind, to the last generation, by discovering a passage near the pole to those countries, to reach which at present so many months are requisite; or by ascertaining the secret of the magnet, which, if at all possible, can only be effected by an undertaking such as mine.

These reflections have dispelled the agitation with which I began my letter, and I feel my heart glow with an enthusiasm which elevates me to heaven, for nothing contributes so much to tranquillise the mind as a steady purpose, a point on which the soul may fix its intellectual eye. This expedition has been the favourite dream of my early years. I have read with ardour the accounts of the various voyages which have been made in prospect of arriving at the North Pacific Ocean through the seas which surround the pole.

You may remember that a history of all the voyages made for purposes of discovery composed the whole of our good uncle Thomas's library. My education was neglected, yet I was passionately fond of reading. These volumes were my study day and night, and my familiarity with them increased that regret which I had felt, as a child, on learning that my father's dying injunction had forbidden my uncle to allow me to embark in a seafaring life.`;

// The passage above is only a sample: show it greyed, and wipe it the first time
// a student clicks into the box so they can drop in their own text.
$("txt").classList.add("is-sample");
$("txt").addEventListener("focus",()=>{
  const t=$("txt");
  if(t.classList.contains("is-sample")){
    t.classList.remove("is-sample");
    t.value="";
    if(LAST){ compose(); renderPreview(); }
  }
},{once:true});

reload();
compose(); renderPreview();   // show pages on first load
