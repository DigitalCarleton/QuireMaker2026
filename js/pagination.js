"use strict";

/* ===== text flow / pagination (canvas-measured, robust) ===== */
export let PW=74.25, PH=105; // octavo panel mm defaults; never 0

export function setPanelSize(w,h){
  const ww=Number(w), hh=Number(h);
  if(ww>1) PW=ww;
  if(hh>1) PH=hh;
}

const MM=3.77953;                 // px per mm at 96dpi
const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

export function wordsOf(text){
  return String(text||'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean);
}
export function wordsFromHtml(html){
  if(!html||!String(html).trim()) return [];
  const d=document.createElement('div'); d.innerHTML=html;
  return wordsOf(d.textContent||'');
}
export function verifyWordIntegrity(raw,pageHtmls){
  const expected=wordsOf(raw), actual=[];
  for(const h of pageHtmls) actual.push(...wordsFromHtml(h));
  const n=Math.max(expected.length,actual.length);
  for(let i=0;i<n;i++){
    if(expected[i]!==actual[i]){
      console.error('[Quire Maker] word integrity FAILED at '+i+
        ' expected '+JSON.stringify(expected[i]??'(end)')+
        ' actual '+JSON.stringify(actual[i]??'(end)'));
      return false;
    }
  }
  return true;
}

function renderParas(a, keep){
  // Continuous copy (breaks off): one flush block, no fake paragraph spacing.
  if(!keep){
    return `<p style="margin:0;text-indent:0">`+esc(a.join(' '))+'</p>';
  }
  // Breaks on: indent each new para; margin only BETWEEN paras (not after the last),
  // so the bottom of the page isn't eaten by an unbudgeted .5em gap.
  return a.map((t,i)=>{
    const margin = i < a.length-1 ? '0 0 .5em' : '0';
    const indent = i ? '1.2em' : '0';
    return `<p style="margin:${margin};text-indent:${indent}">`+esc(t)+'</p>';
  }).join('');
}
function padToGatherings(pages,per){
  const out=pages.slice();
  while(out.length%per!==0) out.push('');
  return out;
}

/* Normalize the panel options. Accepts a legacy boolean (folio marks on/off)
   or an object {folioMarks, catchwords}. */
function normOpts(o){
  if(o===true||o===false||o==null){
    return {folioMarks:!!o, pageNums:!!o, catchwords:false, runningTitle:false,
            marginBind:0, marginFore:0, marginTop:0, marginBot:0};
  }
  const clampM = v => Math.min(48, Math.max(0, Number(v)||0));
  return {
    // folioMarks = signature strip at the bottom (moves with margins)
    folioMarks:!!o.folioMarks,
    // pageNums = fixed top-right page number (does NOT move with margins)
    pageNums:!!o.pageNums,
    catchwords:!!o.catchwords,
    runningTitle:!!o.runningTitle,
    marginBind:clampM(o.marginBind),
    marginFore:clampM(o.marginFore),
    marginTop:clampM(o.marginTop),
    marginBot:clampM(o.marginBot)
  };
}

const PT_PX = 96/72; // CSS px per typographic point at 96dpi

/* Single source of truth for panel geometry (px).
   Bottom of the panel, below the text area, can carry two fixed strips:
     - a catchword strip (body size, right aligned)   [catchH]
     - a signature strip (moves with margins)         [folioH]
   Page numbers sit absolutely at the top-right of the page cell and do
   not consume the margin-aware text box (they stay put when margins change).
   White-space margins (pt) shrink the text block; binding/fore-edge
   swap on recto vs verso but the usable width stays the same. */
export function panelMetrics(pt,opts){
  const o=normOpts(opts);
  const {folioMarks,catchwords,runningTitle}=o;
  const size=Math.min(20, Math.max(1, Number(pt)||9.2));
  const lineH=Math.max(8, size*1.3333*1.42);
  const base=6*MM; // default page inset (same as before when margins are 0)
  const bindPx=o.marginBind*PT_PX;
  const forePx=o.marginFore*PT_PX;
  const topPx=o.marginTop*PT_PX;
  const botPx=o.marginBot*PT_PX;
  const pw=(PW>1)?PW:74.25, ph=(PH>1)?PH:105;
  const cellW=pw*MM, cellH=ph*MM;
  const padX = base*2 + bindPx + forePx;
  const padY = base*2 + topPx + botPx;
  let innerW=cellW-padX;
  let innerH=cellH-padY;
  if(!(innerW>=lineH*4)) innerW=Math.max(lineH*4, cellW*0.45);
  if(!(innerH>=lineH*4)) innerH=Math.max(lineH*4, cellH*0.45);
  const folioLineH=7.5*1.3333*1.2;
  const folioH=folioMarks ? (2*MM + folioLineH) : 0;
  const catchH=catchwords ? (1.5*MM + lineH) : 0;
  const runLineH=size*1.3333*1.2;
  const runH=runningTitle ? (2*MM + runLineH) : 0;
  let textAreaH=innerH-folioH-catchH-runH;
  if(!(textAreaH>=lineH*3)) textAreaH=Math.max(lineH*3, innerH*0.55);
  const headroom=lineH;
  const fitH=Math.max(lineH*2, textAreaH-headroom);
  return {lineH, base, bindPx, forePx, topPx, botPx,
          folioH,catchH,folioLineH,runH,runLineH,cellW,cellH,innerW,innerH,
          textAreaH,headroom,fitH,folioMarks,pageNums:o.pageNums,catchwords,runningTitle,pw,ph,MM,
          marginBind:o.marginBind, marginFore:o.marginFore,
          marginTop:o.marginTop, marginBot:o.marginBot};
}

function cssFontFamily(fam){
  // Keep a usable CSS font-family list; normalize smart quotes / leftover doubles.
  return String(fam||"Georgia, serif")
    .replace(/[“”]/g,'"')
    .replace(/"/g,"'")
    .trim() || "Georgia, serif";
}

/* side: "r" (recto/odd) or "v" (verso/even). Binding sits toward the spine. */
export function panelStyles(pt,fam,opts,side="r"){
  const m=panelMetrics(pt,opts);
  const size=Math.min(20, Math.max(1, Number(pt)||9.2));
  const font=`font-family:${cssFontFamily(fam)};font-size:${size}pt;line-height:1.42`;
  // Recto: spine on the left → binding left, fore-edge right
  // Verso: spine on the right → fore-edge left, binding right
  const padL = m.base + (side==="v" ? m.forePx : m.bindPx);
  const padR = m.base + (side==="v" ? m.bindPx : m.forePx);
  const padT = m.base + m.topPx;
  const padB = m.base + m.botPx;
  return {
    m,
    cell:`width:${m.cellW}px;height:${m.cellH}px;position:relative;`+
      `padding:${padT}px ${padR}px ${padB}px ${padL}px;box-sizing:border-box;`+
      `display:flex;flex-direction:column;overflow:hidden;${font}`,
    /* page number: fixed to the page cell's top-right — ignores margin padding */
    pnum:`position:absolute;top:${Math.max(4, m.base*0.4)}px;right:${Math.max(4, m.base*0.45)}px;`+
      `margin:0;padding:0;z-index:2;pointer-events:none;`+
      `font-family:${cssFontFamily(fam)};font-size:7.5pt;line-height:1;color:#555`,
    /* running-title strip: sits at the very top of the text block, centred italic */
    run:`width:${m.innerW}px;height:${m.runH}px;flex:0 0 ${m.runH}px;`+
      `box-sizing:border-box;margin:0;padding:0;overflow:hidden;`+
      `display:flex;align-items:flex-start;justify-content:center;`+
      `font-style:italic;font-size:${size}pt;line-height:1.2;color:#2a2620;`+
      `font-family:${cssFontFamily(fam)}`,
    text:`width:${m.innerW}px;height:${m.textAreaH}px;flex:0 0 ${m.textAreaH}px;`+
      `max-height:${m.textAreaH}px;box-sizing:border-box;overflow:hidden;`+
      `text-align:justify;hyphens:none;-webkit-hyphens:none;`+
      `overflow-wrap:anywhere;word-break:break-word;${font}`,
    /* catchword strip: sits just under the text, aligned to the right edge */
    catch:`width:${m.innerW}px;height:${m.catchH}px;flex:0 0 ${m.catchH}px;`+
      `box-sizing:border-box;margin:0;padding:0;overflow:hidden;`+
      `display:flex;align-items:flex-end;justify-content:flex-end;`+
      `color:#2a2620;${font}`,
    /* signature strip at the bottom (moves with margins) */
    folio:`width:${m.innerW}px;height:${m.folioH}px;flex:0 0 ${m.folioH}px;`+
      `box-sizing:border-box;margin:0;padding:0;overflow:hidden;`+
      `display:flex;align-items:flex-end;justify-content:center;`+
      `font-family:${cssFontFamily(fam)};font-size:7.5pt;line-height:1.2;color:#555`
  };
}

/* How many chars fit on one line — measure with a real DOM node using the
   same font-family / font-size as the page, so pagination matches what you see.
   (Canvas font strings often mis-parse multi-family stacks and then under/over-fill.) */
function charsPerLine(pt,fam,innerWpx){
  const size=Math.min(20, Math.max(1, Number(pt)||9.2));
  const sample="abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz ";
  const el=document.createElement("span");
  el.setAttribute("aria-hidden","true");
  el.style.cssText=
    "position:absolute;left:-99999px;top:0;visibility:hidden;white-space:nowrap;"+
    "margin:0;padding:0;border:0;"+
    `font-family:${cssFontFamily(fam)};font-size:${size}pt;line-height:1.42`;
  el.textContent=sample;
  document.body.appendChild(el);
  const w=el.getBoundingClientRect().width;
  document.body.removeChild(el);
  const avg=(w>0 ? w/sample.length : size*0.5);
  return Math.max(10, Math.floor(innerWpx/avg));
}

/* How many visual lines a set of words wraps into, at cpl chars per line. */
function wrapLines(words,cpl){
  let lines=1, len=0;
  for(const w of words){
    const add=(len?1:0)+w.length;
    if(len+add>cpl){ lines++; len=w.length; }
    else len+=add;
  }
  return lines;
}

export function splitPagesFallback(paras,per,pt,opts){
  return splitPages(paras.join('\n\n'), true, per, pt, 'Georgia,serif', opts);
}

/*
 * Line-budget pagination. Computes lines-per-page from geometry and
 * chars-per-line from canvas, then fills each page to capacity.
 * Never one word per page; never drops a word.
 */
export function splitPages(raw,keep,per,pt,fam,opts){
  const paras=keep
    ? String(raw).split(/\n\s*\n/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean)
    : [String(raw).replace(/\s+/g,' ').trim()].filter(Boolean);
  if(!paras.length){
    const empty=Array(per).fill(''); verifyWordIntegrity(raw,empty); return empty;
  }

  const m=panelMetrics(pt,opts);
  const maxLines=Math.max(3, Math.floor(m.fitH/m.lineH));   // never < 3 lines
  const cpl=charsPerLine(pt,fam,m.innerW);

  const pages=[]; let curParas=[]; let curLines=0;
  const commit=()=>{ if(curParas.length){ pages.push(curParas.slice()); curParas.length=0; curLines=0; } };

  for(const para of paras){
    const words=para.split(/\s+/).filter(Boolean);
    let start=0;
    // True once any of THIS logical paragraph has been placed on the current page.
    // Prevents leftover room from spawning a fake indented "new paragraph".
    let onPage=false;
    while(start<words.length){
      // Charge a gap only when a NEW logical paragraph begins on a page that already has copy.
      const gap=(curParas.length && !onPage)?1:0;
      const room=Math.max(0, maxLines-curLines-gap);
      if(room<=0){ commit(); onPage=false; continue; }
      let end=start, taken=[];
      while(end<words.length){
        const trial=taken.concat(words[end]);
        if(wrapLines(trial,cpl)>room) break;
        taken=trial; end++;
      }
      if(taken.length===0){
        if(curParas.length){ commit(); onPage=false; continue; }  // no room, new page
        taken=[words[start]]; end=start+1;                      // force one word on empty page
      }
      if(onPage){
        // Same paragraph, same page: append — do not start a new <p>.
        curParas[curParas.length-1]+=' '+taken.join(' ');
        curLines+=wrapLines(taken,cpl);
      }else{
        curParas.push(taken.join(' '));
        curLines+=wrapLines(taken,cpl)+gap;
        onPage=true;
      }
      start=end;
      if(curLines>=maxLines){ commit(); onPage=false; }
    }
  }
  commit();

  let html=pages.map(a=>renderParas(a, keep));
  html=padToGatherings(html,per);
  if(!verifyWordIntegrity(raw,html))
    console.error('[Quire Maker] CRITICAL: pagination lost words.');
  return html;
}
