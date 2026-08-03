"use strict";

/* pagination + panel geometry */
export let PW=74.25, PH=105; // panel size in mm

export function setPanelSize(w,h){
  const ww=Number(w), hh=Number(h);
  if(ww>1) PW=ww;
  if(hh>1) PH=hh;
}

const MM=3.77953; // px per mm
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
  // continuous copy when paragraph breaks are off
  if(!keep){
    return `<p style="margin:0;text-indent:0">`+esc(a.join(' '))+'</p>';
  }
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

function normOpts(o){
  if(o===true||o===false||o==null){
    return {folioMarks:!!o, pageNums:!!o, catchwords:false, runningTitle:false,
            marginBind:0, marginFore:0, marginTop:0, marginBot:0};
  }
  const clampM = v => Math.min(48, Math.max(0, Number(v)||0));
  return {
    folioMarks:!!o.folioMarks, // signature at bottom
    pageNums:!!o.pageNums,     // page number top-right
    catchwords:!!o.catchwords,
    runningTitle:!!o.runningTitle,
    marginBind:clampM(o.marginBind),
    marginFore:clampM(o.marginFore),
    marginTop:clampM(o.marginTop),
    marginBot:clampM(o.marginBot)
  };
}

const PT_PX = 96/72; // pt → px

export function panelMetrics(pt,opts){
  const o=normOpts(opts);
  const {folioMarks,catchwords,runningTitle}=o;
  const size=Math.min(20, Math.max(1, Number(pt)||9.2));
  const pw=(PW>1)?PW:74.25, ph=(PH>1)?PH:105;
  const cellW=Math.max(8, pw*MM), cellH=Math.max(8, ph*MM);

  // shrink insets on tiny sheets so content still fits
  const baseIdeal=6*MM;
  const base=Math.max(1.5, Math.min(baseIdeal, cellW*0.08, cellH*0.08));

  let bindPx=o.marginBind*PT_PX;
  let forePx=o.marginFore*PT_PX;
  let topPx=o.marginTop*PT_PX;
  let botPx=o.marginBot*PT_PX;

  // don't let margins eat the whole page
  const maxPadX=cellW*0.55, maxPadY=cellH*0.55;
  let padX=base*2+bindPx+forePx;
  let padY=base*2+topPx+botPx;
  if(padX>maxPadX && padX>0){
    const s=maxPadX/padX;
    bindPx*=s; forePx*=s;
    padX=base*2+bindPx+forePx;
  }
  if(padY>maxPadY && padY>0){
    const s=maxPadY/padY;
    topPx*=s; botPx*=s;
    padY=base*2+topPx+botPx;
  }

  const innerW=Math.max(4, cellW-padX);
  const innerH=Math.max(4, cellH-padY);

  // auto-shrink type if the panel is too small for the requested size
  const maxPtForWidth=Math.max(3, (innerW/4)/PT_PX);
  const maxPtForHeight=Math.max(3, (innerH/3.2)/PT_PX);
  const effSize=Math.min(size, maxPtForWidth, maxPtForHeight);
  const lineH=Math.max(6, effSize*1.3333*1.42);

  const folioPt=Math.min(7.5, Math.max(4, effSize*0.85));
  const folioLineH=folioPt*1.3333*1.2;
  let folioH=folioMarks ? Math.min(2*MM+folioLineH, innerH*0.22) : 0;
  let catchH=catchwords ? Math.min(1.5*MM+lineH, innerH*0.28) : 0;
  const runLineH=effSize*1.3333*1.2;
  let runH=runningTitle ? Math.min(2*MM+runLineH, innerH*0.22) : 0;

  let textAreaH=innerH-folioH-catchH-runH;
  if(textAreaH<lineH && (folioH+catchH+runH)>0){
    const furniture=folioH+catchH+runH;
    const keep=Math.max(lineH, innerH*0.55);
    const scale=Math.max(0, (innerH-keep)/furniture);
    folioH*=scale; catchH*=scale; runH*=scale;
    textAreaH=innerH-folioH-catchH-runH;
  }
  textAreaH=Math.max(Math.min(lineH, innerH), Math.min(textAreaH, innerH));

  const headroom=Math.min(lineH, textAreaH*0.25);
  const fitH=Math.max(lineH, textAreaH-headroom);
  return {lineH, base, bindPx, forePx, topPx, botPx, size:effSize, reqSize:size,
          folioH,catchH,folioLineH,folioPt,runH,runLineH,cellW,cellH,innerW,innerH,
          textAreaH,headroom,fitH,folioMarks,pageNums:o.pageNums,catchwords,runningTitle,pw,ph,MM,
          marginBind:o.marginBind, marginFore:o.marginFore,
          marginTop:o.marginTop, marginBot:o.marginBot};
}

