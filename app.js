{
const CFG=window.CONFIG||{};
const MEMBERS=CFG.MEMBERS||[{id:"a",name:"自分"},{id:"b",name:"パートナー"}];
const GENRES=["アクション","アドベンチャー","SF","ホラー","サスペンス","ミステリー","クライム","ドラマ","恋愛","青春","コメディ","アニメ","ファンタジー","ファミリー","怪獣・特撮","音楽","スポーツ","歴史","戦争","ドキュメンタリー"];
const SAMPLE=[
{id:"s1",by:"sampleA",title:"ゴジラ-0.0",date:"2026-11-08",place:"IMAX",rating:5,genres:["怪獣・特撮","SF","アクション"],people:["山崎貴","神木隆之介","浜辺美波"],text:"前作の余韻をちゃんと引き継いだ続編。海上戦の音響は大きいスクリーンで観てこそ。",sample:true},
{id:"s2",by:"sampleB",title:"ゴジラ-0.0",date:"2026-11-08",place:"IMAX",rating:3,genres:["怪獣・特撮","SF"],people:[],text:"迫力はすごいけど、人間ドラマはもう少し見たかった。",sample:true},
{id:"s3",by:"sampleB",title:"ヴェリティ/真実",date:"2026-11-15",place:"",rating:5,genres:["サスペンス","ミステリー"],people:["アン・ハサウェイ","ダコタ・ジョンソン"],text:"原稿を読み進めるたびに人物の見え方が変わる。最後まで目が離せなかった。",sample:true},
{id:"s4",by:"sampleA",title:"呪いのスマホ",date:"2026-11-21",place:"",rating:2,genres:["ホラー"],people:[],text:"驚かせ方が単調で、怖さより音の大きさが残った。",sample:true}
];
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s||"").replace(/[\s　・:：/／「」『』、。!！?？\-－]/g,"").toLowerCase();
const today=new Date();today.setHours(0,0,0,0);
const day=d=>{const x=new Date(String(d).slice(0,10)+"T00:00:00");return isNaN(x)?null:x};
const fmtD=d=>{const x=day(d);return x?`${x.getFullYear()}/${x.getMonth()+1}/${x.getDate()}`:""};
const LS={get(k,f){try{const v=localStorage.getItem(k);return v==null?f:JSON.parse(v)}catch(e){return f}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

let CAT=[],CAT_META={updated:"",source:""};
let reviews=[],wants=[],sb=null,me=LS.get("cine_me",null),editing=null,rating=0,selG=new Set(),recFilter="all",recMode="both",who="all";
const isSample=()=>!reviews.length;
const shown=()=>isSample()?SAMPLE:reviews;
const myId=()=>isSample()?"sampleA":me;
function nameOf(id){if(id==="sampleA")return"あなた";if(id==="sampleB")return"パートナー";return(MEMBERS.find(m=>m.id===id)||{}).name||"?"}
const people=()=>isSample()?["sampleA","sampleB"]:MEMBERS.map(m=>m.id);

function status(c){const x=day(c.d),diff=Math.round((x-today)/864e5);if(diff>0)return{k:"soon",label:diff<=14?`あと${diff}日`:`${x.getMonth()+1}/${x.getDate()}公開`,diff};if(-diff<=70||c.run)return{k:"now",label:"上映中",diff};return{k:"old",label:"上映終了の可能性",diff}}
const stars=n=>"★".repeat(n)+"☆".repeat(5-n);
const findCat=t=>{const n=norm(t);if(!n)return null;return CAT.find(c=>norm(c.t)===n)||CAT.find(c=>n.length>=3&&(norm(c.t).startsWith(n)||n.startsWith(norm(c.t))))||null};
const filmKey=t=>{const c=findCat(t);return c?c.id:"t:"+norm(t)};

// ---------- data ----------
async function loadCatalog(){try{const r=await fetch("catalog.json?v="+Date.now());const j=await r.json();CAT=(j.films||[]).filter(f=>f&&f.t&&f.d);CAT_META={updated:j.updated||"",source:j.source||""}}catch(e){CAT=[]}
 $("#dl").innerHTML=CAT.map(c=>`<option value="${esc(c.t)}"></option>`).join("");
 $("#recNote").textContent=CAT.length?`作品データ：${fmtD(CAT_META.updated)}時点の上映中・公開予定 ${CAT.length}本（毎週木曜に自動更新）`:"作品データを読み込めませんでした"}
async function loadData(){if(!sb)return;const[r,w]=await Promise.all([sb.from("reviews").select("*"),sb.from("wants").select("*")]);
 if(r.error||w.error){const e=r.error||w.error;showMsg("記録を読み込めませんでした："+[e.code,e.message,e.hint].filter(Boolean).join(" / "));return}
 reviews=r.data.map(x=>({...x,date:x.date?String(x.date).slice(0,10):""}));wants=w.data;showMsg("");render()}
const db={
 async saveReview(o){const{error}=await sb.from("reviews").upsert(o);if(error)throw error},
 async delReview(id){const{error}=await sb.from("reviews").delete().eq("id",id);if(error)throw error},
 async saveWant(o){const{error}=await sb.from("wants").upsert(o);if(error)throw error},
 async delWant(cid){const{error}=await sb.from("wants").delete().eq("cid",cid);if(error)throw error}};
function showMsg(t){const m=$("#msg");m.textContent=t;m.hidden=!t}

// ---------- recommendation ----------
function featuresOf(r){const c=findCat(r.title);return{g:new Set([...(r.genres||[]),...(c?c.g:[])]),p:new Set([...(r.people||[]),...(c?c.p:[])]),k:new Set(c?c.k:[]),o:c?c.o:null,cat:c}}
function profileW(list){const W={};const add=(key,w,r)=>{(W[key]||(W[key]={w:0,src:[]})).w+=w;W[key].src.push(r)};
 for(const r of list){const w=(r.rating||3)-3;if(!w)continue;const f=featuresOf(r);f.g.forEach(x=>add("g:"+x,w,r));f.p.forEach(x=>add("p:"+x,w*3,r));f.k.forEach(x=>add("k:"+x,w*(x.startsWith("シリーズ:")?3:1.5),r));if(f.o)add("o:"+f.o,w*.4,r)}
 return W}
function scoreFor(c,W){let sc=0;const pos=[],neg=[];const chk=(key,label)=>{const e=W[key];if(!e)return;sc+=e.w;const best=e.src.slice().sort((a,b)=>Math.abs(b.rating-3)-Math.abs(a.rating-3))[0];(e.w>0?pos:neg).push({label,w:e.w,src:best})};
 c.p.forEach(x=>chk("p:"+x,x));c.k.forEach(x=>chk("k:"+x,x.replace(/^シリーズ:/,"")+"シリーズ"));c.g.forEach(x=>chk("g:"+x,x));chk("o:"+c.o,c.o);return{sc,pos,neg}}
function recommend(mode=recMode){const all=shown();const ids=mode==="both"?people():[myId()];
 const base=mode==="both"?all:all.filter(r=>r.by===myId());const seen=new Set(base.map(r=>featuresOf(r).cat?.id).filter(Boolean));
 const per=ids.map(id=>profileW(all.filter(r=>r.by===id)));const out=[];
 for(const c of CAT){if(seen.has(c.id))continue;const st=status(c);if(st.k==="old")continue;let sc=0,pos=[],neg=[],likes=0;
  for(const W of per){const r=scoreFor(c,W);sc+=r.sc;pos.push(...r.pos);neg.push(...r.neg);if(r.sc>0)likes++}
  const both=mode==="both"&&per.length>1&&likes===per.length;if(both)sc+=1;if(st.k==="soon"&&st.diff<=21)sc+=.3;
  out.push({c,st,sc,both,pos:pos.sort((a,b)=>b.w-a.w).slice(0,3),neg:neg.sort((a,b)=>a.w-b.w).slice(0,1)})}
 return out.sort((a,b)=>b.sc-a.sc||(b.c.pop||0)-(a.c.pop||0))}
function reasonText(x){const L=[];if(x.both)L.push("ふたりとも好みに合いそう");for(const p of x.pos)L.push(`${nameOf(p.src.by)}の★${p.src.rating}『${p.src.title}』と共通：${p.label}`);for(const n of x.neg)L.push(`注意：${nameOf(n.src.by)}の★${n.src.rating}『${n.src.title}』と同じ「${n.label}」`);return L}

// ---------- render ----------
function whoChip(id){return `<span class="who ${id===myId()?"w-me":"w-pt"}">${esc(nameOf(id))}</span>`}
function renderStats(){const y=String(today.getFullYear());const list=shown();const mine=list.filter(r=>r.by===myId());const yr=mine.filter(r=>(r.date||"").startsWith(y)).length;const films=new Set(list.filter(r=>(r.date||"").startsWith(y)).map(r=>filmKey(r.title))).size;const avg=mine.length?(mine.reduce((s,r)=>s+(r.rating||0),0)/mine.length).toFixed(1):"–";const now=CAT.filter(c=>status(c).k==="now").length;
 $("#stats").innerHTML=`<span><b>${yr}</b>本 ${y}年に自分が鑑賞</span><span><b>${films}</b>本 ふたりで記録</span><span><b>${avg}</b>自分の平均</span><span><b>${now}</b>本 上映中</span>`;
 $("#meRow").innerHTML=me?`<span>${esc(nameOf(me))}として記録中</span><button class="btn small" id="switchMe">切り替え</button>`:""}
function stubHTML(r){const c=findCat(r.title);const tags=[...new Set([...(r.genres||[]),...(c?c.g:[])])];const d=day(r.date);const key=filmKey(r.title);
 const others=shown().filter(o=>o.id!==r.id&&o.by!==r.by&&filmKey(o.title)===key);const mineR=r.by===myId()&&!r.sample;
 const canAlso=!r.sample&&r.by!==me&&!shown().some(o=>o.by===me&&filmKey(o.title)===key);
 return `<article class="stub"><div class="main" data-open="${esc(r.id)}"><h3>${esc(r.title)}</h3><div class="meta">${whoChip(r.by)} ${esc(fmtD(r.date))}${r.place?" ・ "+esc(r.place):""}${r.sample?" ・ サンプル":""}</div><div class="stars" aria-label="評価${r.rating}">${stars(r.rating||0)}</div>${r.text?`<p class="txt clamp">${esc(r.text)}</p>`:""}${others.map(o=>`<div class="pair">${whoChip(o.by)} <span class="stars">${stars(o.rating||0)}</span>${o.text?`<span class="ptxt">${esc(o.text.slice(0,60))}${o.text.length>60?"…":""}</span>`:""}</div>`).join("")}<div class="tags">${tags.map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div><div class="more" hidden>${mineR?`<div class="acts"><button data-edit="${esc(r.id)}">編集</button><button data-del="${esc(r.id)}">削除</button></div>`:""}${canAlso?`<div class="acts"><button data-also="${esc(r.id)}">自分の感想も書く</button></div>`:""}</div></div><div class="side"><small>${d?d.getFullYear():""}</small><span class="big">${d?(d.getMonth()+1)+"/"+d.getDate():"–"}</span><small>${esc((r.place||"").slice(0,8))}</small></div></article>`}
function renderLog(){const ids=people();$("#whoSeg").innerHTML=[["all","ふたり"],...ids.map(id=>[id,nameOf(id)])].map(([k,l])=>`<button data-who="${esc(k)}" aria-pressed="${who===k}">${esc(l)}</button>`).join("");
 const q=norm($("#q").value);let list=shown().slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));if(who!=="all")list=list.filter(r=>r.by===who);if(q)list=list.filter(r=>norm(r.title+r.text+r.place+(r.people||[]).join("")).includes(q));
 $("#sampleNote").hidden=!isSample();$("#list").innerHTML=list.length?list.map(stubHTML).join(""):`<p class="empty">該当する記録はありません</p>`}
