"use strict";

/* ===== text flow / pagination ===== */
export let PW=0, PH=0;

export function setPanelSize(w, h){
  PW=w; PH=h;
}

const esc=s=>s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const MM=3.77953; // CSS px per mm at 96dpi

/** Normalize input into an ordered word list (same rules as pagination). */
export function wordsOf(text){
  return String(text||"").replace(/\s+/g," ").trim().split(" ").filter(Boolean);
}

/** Extract words from page HTML (strips tags). */
export function wordsFromHtml(html){
  if(!html || !String(html).trim()) return [];
  const d=document.createElement("div");
  d.innerHTML=html;
  return wordsOf(d.textContent||"");
}

/**
 * Strict check: concatenated words across all pages must equal input words
 * in order. Logs the first divergence. Returns true on success.
 */
export function verifyWordIntegrity(raw, pageHtmls){
  const expected=wordsOf(raw);
  const actual=[];
  for(const html of pageHtmls) actual.push(...wordsFromHtml(html));

  const n=Math.max(expected.length, actual.length);
  for(let i=0;i<n;i++){
    if(expected[i]!==actual[i]){
      console.error(
        "[Quire Maker] Pagination word integrity FAILED at word index "+i+
        ".\n  expected: "+JSON.stringify(expected[i]??"(end)")+
        "\n  actual:   "+JSON.stringify(actual[i]??"(end)")+
        "\n  expectedTotal="+expected.length+" actualTotal="+actual.length
      );
      return false;
    }
  }
  return true;
}

function renderParas(a){
  return a.map((t,i)=>
    `<p style="margin:0 0 .5em;text-indent:${i?"1.2em":"0"}">`+esc(t)+"</p>"
  ).join("");
}

function padToGatherings(pages, per){
  const out=pages.slice();
  while(out.length%per!==0) out.push("");
  return out;
}

function charBudget(pt){
  const innerW=Math.max(1,(PW-12)*MM), innerH=Math.max(1,(PH-12-7)*MM);
  const PT=1.33333;
  const lineH=pt*PT*1.42;
  const linesPerPage=Math.max(1, Math.floor(innerH/lineH));
  const charW=pt*PT*0.5;
  const charsPerLine=Math.max(8, Math.floor(innerW/charW));
  return {
    budget: Math.max(charsPerLine, linesPerPage*charsPerLine),
    charsPerLine,
    lineH
  };
}

/**
 * Character-budget fallback. Splits word-by-word so a long paragraph never
 * overfills a page. Used when live measurement is unavailable or fails.
 * Never drops words.
 */
export function splitPagesFallback(paras, per, pt){
  const {budget, charsPerLine}=charBudget(pt);

  const pages=[];
  let cur=[];
  let frag="";
  let used=0;

  const flushFrag=()=>{
    if(frag){ cur.push(frag); frag=""; }
  };
  const commit=()=>{
    flushFrag();
    if(cur.length){ pages.push(cur.slice()); cur.length=0; used=0; }
  };

  for(const p of paras){
    const words=p.split(/\s+/).filter(Boolean);
    for(const w of words){
      const need=(frag?1:0)+w.length;
      if(used+need>budget && (frag||cur.length)){
        commit();
      }
      if(frag){ frag=frag+" "+w; used+=1+w.length; }
      else    { frag=w;           used+=w.length; }
      // Pathological: one word longer than the whole budget — still place it.
      if(used>budget && cur.length===0 && !frag.includes(" ")){
        commit();
      }
    }
    flushFrag();
    used+=charsPerLine*0.4;
    if(used>=budget && cur.length) commit();
  }
  commit();

  return padToGatherings(pages.map(a=>renderParas(a)), per);
}

/**
 * Build an offscreen measure panel with an EXPLICIT text-box height.
 * Flex shrink-wrapping makes clientHeight===scrollHeight, which would make
 * every word look like an overflow. Explicit px height avoids that.
 */
