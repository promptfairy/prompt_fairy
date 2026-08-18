(() => {
  "use strict";
  const CORE_KEY="prompt-fairy-arcane-v2", LOCAL_KEY="prompt-fairy-change-set-v4";
  const OPS=[
    ["subject_count","人物數量","SUBJECT COUNT","單人 ↔ 雙人、增加或減少人物"],
    ["gender_appearance","性別／外觀","APPEARANCE","性別、髮型、髮色、五官與身形"],
    ["wardrobe","服裝配件","WARDROBE","衣著、飾品與固定配件"],
    ["pose_action","姿勢／互動","POSE & ACTION","姿勢、動作、角色之間的互動"],
    ["scene","場景背景","SCENE","地點、環境與背景元素"],
    ["composition","構圖尺寸","COMPOSITION","鏡位、景別、比例與畫面安排"]
  ];
  const STYLE_LOCK=/(?:화풍\s*잠금|비사진적|일러스트|畫風|画风|style\s*lock|illustration|gouache|watercolou?r)/i;
  const STYLE_DIRTY=/(?:photorealistic|ultra[- ]?realistic|realistic\s+(?:skin|photo)|visible\s+pores|photography|anime|manga|film\s+look|film\s+grain|vogue|寫實|写实|攝影|摄影|動漫|动漫|動畫|动画|실사|사진|애니|만화)/i;
  const empty=()=>({selected:[],request:"",refs:{AA:false,BB:false},anchors:{},status:""});
  const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||"{}")||{};}catch{return {};}};
  let local={...empty(),...read(LOCAL_KEY)};
  local.refs={AA:false,BB:false,...(local.refs||{})}; local.anchors=local.anchors||{};
  const save=()=>{try{localStorage.setItem(LOCAL_KEY,JSON.stringify(local));}catch{}};
  const core=()=>read(CORE_KEY);
  const char=(c,s)=>(c.characters||[]).find(x=>x.id===c?.workspace?.assignments?.[s]?.characterId)||null;
  const refOn=(c,s)=>Boolean(local.refs[s]&&char(c,s));
  const active=(c)=>Boolean(local.selected.length||refOn(c,"AA")||refOn(c,"BB")||String(c?.workspace?.ratio||"").trim());
  function fixtures(c,s,ch){const ids=new Set(c?.workspace?.assignments?.[s]?.fixtureIds||[]);return(ch?.fixtures||[]).filter(x=>ids.has(x.id)).map(x=>String(x.promptText||x.name||"").trim()).filter(Boolean);}
  function anchor(c,s){const ch=char(c,s);if(!ch)return"";const own=String(local.anchors[ch.id]||"").trim();const base=String(ch.basePrompt||"").replace(/\s+/g," ").trim();return[own||(base.length>220?base.slice(0,217).trim()+"…":base),...fixtures(c,s,ch)].filter(Boolean).join("; ");}
  function opButton(op){const[id,zh,en,hint]=op,b=document.createElement("button"),on=local.selected.includes(id);b.type="button";b.className="change-set-v3-operation";b.setAttribute("aria-pressed",String(on));b.innerHTML=`<strong>${zh}</strong><small>${en}</small><em>${hint}</em>`;b.addEventListener("click",()=>{const s=new Set(local.selected);s.has(id)?s.delete(id):s.add(id);local.selected=OPS.map(x=>x[0]).filter(x=>s.has(x));local.status="";save();rebuild();});return b;}
  function controls(){const c=core(),box=document.createElement("section");box.className="change-set-v3";box.dataset.changeSetV4="true";box.innerHTML=`<div class="change-set-v3-head"><div class="change-set-v3-copy"><span class="change-set-v3-kicker">CHANGE SET</span><strong class="change-set-v3-title">這次想改什麼？</strong><p>只說要變成什麼；原文是哪種語言都不用自己重寫。</p></div><button type="button" class="change-set-v3-clear" data-v4-clear>清除選擇</button></div><div class="change-set-v3-operations"></div><label class="change-set-v3-request"><span>修改說明 <small>CHANGE REQUEST</small></span><textarea rows="3" data-v4-request placeholder="例如：兩個角色都改成男性，服裝與畫風保持原樣。"></textarea></label><div class="change-set-v3-status" data-v4-status></div>`;
    const ops=box.querySelector(".change-set-v3-operations");OPS.forEach(x=>ops.appendChild(opButton(x)));const ta=box.querySelector("[data-v4-request]");ta.value=local.request||"";ta.disabled=!local.selected.length;ta.addEventListener("input",()=>{local.request=ta.value;local.status="";save();});const clear=box.querySelector("[data-v4-clear]");clear.hidden=!local.selected.length;clear.addEventListener("click",()=>{local.selected=[];local.request="";local.status="";save();rebuild();});box.querySelector("[data-v4-status]").textContent=local.status||(refOn(c,"AA")||refOn(c,"BB")?"生成端參考圖模式已啟用：小���