const poster=c=>/^\/[\w./-]+$/.test(c.poster||"")?`<img class="poster" loading="lazy" alt="" src="https://image.tmdb.org/t/p/w185${esc(c.poster)}">`:"";
function recHTML(x,why){const c=x.c,st=x.st;const w=wants.find(v=>v.cid===c.id);const mine=w&&(w.by||[]).includes(me);const wb=w?(w.by||[]).filter(id=>id!==me):[];
 return `<article class="stub rec">${poster(c)}<div class="main"><h3><span class="badge ${st.k==="now"?"b-now":"b-soon"}">${esc(st.label)}</span>${esc(c.t)}</h3><div class="meta">${esc(fmtD(c.d))}公開 ・ ${esc(c.o)}${c.p.length?" ・ "+esc(c.p.slice(0,3).join("、")):""}</div>${c.s?`<p class="txt">${esc(c.s)}</p>`:""}<div class="tags">${c.g.map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div>${why.length?`<div class="why"><ul>${why.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>`:""}${wb.length?`<div class="pair">${wb.map(whoChip).join(" ")} も観たい</div>`:""}<div class="acts"><button data-want="${esc(c.id)}" class="${mine?"on":""}">${mine?"観たい済み":"観たい"}</button><button data-log="${esc(c.id)}">観た・記録する</button></div></div><div class="side"><small>おすすめ度</small><span class="big">${Math.max(0,Math.round(x.sc*10)/10)}</span></div></article>`}
function renderRec(){let r=recommend();if(recFilter!=="all")r=r.filter(x=>x.st.k===recFilter);const good=r.filter(x=>x.sc>0),rest=r.filter(x=>x.sc<=0);
 let h=isSample()?`<p class="note">サンプルの感想（ふたり分）から計算しています。</p>`:"";
 h+=good.length?good.slice(0,15).map(x=>recHTML(x,reasonText(x))).join(""):`<p class="empty">★4以上や★2以下の記録が増えると、好みに近い作品が上に来ます。</p>`;
 if(rest.length)h+=`<details><summary>その他の上映中・公開予定（${rest.length}本）</summary>${rest.map(x=>recHTML(x,reasonText(x))).join("")}</details>`;
 $("#recs").innerHTML=h}
function renderWant(){const rec=recommend("both");const list=wants.map(w=>CAT.find(c=>c.id===w.cid)).filter(Boolean).sort((a,b)=>a.d.localeCompare(b.d));
 const gone=wants.filter(w=>!CAT.some(c=>c.id===w.cid));
 $("#wants").innerHTML=(list.length?list.map(c=>recHTML({c,st:status(c),sc:rec.find(x=>x.c.id===c.id)?.sc||0},[])).join(""):`<p class="empty">おすすめから「観たい」を押すとここに並びます。ふたりの「観たい」が一緒に並びます。</p>`)+(gone.length?`<p class="note">上映が終わった作品：${gone.map(w=>esc(w.title)).join("、")}</p>`:"")}
function render(){renderStats();renderLog();if(!$("#v-rec").hidden)renderRec();if(!$("#v-want").hidden)renderWant()}

// ---------- form ----------
$("#fRate").innerHTML=[1,2,3,4,5].map(n=>`<button type="button" class="star" data-n="${n}" aria-label="${n}つ星">★</button>`).join("");
$("#fGenres").innerHTML=GENRES.map(g=>`<button type="button" class="chip" aria-pressed="false" data-g="${esc(g)}">${esc(g)}</button>`).join("");
function paintForm(){document.querySelectorAll(".star").forEach(b=>b.classList.toggle("on",+b.dataset.n<=rating));document.querySelectorAll("#fGenres .chip").forEach(b=>b.setAttribute("aria-pressed",selG.has(b.dataset.g)))}
const todayStr=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
function openForm(r,cat,pre){editing=r||null;$("#fStatus").textContent="";const src=r||pre;$("#f").hidden=false;$("#fTitle").value=src?src.title:(cat?cat.t:"");$("#fDate").value=src?src.date:todayStr();$("#fPlace").value=src?src.place||"":"";$("#fPeople").value=src?(src.people||[]).join("、"):(cat?cat.p.join("、"):"");$("#fText").value=r?r.text||"":"";rating=r?r.rating:0;selG=new Set(src?src.genres||[]:(cat?cat.g:[]));paintForm();matchHint();$("#fTitle").focus();$("#f").scrollIntoView({block:"start",behavior:"smooth"})}
function matchHint(){const c=findCat($("#fTitle").value);$("#fMatch").textContent=c?`作品データと一致：${c.d.slice(0,4)}年 ${c.o}`:""}
$("#fTitle").addEventListener("input",()=>{const c=findCat($("#fTitle").value);matchHint();if(c&&!editing){if(!selG.size){selG=new Set(c.g.filter(g=>GENRES.includes(g)));paintForm()}if(!$("#fPeople").value)$("#fPeople").value=c.p.join("、")}});
$("#fRate").addEventListener("click",e=>{const b=e.target.closest(".star");if(b){rating=+b.dataset.n;paintForm()}});
$("#fGenres").addEventListener("click",e=>{const b=e.target.closest(".chip");if(!b)return;const g=b.dataset.g;selG.has(g)?selG.delete(g):selG.add(g);paintForm()});
$("#newBtn").addEventListener("click",()=>openForm());
$("#cancel").addEventListener("click",()=>{$("#f").hidden=true;editing=null});
const withTimeout=(p,ms=15000)=>Promise.race([p,new Promise((_,rj)=>setTimeout(()=>rj({message:"通信がタイムアウトしました"}),ms))]);
$("#f").addEventListener("submit",async e=>{e.preventDefault();const hint=$("#fStatus");if(!$("#fTitle").value.trim()){hint.textContent="作品名を入れてください";return}if(!rating){hint.textContent="評価の★を選んでください";return}hint.textContent="保存しています…";
 const o={id:editing?editing.id:"r"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),by:me,title:$("#fTitle").value.trim(),date:$("#fDate").value||null,place:$("#fPlace").value.trim(),rating,genres:[...selG],people:$("#fPeople").value.split(/[、,，]/).map(s=>s.trim()).filter(Boolean),text:$("#fText").value.trim(),updated_at:new Date().toISOString()};
 const btn=$("#f").querySelector('button[type=submit]');if(btn)btn.disabled=true;
 try{await withTimeout(db.saveReview(o));hint.textContent="";const c=findCat(o.title);const w=c&&wants.find(v=>v.cid===c.id);if(w&&(w.by||[]).includes(me)){const rest=w.by.filter(id=>id!==me);rest.length?await db.saveWant({...w,by:rest}):await db.delWant(w.cid)}$("#f").hidden=true;editing=null;await loadData()}catch(err){hint.textContent="保存できませんでした："+[err?.code,err?.message,err?.details,err?.hint].filter(Boolean).join(" / ")}
 if(btn)btn.disabled=false});
