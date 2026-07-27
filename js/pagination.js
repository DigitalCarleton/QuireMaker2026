"use strict";

/* ===== 4. text flow ===== */
export let PW=0, PH=0;

export function setPanelSize(w, h){
  PW=w; PH=h;
}

const esc=s=>s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

/* Fallback pagination: estimate how many characters fit per panel from its
   physical size and the font size, then greedily fill. Used only if live
   measurement fails (panel reports no height). Never produces one-word pages. */
export function splitPagesFallback(paras, per, pt){
  const MM=3.77953, PT=1.33333;
  const innerW=(PW-12)*MM, innerH=(PH-12-7)*MM;   // mm->px, minus padding + folio strip
  const lineH=pt*PT*1.42;
  const linesPerPage=Math.max(1, Math.floor(innerH/lineH));
  const charW=pt*PT*0.5;                          // rough avg glyph advance
  const charsPerLine=Math.max(8, Math.floor(innerW/charW));
  const budget=linesPerPage*charsPerLine;         // chars per page
  const render=a=>a.map((t,i)=>
    `<p style="margin:0 0 .5em;text-indent:${i?"1.2em":"0"}">`+esc(t)+"</p>").join("");
  const pages=[]; let cur=[]; let used=0;
  const commit=()=>{ if(cur.length){ pages.push(cur.slice()); cur.length=0; used=0; } };
  for(const p of paras){
    const words=p.split(" "); let line="";
    // approximate paragraph cost by characters; break when budget exceeded
    for(const w of words){
      const add=(line?1:0)+w.length;
      if(used+add>budget && cur.length){ commit(); }
      line=line?line+" "+w:w; used+=add;
    }
    if(line){ cur.push(line); }
    // paragraph adds a break's worth of space
    used+=charsPerLine*0.4;
    if(used>=budget){ commit(); }
  }
  commit();
  while(pages.length%per!==0)pages.push([]);
  return pages.map(a=>render(a));
}

/* Paginate by filling a REAL print panel offscreen and using its own
   overflow as the fit test. */
export function splitPages(raw,keep,per,pt,fam,folioOn){
  const paras=keep
    ? raw.split(/\n\s*\n/).map(s=>s.replace(/\s+/g," ").trim()).filter(Boolean)
    : [raw.replace(/\s+/g," ").trim()].filter(Boolean);
  if(!paras.length) return Array(per).fill("");

  // A real .pcell at true panel size, hidden but laid out for measurement.
  const cell=document.createElement("div");
  cell.className="pcell measure";
  cell.style.cssText=
    `position:fixed;left:0;top:0;z-index:-1;opacity:0;pointer-events:none;`+
    `width:${PW}mm;height:${PH}mm;box-sizing:border-box;padding:6mm;`+
    `border:1px dashed #ccc;display:flex;flex-direction:column;overflow:hidden`;
  const txt=document.createElement("div");
  txt.style.cssText=`flex:1;min-height:0;line-height:1.42;text-align:justify;`+
    `hyphens:auto;overflow:hidden;padding-bottom:1.5mm;font-family:${fam};font-size:${pt}pt`;
  const fol=document.createElement("div");
  fol.style.cssText=`text-align:center;font-size:7.5pt;color:#555;margin-top:2mm;flex:0 0 auto`;
  fol.textContent = folioOn ? "A1.1r \u00b7 000" : "";     // reserve realistic strip
  cell.appendChild(txt);
  if(folioOn) cell.appendChild(fol);
  document.body.appendChild(cell);

  const render=a=>a.map((t,i)=>
    `<p style="margin:0 0 .5em;text-indent:${i?"1.2em":"0"}">`+esc(t)+"</p>").join("");

  // Guard: if the panel didn't lay out (clientHeight ~ 0), fall back to a
  // character-budget split so we never emit one-word pages.
  txt.innerHTML = render(["measure"]);
  const realHeight = txt.clientHeight;
  if(realHeight < 20){
    cell.remove();
    return splitPagesFallback(paras, per, pt);
  }

  const lineH = pt * 1.3333 * 1.42;                 // px per line
  // Reserve a FULL line plus a small buffer. The preview leaf is scaled and the
  // printer rounds mm differently, so a half-line margin still clipped. A full
  // line of headroom guarantees the last line clears in every context.
  const overflows=()=> txt.scrollHeight > (txt.clientHeight - lineH*1.15) + 0.5;

  const pages=[]; let cur=[];
  const commit=()=>{ if(cur.length){ pages.push(cur.slice()); cur.length=0; } };

  for(const p of paras){
    let carry="";
    const words=p.split(" ");
    for(let i=0;i<words.length;i++){
      const trial = carry ? carry+" "+words[i] : words[i];
      txt.innerHTML = render(cur.concat(trial));
      if(!overflows()){ carry=trial; continue; }
      // overflowed: the current page is full. Close it WITHOUT this word.
      if(carry){ cur.push(carry); }
      else if(cur.length===0){
        // single word too big for an empty page: force it, avoid infinite loop
        cur.push(words[i]); commit(); carry=""; continue;
      }
      commit();
      carry=words[i];
      // start fresh page with just this word; verify it fits alone
      txt.innerHTML = render([carry]);
      if(overflows()){ /* pathological: force it anyway */ cur.push(carry); commit(); carry=""; }
    }
    if(carry){ cur.push(carry); carry=""; }
  }
  commit();
  cell.remove();
  // Sanity cap: real pages should never vastly outnumber what the text can fill.
  // If they do, measurement misfired -> use the character-budget fallback instead.
  const nonEmpty = pages.filter(p=>p.length).length;
  const wordCount = paras.join(" ").split(/\s+/).filter(Boolean).length;
  if(nonEmpty > 4 && nonEmpty > wordCount/3){
    return splitPagesFallback(paras, per, pt);
  }
  while(pages.length%per!==0)pages.push([]);
  return pages.map(a=>render(a));
}
