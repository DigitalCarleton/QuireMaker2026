"use strict";

/* paper sizes (portrait mm) + unit helpers */
const MM_PER_IN = 25.4;
const PT_PER_IN = 72;
const MM_PER_PT = MM_PER_IN / PT_PER_IN;

export const PAPER_SIZES = [
  {id:"LETTER",    w:215.9,  h:279.4},
  {id:"NOTE",      w:190.5,  h:254.0},
  {id:"LEGAL",     w:215.9,  h:355.6},
  {id:"TABLOID",   w:279.4,  h:431.8},
  {id:"EXECUTIVE", w:184.15, h:266.7},
  {id:"POSTCARD",  w:99.8,   h:146.8},
  {id:"A0",  w:841,  h:1189},
  {id:"A1",  w:594,  h:841},
  {id:"A2",  w:420,  h:594},
  {id:"A3",  w:297,  h:420},
  {id:"A4",  w:210,  h:297},
  {id:"A5",  w:148,  h:210},
  {id:"A6",  w:105,  h:148},
  {id:"A7",  w:74,   h:105},
  {id:"A8",  w:52,   h:74},
  {id:"A9",  w:37,   h:52},
  {id:"A10", w:26,   h:37},
  {id:"B0",  w:1000, h:1414},
  {id:"B1",  w:707,  h:1000},
  {id:"B2",  w:500,  h:707},
  {id:"B3",  w:353,  h:500},
  {id:"B4",  w:250,  h:353},
  {id:"B5",  w:176,  h:250},
  {id:"B6",  w:125,  h:176},
  {id:"B7",  w:88,   h:125},
  {id:"B8",  w:62,   h:88},
  {id:"B9",  w:44,   h:62},
  {id:"B10", w:31,   h:44},
  {id:"JIS_B0",  w:1030, h:1456},
  {id:"JIS_B1",  w:728,  h:1030},
  {id:"JIS_B2",  w:515,  h:728},
  {id:"JIS_B3",  w:364,  h:515},
  {id:"JIS_B4",  w:257,  h:364},
  {id:"JIS_B5",  w:182,  h:257},
  {id:"JIS_B6",  w:128,  h:182},
  {id:"JIS_B7",  w:91,   h:128},
  {id:"JIS_B8",  w:64,   h:91},
  {id:"JIS_B9",  w:45,   h:64},
  {id:"JIS_B10", w:32,   h:45},
  {id:"CUSTOM",  w:0,    h:0}
];

export const UNITS = [
  {id:"pt", label:"Points",      short:"pt"},
  {id:"in", label:"Inches",      short:"in"},
  {id:"cm", label:"Centimeters", short:"cm"}
];

export function mmToUnit(mm, unit){
  const n=Number(mm)||0;
  if(unit==="in") return n / MM_PER_IN;
  if(unit==="cm") return n / 10;
  return n / MM_PER_PT; // pt
}

export function unitToMm(val, unit){
  const n=Number(val)||0;
  if(unit==="in") return n * MM_PER_IN;
  if(unit==="cm") return n * 10;
  return n * MM_PER_PT; // pt
}

function fmtDim(mm, unit){
  const v=mmToUnit(mm, unit);
  if(unit==="pt") return (Math.round(v*10)/10).toFixed(1).replace(/\.0$/,"");
  if(unit==="in") return (Math.round(v*100)/100).toFixed(2);
  return (Math.round(v*100)/100).toFixed(2); // cm
}

export function paperLabel(size, unit){
  if(size.id==="CUSTOM") return "CUSTOM";
  const u = UNITS.find(x=>x.id===unit)?.short || unit;
  return `${size.id} (${fmtDim(size.w, unit)} x ${fmtDim(size.h, unit)} ${u})`;
}

export function findPaper(id){
  return PAPER_SIZES.find(p=>p.id===id) || PAPER_SIZES.find(p=>p.id==="A4");
}

/* landscape sheet for printing (long edge horizontal) */
export function getSheetMm(paperId, customWunit, customHunit, unit){
  if(paperId==="CUSTOM"){
    let w=unitToMm(customWunit, unit);
    let h=unitToMm(customHunit, unit);
    if(!(w>10)) w=210;
    if(!(h>10)) h=297;
    return {w, h};
  }
  const p=findPaper(paperId);
  return {w:Math.max(p.w,p.h), h:Math.min(p.w,p.h)};
}

const $=i=>document.getElementById(i);

export function readPaperUI(){
  const paperId = $("paper") ? $("paper").value : "A4";
  const unit = $("paperUnit") ? $("paperUnit").value : "cm";
  const customW = $("paperW") ? $("paperW").value : "";
  const customH = $("paperH") ? $("paperH").value : "";
  return {paperId, unit, customW, customH, ...getSheetMm(paperId, customW, customH, unit)};
}

export function fillPaperSelect(){
  const sel=$("paper");
  const unitSel=$("paperUnit");
  if(!sel || !unitSel) return;
  const unit=unitSel.value || "cm";
  const prev=sel.value || "A4";
  sel.innerHTML="";
  for(const p of PAPER_SIZES){
    const opt=document.createElement("option");
    opt.value=p.id;
    opt.textContent=paperLabel(p, unit);
    sel.appendChild(opt);
  }
  if([...sel.options].some(o=>o.value===prev)) sel.value=prev;
  else sel.value="A4";
  updateCustomUnitLabel();
  syncCustomEnabled();
}

export function updateCustomUnitLabel(){
  const el=$("paperUnitLabel");
  const unitSel=$("paperUnit");
  if(!el || !unitSel) return;
  const u=UNITS.find(x=>x.id===unitSel.value);
  el.textContent=`(in ${u?u.label:unitSel.value})`;
}

export function syncCustomEnabled(){
  const custom = $("paper") && $("paper").value==="CUSTOM";
  ["paperW","paperH"].forEach(id=>{
    const el=$(id);
    if(!el) return;
    el.disabled=!custom;
  });
}

/* keep CUSTOM physical size when the display unit changes */
export function convertCustomFields(fromUnit, toUnit){
  if(fromUnit===toUnit) return;
  const w=$("paperW"), h=$("paperH");
  if(!w || !h) return;
  const wMm=unitToMm(w.value, fromUnit);
  const hMm=unitToMm(h.value, fromUnit);
  const prec = toUnit==="pt" ? 1 : 2;
  w.value = mmToUnit(wMm, toUnit).toFixed(prec);
  h.value = mmToUnit(hMm, toUnit).toFixed(prec);
}

export function initPaperUI(){
  const unitSel=$("paperUnit");
  if(unitSel && !unitSel.value) unitSel.value="cm";
  if($("paperW") && !$("paperW").value){
    const u=unitSel?unitSel.value:"cm";
    $("paperW").value=fmtDim(210, u);
    $("paperH").value=fmtDim(297, u);
  }
  fillPaperSelect();
}