$("#q").addEventListener("input",renderLog);
$("#whoSeg").addEventListener("click",e=>{const b=e.target.closest("[data-who]");if(!b)return;who=b.dataset.who;renderLog()});

// ---------- list actions ----------
$("#list").addEventListener("click",async e=>{const t=e.target;const ed=t.closest("[data-edit]"),dl=t.closest("[data-del]"),also=t.closest("[data-also]"),op=t.closest("[data-open]"),yes=t.closest("[data-yes]"),no=t.closest("[data-no]");
 if(ed){openForm(reviews.find(r=>r.id===ed.dataset.edit));return}
 if(also){openForm(null,null,reviews.find(x=>x.id===also.dataset.also));return}
 if(dl){dl.closest(".acts").outerHTML=`<div class="confirm">この記録を削除しますか？<button class="btn" data-yes="${esc(dl.dataset.del)}">削除する</button><button class="btn ghost" data-no="1">残す</button></div>`;return}
 if(yes){try{await db.delReview(yes.dataset.yes);await loadData()}catch(err){showMsg("削除できませんでした")}return}
 if(no){renderLog();return}
 if(op&&!t.closest("button")){const m=op.querySelector(".more"),x=op.querySelector(".txt");if(m)m.hidden=!m.hidden;if(x)x.classList.toggle("clamp")}});
