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

function renderParas(a){
  return a.map((t,i)=>`<p style="margin:0 0 .5em;text-indent:${i?'1.2em':'0'}">`+esc(t)+'</p>').join('');
}
function padToGatherings(pages,per){
  const out=pages.slice();
  while(out.length%per!==0) out.push('');
  return out;
}

/* Single source of truth for panel geometry (px). */
export function panelMetrics(pt,folioOn){
  const lineH=Math.max(8, pt*1.3333*1.42);
  const pad=6*MM;
  const pw=(PW>1)?PW:74.25, ph=(PH>1)?PH:105;
  const cellW=pw*MM, cellH=ph*MM;
  const innerW=Math.max(lineH*6, cellW-2*pad);
  const innerH=Math.max(lineH*8, cellH-2*pad);
  const folioH=folioOn ? (2*MM + 7.5*1.3333*1.2) : 0;
  let textAreaH=innerH-folioH;
  if(!(textAreaH>=lineH*3)) textAreaH=Math.max(lineH*12, innerH*0.9, 180);
  const headroom=lineH;                        // reserve exactly one line
  const fitH=Math.max(lineH*2, textAreaH-headroom);
  return {lineH,pad,folioH,cellW,cellH,innerW,innerH,textAreaH,headroom,fitH,pw,ph,MM};
}

function cssFontFamily(fam){ return String(fam||'Georgia,serif').replace(/"/g,"'"); }

export function panelStyles(pt,fam,folioOn){
  const m=panelMetrics(pt,folioOn);
  const font=`font-family:${cssFontFamily(fam)};font-size:${pt}pt;line-height:1.42`;
  return {
    m,
    cell:`width:${m.cellW}px;height:${m.cellH}px;padding:${m.pad}px;box-sizing:border-box;`+
      `display:flex;flex-direction:column;overflow:hidden;${font}`,
    text:`width:${m.innerW}px;height:${m.textAreaH}px;flex:0 0 ${m.textAreaH}px;`+
      `max-height:${m.textAreaH}px;box-sizing:border-box;overflow:hidden;`+
      `text-align:justify;hyphens:none;-webkit-hyphens:none;${font}`,
    folio:`width:${m.innerW}px;height:${m.folioH}px;flex:0 0 ${m.folioH}px;`+
      `box-sizing:border-box;margin:0;padding:0;overflow:hidden;`+
      `display:flex;align-items:flex-end;justify-content:center;`+
      `font-size:7.5pt;line-height:1.2;color:#555`
  };
}

/* Canvas: how many chars fit on one line at this width/font. Always works. */
function charsPerLine(pt,fam,innerWpx){
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  ctx.font=`${pt}pt ${cssFontFamily(fam)}`;
  const sample='abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz ';
  const avg=ctx.measureText(sample).width/sample.length || pt*0.5;
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

export function splitPagesFallback(paras,per,pt,folioOn){
  return splitPages(paras.join('\n\n'), true, per, pt, 'Georgia,serif', folioOn);
}

/*
 * Line-budget pagination. Computes lines-per-page from geometry and
 * chars-per-line from canvas, then fills each page to capacity.
 * Never one word per page; never drops a word.
 */
export function splitPages(raw,keep,per,pt,fam,folioOn){
  const paras=keep
    ? String(raw).split(/\n\s*\n/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean)
    : [String(raw).replace(/\s+/g,' ').trim()].filter(Boolean);
  if(!paras.length){
    const empty=Array(per).fill(''); verifyWordIntegrity(raw,empty); return empty;
  }

  const m=panelMetrics(pt,!!folioOn);
  const maxLines=Math.max(3, Math.floor(m.fitH/m.lineH));   // never < 3 lines
  const cpl=charsPerLine(pt,fam,m.innerW);

  const pages=[]; let curParas=[]; let curLines=0;
  const commit=()=>{ if(curParas.length){ pages.push(curParas.slice()); curParas.length=0; curLines=0; } };

  for(const para of paras){
    const words=para.split(/\s+/).filter(Boolean);
    let start=0;
    while(start<words.length){
      const gap=curParas.length?1:0;                       // blank line between paras
      const room=Math.max(0, maxLines-curLines-gap);
      if(room<=0){ commit(); continue; }
      let end=start, taken=[];
      while(end<words.length){
        const trial=taken.concat(words[end]);
        if(wrapLines(trial,cpl)>room) break;
        taken=trial; end++;
      }
      if(taken.length===0){
        if(curParas.length){ commit(); continue; }         // no room, new page
        taken=[words[start]]; end=start+1;                 // force one word on empty page
      }
      curParas.push(taken.join(' '));
      curLines+=wrapLines(taken,cpl)+gap;
      start=end;
      if(curLines>=maxLines) commit();
    }
  }
  commit();

  let html=pages.map(a=>renderParas(a));
  html=padToGatherings(html,per);
  if(!verifyWordIntegrity(raw,html))
    console.error('[Quire Maker] CRITICAL: pagination lost words.');
  return html;
}