function cssFontFamily(fam){
  return String(fam||"Georgia, serif")
    .replace(/[“”]/g,'"')
    .replace(/"/g,"'")
    .trim() || "Georgia, serif";
}

/* side "r" = recto, "v" = verso (binding swaps sides) */
export function panelStyles(pt,fam,opts,side="r"){
  const m=panelMetrics(pt,opts);
  const size=m.size;
  const font=`font-family:${cssFontFamily(fam)};font-size:${size}pt;line-height:1.42`;
  const padL = m.base + (side==="v" ? m.forePx : m.bindPx);
  const padR = m.base + (side==="v" ? m.bindPx : m.forePx);
  const padT = m.base + m.topPx;
  const padB = m.base + m.botPx;
  const pnumPt=Math.min(m.folioPt||7.5, Math.max(4, size*0.9));
  return {
    m,
    cell:`width:${m.cellW}px;height:${m.cellH}px;position:relative;`+
      `padding:${padT}px ${padR}px ${padB}px ${padL}px;box-sizing:border-box;`+
      `display:flex;flex-direction:column;overflow:hidden;${font}`,
    pnum:`position:absolute;top:${Math.max(2, m.base*0.35)}px;right:${Math.max(2, m.base*0.4)}px;`+
      `margin:0;padding:0;z-index:2;pointer-events:none;`+
      `font-family:${cssFontFamily(fam)};font-size:${pnumPt}pt;line-height:1;color:#555`,
    run:`width:${m.innerW}px;height:${m.runH}px;flex:0 0 ${m.runH}px;`+
      `box-sizing:border-box;margin:0;padding:0;overflow:hidden;`+
      `display:flex;align-items:flex-start;justify-content:center;`+
      `font-style:italic;font-size:${size}pt;line-height:1.2;color:#2a2620;`+
      `font-family:${cssFontFamily(fam)}`,
    text:`width:${m.innerW}px;height:${m.textAreaH}px;flex:0 0 ${m.textAreaH}px;`+
      `max-height:${m.textAreaH}px;box-sizing:border-box;overflow:hidden;`+
      `text-align:justify;hyphens:none;-webkit-hyphens:none;`+
      `overflow-wrap:anywhere;word-break:break-word;${font}`,
    catch:`width:${m.innerW}px;height:${m.catchH}px;flex:0 0 ${m.catchH}px;`+
      `box-sizing:border-box;margin:0;padding:0;overflow:hidden;`+
      `display:flex;align-items:flex-end;justify-content:flex-end;`+
      `color:#2a2620;${font}`,
    folio:`width:${m.innerW}px;height:${m.folioH}px;flex:0 0 ${m.folioH}px;`+
      `box-sizing:border-box;margin:0;padding:0;overflow:hidden;`+
      `display:flex;align-items:flex-end;justify-content:center;`+
      `font-family:${cssFontFamily(fam)};font-size:${pnumPt}pt;line-height:1.2;color:#555`
  };
}

/* measure average char width in the real font */
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
  return Math.max(4, Math.floor(innerWpx/avg));
}

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

/* fill pages by line budget; never drop a word */
export function splitPages(raw,keep,per,pt,fam,opts){
  const paras=keep
    ? String(raw).split(/\n\s*\n/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean)
    : [String(raw).replace(/\s+/g,' ').trim()].filter(Boolean);
  if(!paras.length){
    const empty=Array(per).fill(''); verifyWordIntegrity(raw,empty); return empty;
  }

  const m=panelMetrics(pt,opts);
  const maxLines=Math.max(1, Math.floor(m.fitH/m.lineH));
  const cpl=charsPerLine(m.size,fam,m.innerW);

  const pages=[]; let curParas=[]; let curLines=0;
  const commit=()=>{ if(curParas.length){ pages.push(curParas.slice()); curParas.length=0; curLines=0; } };

  for(const para of paras){
    const words=para.split(/\s+/).filter(Boolean);
    let start=0;
    let onPage=false; // already started this paragraph on the current page
    while(start<words.length){
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
        if(curParas.length){ commit(); onPage=false; continue; }
        taken=[words[start]]; end=start+1; // force at least one word
      }
      if(onPage){
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