async function toggleWant(cid){const c=CAT.find(x=>x.id===cid);const w=wants.find(v=>v.cid===cid);try{if(w&&(w.by||[]).includes(me)){const rest=w.by.filter(id=>id!==me);rest.length?await db.saveWant({...w,by:rest}):await db.delWant(cid)}else await db.saveWant({cid,title:c?c.t:"",by:[...((w&&w.by)||[]),me]});await loadData()}catch(e){showMsg("保存できませんでした")}}
function recClick(e){const w=e.target.closest("[data-want]"),l=e.target.closest("[data-log]");if(w&&!isSample())toggleWant(w.dataset.want);if(w&&isSample())showMsg("最初の感想を保存すると「観たい」も使えます");if(l){showTab("log");openForm(null,CAT.find(c=>c.id===l.dataset.log))}}
$("#recs").addEventListener("click",recClick);$("#wants").addEventListener("click",recClick);
$("#recSeg").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;recFilter=b.dataset.f;document.querySelectorAll("#recSeg button").forEach(x=>x.setAttribute("aria-pressed",x===b));renderRec()});
$("#modeSeg").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;recMode=b.dataset.m;document.querySelectorAll("#modeSeg button").forEach(x=>x.setAttribute("aria-pressed",x===b));renderRec()});

// ---------- tabs ----------
function showTab(n){for(const k of["log","rec","want"]){$("#v-"+k).hidden=k!==n;$("#t-"+k).setAttribute("aria-selected",k===n)}if(n==="rec")renderRec();if(n==="want")renderWant();try{history.replaceState(null,"","#"+n)}catch(e){}}
$("#t-log").addEventListener("click",()=>showTab("log"));$("#t-rec").addEventListener("click",()=>showTab("rec"));$("#t-want").addEventListener("click",()=>showTab("want"));