function makeMeasurePanel(pt, fam, folioOn, lineH){
  const cellW=PW*MM, cellH=PH*MM;
  const pad=6*MM;                         // matches print padding: 6mm
  const folioReserve=folioOn ? (7.5*1.3333 + 2*MM) : 0;  // folio strip + margin-top
  const textPadBottom=1.5*MM;
  // Usable text height: cell minus padding, folio, and a full-line safety margin.
  const textH=Math.max(lineH*2, cellH - 2*pad - folioReserve - textPadBottom - lineH*1.15);

  const cell=document.createElement("div");
  cell.className="pcell measure";
  cell.style.cssText=
    `position:fixed;left:0;top:0;z-index:-1;opacity:0;pointer-events:none;`+
    `width:${cellW}px;height:${cellH}px;box-sizing:border-box;padding:${pad}px;`+
    `border:1px dashed #ccc;overflow:hidden`;

  const txt=document.createElement("div");
  txt.style.cssText=
    `width:${Math.max(1, cellW-2*pad)}px;height:${textH}px;box-sizing:border-box;`+
    `line-height:1.42;text-align:justify;hyphens:auto;overflow:hidden;`+
    `font-family:${fam};font-size:${pt}pt`;

  cell.appendChild(txt);
  document.body.appendChild(cell);
  return {cell, txt, textH};
}

/**
 * Paginate by filling a real print panel offscreen and using overflow as
 * the fit test. Produces as many pages as needed, then pads to a whole
 * number of gatherings. Every input word must appear in order.
 */
export function splitPages(raw,keep,per,pt,fam,folioOn){
  const paras=keep
    ? raw.split(/\n\s*\n/).map(s=>s.replace(/\s+/g," ").trim()).filter(Boolean)
    : [raw.replace(/\s+/g," ").trim()].filter(Boolean);

  if(!paras.length){
    const empty=Array(per).fill("");
    verifyWordIntegrity(raw, empty);
    return empty;
  }

  const expectedCount=wordsOf(paras.join(" ")).length;
  const lineH=pt*1.3333*1.42;
  const {cell, txt, textH}=makeMeasurePanel(pt, fam, folioOn, lineH);

  // Guard: panel must have a real usable text box.
  txt.innerHTML=renderParas(["measure"]);
  if(textH < lineH*2 || txt.clientHeight < lineH){
    cell.remove();
    const fb=splitPagesFallback(paras, per, pt);
    if(!verifyWordIntegrity(raw, fb)){
      console.error("[Quire Maker] Fallback pagination failed word integrity.");
    }
    return fb;
  }

  const overflows=()=> txt.scrollHeight > txt.clientHeight + 0.5;

  const pages=[]; let cur=[];
  const commit=()=>{ if(cur.length){ pages.push(cur.slice()); cur.length=0; } };

  for(const p of paras){
    let carry="";
    const words=p.split(/\s+/).filter(Boolean);
    for(let i=0;i<words.length;i++){
      const trial=carry ? carry+" "+words[i] : words[i];
      txt.innerHTML=renderParas(cur.concat(trial));
      if(!overflows()){ carry=trial; continue; }
      // Current page is full without this word.
      if(carry){ cur.push(carry); }
      else if(cur.length===0){
        // Single word too big for an empty page: force it to avoid a stall.
        cur.push(words[i]); commit(); carry=""; continue;
      }
      commit();
      carry=words[i];
      txt.innerHTML=renderParas([carry]);
      if(overflows()){ cur.push(carry); commit(); carry=""; }
    }
    if(carry){ cur.push(carry); carry=""; }
  }
  commit();
  cell.remove();

  let htmlPages=pages.map(a=>renderParas(a));

  // If live measurement packed almost nothing per page, prefer the fallback.
  const nonEmpty=htmlPages.filter(p=>p && p.trim()).length;
  const avgWords=nonEmpty ? expectedCount/nonEmpty : 0;
  if(nonEmpty>4 && avgWords < 3){
    const fb=splitPagesFallback(paras, per, pt);
    if(verifyWordIntegrity(raw, fb)){
      htmlPages=fb;
    }else{
      console.error("[Quire Maker] Ignoring broken fallback; keeping measured pages.");
    }
  }

  htmlPages=padToGatherings(htmlPages, per);

  if(!verifyWordIntegrity(raw, htmlPages)){
    const fb=splitPagesFallback(paras, per, pt);
    if(verifyWordIntegrity(raw, fb)){
      console.error("[Quire Maker] Measured pages failed integrity; using fallback.");
      return fb;
    }
    console.error("[Quire Maker] CRITICAL: pagination could not preserve all words.");
  }

  return htmlPages;
}