// ---------- login ----------
function showLogin(){$("#login").hidden=false;$("#app").hidden=true;
 $("#whoPick").innerHTML=MEMBERS.map(m=>`<button type="button" class="chip" data-me="${esc(m.id)}" aria-pressed="${me===m.id}">${esc(m.name)}</button>`).join("")}
function showApp(){$("#login").hidden=true;$("#app").hidden=false;render();loadData();const h=location.hash.slice(1);if(["log","rec","want"].includes(h))showTab(h)}
$("#whoPick").addEventListener("click",e=>{const b=e.target.closest("[data-me]");if(!b)return;me=b.dataset.me;LS.set("cine_me",me);document.querySelectorAll("#whoPick .chip").forEach(x=>x.setAttribute("aria-pressed",x===b))});
$("#loginForm").addEventListener("submit",e=>{e.preventDefault();const err=$("#loginErr");err.textContent="";if(!me){err.textContent="どちらが使うか選んでください";return}showApp()});
$("#meRow").addEventListener("click",e=>{if(e.target.closest("#switchMe"))showLogin()});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&!$("#app").hidden)loadData()});
window.addEventListener("hashchange",()=>{const k=location.hash.slice(1);if(["log","rec","want"].includes(k))showTab(k)});

(async()=>{await loadCatalog();
 // 専用リンク（?k=…）で開いたら合言葉キーをこの端末に保存し、URLからは消す
 const u=new URL(location.href);const k=u.searchParams.get("k");if(k){LS.set("cine_key",k);u.searchParams.delete("k");try{history.replaceState(null,"",u.pathname+u.search+u.hash)}catch(e){}}
 const key=LS.get("cine_key","");
 if(!window.supabase||!CFG.SUPABASE_URL||CFG.SUPABASE_URL.includes("xxxx")){$("#login").hidden=false;$("#loginForm").hidden=true;$("#setupNote").hidden=false;return}
 if(!key){$("#login").hidden=false;$("#loginForm").hidden=true;$("#keyNote").hidden=false;return}
 sb=window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY,{auth:{persistSession:false},global:{headers:{"x-family-key":key}}});
 if(me)showApp();else showLogin()})();
}
