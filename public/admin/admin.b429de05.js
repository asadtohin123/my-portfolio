
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
function el(tag,attrs,...kids){const e=document.createElement(tag);for(const k in(attrs||{})){const v=attrs[k];if(k==="class")e.className=v;else if(k.startsWith("on"))e[k]=v;else if(v===true)e.setAttribute(k,"");else if(v!==false&&v!=null)e.setAttribute(k,v)}kids.flat().forEach(c=>e.append(c&&c.nodeType?c:document.createTextNode(c==null?"":c)));return e}
const clone=o=>JSON.parse(JSON.stringify(o));
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
let TOKEN="";try{TOKEN=sessionStorage.getItem("tk")||""}catch(e){}
let DATA=null,DEFAULT=null,VERSION=0,dirty=false,SECTION="site",INBOX=0;
const OPEN=new WeakSet();

/* ---------- api ---------- */
async function api(path,opts={}){
  const h=Object.assign({},opts.headers||{});if(TOKEN)h.authorization="Bearer "+TOKEN;
  const r=await fetch(path,Object.assign({},opts,{headers:h}));
  const ct=r.headers.get("content-type")||"";const j=ct.includes("json")?await r.json():null;
  if(r.status===401&&TOKEN){logout();throw new Error((j&&j.error)||"Please log in again.")}
  if(!r.ok)throw new Error((j&&j.error)||"Error "+r.status);
  return j;
}
let tt;function toast(m,bad){const t=$("#toast");t.textContent=m;t.className="show"+(bad?" bad":"");clearTimeout(tt);tt=setTimeout(()=>t.className="",bad?4500:2400)}

/* ---------- field helpers ---------- */
const PLATFORMS={
  scholar:{name:"Google Scholar",bg:"#4285F4",fg:"#fff",t:"GS",g:"Research and academic"},
  orcid:{name:"ORCID",bg:"#A6CE39",fg:"#1B2B00",t:"iD",g:"Research and academic"},
  researchgate:{name:"ResearchGate",bg:"#00A896",fg:"#fff",t:"RG",g:"Research and academic"},
  bohrium:{name:"Bohrium",bg:"#6C4DFF",fg:"#fff",t:"Bo",g:"Research and academic"},
  scopus:{name:"Scopus",bg:"#E9711C",fg:"#fff",t:"Sc",g:"Research and academic"},
  wos:{name:"Web of Science",bg:"#5E33BF",fg:"#fff",t:"WoS",g:"Research and academic"},
  ieee:{name:"IEEE Xplore",bg:"#00629B",fg:"#fff",t:"IEEE",g:"Research and academic"},
  semantic:{name:"Semantic Scholar",bg:"#1857B6",fg:"#fff",t:"SS",g:"Research and academic"},
  academia:{name:"Academia.edu",bg:"#2B2B2B",fg:"#fff",t:"Ac",g:"Research and academic"},
  mendeley:{name:"Mendeley",bg:"#B6232A",fg:"#fff",t:"Me",g:"Research and academic"},
  dblp:{name:"dblp",bg:"#004F9F",fg:"#fff",t:"db",g:"Research and academic"},
  arxiv:{name:"arXiv",bg:"#B31B1B",fg:"#fff",t:"aX",g:"Research and academic"},
  ssrn:{name:"SSRN",bg:"#1C6BBA",fg:"#fff",t:"SSRN",g:"Research and academic"},
  zenodo:{name:"Zenodo",bg:"#0B66B2",fg:"#fff",t:"Ze",g:"Research and academic"},
  figshare:{name:"Figshare",bg:"#556472",fg:"#fff",t:"Fs",g:"Research and academic"},
  osf:{name:"OSF",bg:"#2E5E89",fg:"#fff",t:"OSF",g:"Research and academic"},
  collabratec:{name:"IEEE Collabratec",bg:"#00629B",fg:"#fff",t:"Co",g:"Research and academic"},
  sciprofiles:{name:"SciProfiles",bg:"#1E5AA8",fg:"#fff",t:"SP",g:"Research and academic"},
  loop:{name:"Frontiers Loop",bg:"#2F9A6B",fg:"#fff",t:"Lp",g:"Research and academic"},
  overleaf:{name:"Overleaf",bg:"#138A07",fg:"#fff",t:"Ov",g:"Research and academic"},
  linkedin:{name:"LinkedIn",bg:"#0A66C2",fg:"#fff",t:"in",g:"Engineering and professional"},
  github:{name:"GitHub",bg:"#24292F",fg:"#fff",t:"Gh",g:"Engineering and professional"},
  gitlab:{name:"GitLab",bg:"#FC6D26",fg:"#fff",t:"GL",g:"Engineering and professional"},
  stackoverflow:{name:"Stack Overflow",bg:"#F48024",fg:"#1B1000",t:"SO",g:"Engineering and professional"},
  kaggle:{name:"Kaggle",bg:"#20BEFF",fg:"#00212E",t:"Kg",g:"Engineering and professional"},
  huggingface:{name:"Hugging Face",bg:"#FFCC4D",fg:"#2B2000",t:"HF",g:"Engineering and professional"},
  hackaday:{name:"Hackaday.io",bg:"#1A1A1A",fg:"#fff",t:"Hd",g:"Engineering and professional"},
  hackster:{name:"Hackster.io",bg:"#2E9AD0",fg:"#fff",t:"Hs",g:"Engineering and professional"},
  medium:{name:"Medium",bg:"#111111",fg:"#fff",t:"M",g:"Engineering and professional"},
  devto:{name:"DEV Community",bg:"#0A0A0A",fg:"#fff",t:"DEV",g:"Engineering and professional"},
  leetcode:{name:"LeetCode",bg:"#FFA116",fg:"#1A1A1A",t:"LC",g:"Engineering and professional"},
  codepen:{name:"CodePen",bg:"#1E1F26",fg:"#fff",t:"Cp",g:"Engineering and professional"},
  notion:{name:"Notion",bg:"#222222",fg:"#fff",t:"N",g:"Engineering and professional"},
  substack:{name:"Substack",bg:"#FF6719",fg:"#fff",t:"Sb",g:"Engineering and professional"},
  behance:{name:"Behance",bg:"#1769FF",fg:"#fff",t:"Be",g:"Engineering and professional"},
  youtube:{name:"YouTube",bg:"#E62117",fg:"#fff",t:"YT",g:"Engineering and professional"},
  facebook:{name:"Facebook",bg:"#1877F2",fg:"#fff",t:"f",g:"Social media"},
  instagram:{name:"Instagram",bg:"#E1306C",fg:"#fff",t:"Ig",g:"Social media"},
  x:{name:"X (Twitter)",bg:"#111111",fg:"#fff",t:"X",g:"Social media"},
  telegram:{name:"Telegram",bg:"#229ED9",fg:"#fff",t:"Tg",g:"Social media"},
  pinterest:{name:"Pinterest",bg:"#E60023",fg:"#fff",t:"P",g:"Social media"},
  tiktok:{name:"TikTok",bg:"#111111",fg:"#fff",t:"Tk",g:"Social media"},
  threads:{name:"Threads",bg:"#111111",fg:"#fff",t:"Th",g:"Social media"},
  snapchat:{name:"Snapchat",bg:"#FFFC00",fg:"#111",t:"Sn",g:"Social media"},
  reddit:{name:"Reddit",bg:"#FF4500",fg:"#fff",t:"Rd",g:"Social media"},
  quora:{name:"Quora",bg:"#B92B27",fg:"#fff",t:"Q",g:"Social media"},
  discord:{name:"Discord",bg:"#5865F2",fg:"#fff",t:"Dc",g:"Social media"},
  whatsappchannel:{name:"WhatsApp Channel",bg:"#25D366",fg:"#06260F",t:"WA",g:"Social media"},
  linktree:{name:"Linktree",bg:"#43E660",fg:"#06220D",t:"Lt",g:"Social media"},
  website:{name:"Website",bg:"#0F3D3A",fg:"#fff",t:"www",g:"Other"},
  other:{name:"Other",bg:"#4A5D5A",fg:"#fff",t:"\u2197",g:"Other"}
};
function platformOf(p){
  if(p&&p.platform&&PLATFORMS[p.platform])return p.platform;
  const url=String((p&&p.url)||"").toLowerCase(),label=String((p&&p.label)||"").toLowerCase();
  const hosts=[["facebook",/(facebook\.com|fb\.com|fb\.me)/],["instagram",/instagram\.com/],["x",/(^|\/\/|\.)(x|twitter)\.com/],["linkedin",/linkedin\.com/],["youtube",/(youtube\.com|youtu\.be)/],["telegram",/(t\.me|telegram\.)/],["pinterest",/pinterest\./],["tiktok",/tiktok\.com/],["github",/github\.com/],["gitlab",/gitlab\.com/],["stackoverflow",/stackoverflow\.com/],["kaggle",/kaggle\.com/],["huggingface",/huggingface\.co/],["hackaday",/hackaday\.io/],["hackster",/hackster\.io/],["behance",/behance\.net/],["medium",/medium\.com/],["scholar",/scholar\.google/],["orcid",/orcid\.org/],["researchgate",/researchgate\.net/],["bohrium",/bohrium\.com/],["scopus",/scopus\.com/],["wos",/(webofscience|publons)\./],["ieee",/ieeexplore|ieee\.org/],["semantic",/semanticscholar\.org/],["academia",/academia\.edu/],["mendeley",/mendeley\.com/],["dblp",/dblp\.org/],["arxiv",/arxiv\.org/],["ssrn",/ssrn\.com/],["zenodo",/zenodo\.org/],["figshare",/figshare\.com/],["osf",/osf\.io/],["threads",/threads\.net/],["snapchat",/snapchat\.com/],["reddit",/reddit\.com/],["quora",/quora\.com/],["discord",/discord\.(gg|com)/],["whatsappchannel",/whatsapp\.com\/channel/],["collabratec",/collabratec/],["sciprofiles",/sciprofiles\.com/],["loop",/loop\.frontiersin/],["overleaf",/overleaf\.com/],["devto",/dev\.to/],["leetcode",/leetcode\.com/],["codepen",/codepen\.io/],["notion",/notion\.(so|site)/],["substack",/substack\.com/],["linktree",/linktr\.ee/]];
  for(const [k,re] of hosts)if(re.test(url))return k;
  const names=[["facebook",/facebook/],["instagram",/instagram/],["x",/^(x|twitter)\b|x \(twitter\)/],["linkedin",/linkedin/],["youtube",/youtube/],["telegram",/telegram/],["pinterest",/pinterest/],["tiktok",/tiktok/],["github",/github/],["gitlab",/gitlab/],["stackoverflow",/stack ?overflow/],["kaggle",/kaggle/],["huggingface",/hugging/],["hackaday",/hackaday/],["hackster",/hackster/],["behance",/behance/],["medium",/medium/],["scholar",/scholar/],["orcid",/orcid/],["researchgate",/researchgate/],["bohrium",/bohrium/],["scopus",/scopus/],["wos",/web of science|publons/],["ieee",/ieee/],["semantic",/semantic/],["academia",/academia/],["mendeley",/mendeley/],["dblp",/dblp/],["arxiv",/arxiv/],["ssrn",/ssrn/],["zenodo",/zenodo/],["figshare",/figshare/],["osf",/\bosf\b/],["threads",/threads/],["snapchat",/snapchat/],["reddit",/reddit/],["quora",/quora/],["discord",/discord/],["whatsappchannel",/whatsapp/],["collabratec",/collabratec/],["sciprofiles",/sciprofiles/],["loop",/frontiers/],["overleaf",/overleaf/],["devto",/\bdev\b/],["leetcode",/leetcode/],["codepen",/codepen/],["notion",/notion/],["substack",/substack/],["linktree",/linktree/]];
  for(const [k,re] of names)if(re.test(label))return k;
  return "other";
}
const PNAMES=Object.fromEntries(Object.entries(PLATFORMS).map(([k,v])=>[k,v.name]));
const F=(key,label,type="text",o={})=>{if(type&&typeof type==="object"){o=Object.assign({},type,o);type="text"}return Object.assign({key,label,type},o)};
const catOpts=(id,none)=>{const l=((DATA.categories||{})[id]||[]).map(c=>c.name).filter(Boolean);return none?["",...l]:l};
const sel=(id,key="cat",label="Tab",none)=>F(key,label,"select",{options:()=>catOpts(id,none),labels:{"":"(no tab)"}});
const dur=(a,b)=>{ // a, b are YYYY-MM, both months counted
  const [ya,ma]=a.split("-").map(Number),[yb,mb]=b.split("-").map(Number);
  const n=(yb-ya)*12+(mb-ma)+1;if(n<1)return null;
  const y=Math.floor(n/12),m=n%12,p=(k,w)=>k+" "+w+(k===1?"":"s");
  const len=y&&m?p(y,"Year")+" "+p(m,"Month"):y?p(y,"Year"):p(m,"Month");
  return {text:`${len} (${MONTHS[ma-1]} ${ya} – ${MONTHS[mb-1]} ${yb})`,passing:String(yb)};
};
const mname=v=>{const m=/^(\d{4})-(\d{2})$/.exec(v||"");return m?MONTHS[+m[2]-1]+" "+m[1]:""};

/* ---------- section definitions (what each page edits) ---------- */
const DEFS={
 experience:{key:"experience",addLabel:"+ Add job",cat:"type",title:i=>[i.role,i.org].filter(Boolean).join(" at "),
  blank:{role:"",org:"",type:"Full-time",start:"",end:"Present",website:"",email:"",location:"",tags:[],summary:"",points:[],noTotal:false},
  intro:"Pick the start and end months from the calendar. The total experience and each job’s duration are worked out automatically. Switch on “Do not count this” for internships and research roles.",
  item:()=>[F("role","Job title"),F("org","Company"),sel("experience","type","Employment type (tab)"),F("location","Job location"),
   F("start","Start month","month"),F("end","End month","endmonth",{rerender:true}),F("website","Company website"),F("email","Office email (current job only)",{},{show:o=>String(o.end||"").toLowerCase()==="present"}),
   F("summary","One-line summary",{},{wide:true}),F("points","Responsibilities (one per line)","lines",{wide:true}),F("noTotal","Do not count this in my total work experience (use for internships and research roles)","bool"),F("tags","Related interests","interestTags",{wide:true})]},
 education:{key:"education",addLabel:"+ Add education",title:i=>i.degree,blank:{degree:"",detail:"",from:"",to:"",passing:"",duration:"",credits:"",note:""},
  intro:"Pick the start and end months. Duration and passing year are filled in for you.",
  item:()=>[F("degree","Degree or certificate",{},{wide:true}),F("detail","City, country, group or board",{},{wide:true}),
   F("range","Study period","range",{kind:"education",rerender:true}),F("passing","Passing year"),F("duration","Duration"),F("credits","Total credits (optional)"),F("european","European equivalent, for example 240 ECTS, EQF Level 6 (optional)"),F("note","Note (optional)","area",{wide:true})]},
 certifications:{key:"certifications",addLabel:"+ Add certificate",cat:"cat",title:i=>i.title,blank:{cat:"Online courses",title:"",issuer:"",date:"",detail:"",link:"",image:""},
  intro:"Upload each certificate as an image (about 1600 x 1131 px). It is resized and compressed for you.",
  item:()=>[sel("certifications","cat","Type (tab)"),F("title","Title"),F("issuer","Issued by"),F("date","Date","month"),F("detail","Position, duration or hours"),F("link","Verification link (optional)"),F("image","Certificate image","image",{max:1600,wide:true})],
  extra:main=>{const b=el("div",{class:"panel"},el("h3",{},"Moving strip"));main.append(b);renderFields(b,DATA,[F("motion","Motion","object",{wide:true,fields:[F("certDirection","Direction","select",{options:["rtl","ltr"],labels:{rtl:"Right to left",ltr:"Left to right"}}),F("certSpeed","Speed (pixels per second)","num")]})])}},
 skills:{key:"skills",addLabel:"+ Add skill group",title:i=>i.group,blank:{group:"",items:[]},intro:"Each group is a tab. The first three groups are the “Top skills” shown first.",item:()=>[F("group","Group name",{},{wide:true}),F("items","Skills (one per line)","lines",{wide:true})]},
 research:{key:"pubs",addLabel:"+ Add paper",title:i=>i.title,blank:{venue:"",year:"",badge:"",title:"",authors:"",abstract:"",doi:"",tags:[]},
  item:()=>[F("title","Paper title",{},{wide:true}),F("authors","Authors",{},{wide:true}),F("venue","Conference or journal"),F("year","Year","year"),F("badge","Award (optional)"),F("doi","Paper link or DOI"),F("url2","Second link (optional), for example ResearchGate"),F("label2","Name of the second link"),F("abstract","Short summary","area",{wide:true}),F("tags","Related interests","interestTags",{wide:true})]},
 interests:{key:"interests",addLabel:"+ Add interest",title:i=>i.title,blank:{id:"",title:"",text:""},intro:"The short id (for example iot) links an interest to jobs, papers and projects.",
  item:()=>[F("title","Interest"),F("id","Short id (lowercase, no spaces)"),F("text","One-line description","text",{wide:true})]},
 projects:{key:"projects",addLabel:"+ Add project",title:i=>i.title,blank:{title:"",status:"",text:"",points:[],tags:[]},
  item:()=>[F("title","Project name",{},{wide:true}),F("status","Status or year"),F("flagship","Show as the large featured project","bool"),F("text","What it is","area",{wide:true}),F("points","Details (one per line)","lines",{wide:true}),F("tags","Related interests","interestTags",{wide:true})]},
 achievements:{key:"achievements",addLabel:"+ Add achievement",cat:"cat",title:i=>i.title,blank:{year:"",cat:"Award",title:"",text:""},
  item:()=>[F("title","Title",{},{wide:true}),F("year","Year","year"),sel("achievements","cat","Type (tab)"),F("text","One or two sentences","area",{wide:true})]},
 recommendations:{key:"recommendations",addLabel:"+ Add reference",cat:"type",title:i=>i.name,blank:{type:"Professional",quote:"",name:"",position:"",org:"",relation:"",email:""},
  intro:"Send people your recommendation link. What they write appears on your website, and you can reply, hide or delete it here.",
  item:()=>[F("name","Name"),sel("recommendations","type","Type (tab)"),F("position","Position"),F("org","Organisation"),F("relation","Relationship"),F("email","Email"),F("quote","What they say","area",{wide:true})]},
 activities:{key:"activities",addLabel:"+ Add activity",cat:"cat",title:i=>i.title,blank:{cat:"Volunteering",title:"",role:"",from:"",to:"",ongoing:false,when:"",text:"",points:[],areas:[]},
  item:()=>[F("title","Title",{},{wide:true}),sel("activities","cat","Type (tab)"),F("role","Your role"),F("range","Dates","range",{kind:"activity",ongoing:true,rerender:true}),F("when","Dates as shown on the website"),F("text","Description","area",{wide:true}),F("points","What you did (one per line)","lines",{wide:true}),F("areas","Focus areas (one per line)","lines",{wide:true})]},
 languages:{key:"languages",addLabel:"+ Add language",title:i=>i.lang,blank:{lang:"",level:""},item:()=>[F("lang","Language"),F("level","Level")]},
 gallery:{key:"gallery",addLabel:"+ Add frame",cat:"cat",title:i=>i.title,blank:{cat:"Events",title:"",photos:[{caption:"",src:""}]},
  intro:"Each frame holds several photos that slide automatically. Or make a video frame that holds several YouTube videos; visitors move between them with the arrows.",
  item:()=>[F("title","Frame title"),sel("gallery","cat","Category (tab)"),F("type","Frame type","mediaType",{options:["photo","video"],rerender:true}),
   F("videos","Videos","list",{wide:true,addLabel:"+ Add video",show:o=>o.type==="video",title:i=>i.caption||i.url||"Video",blank:{url:"",caption:""},item:[F("url","YouTube link",{},{wide:true,help:"On YouTube press Share, then Copy, and paste it here."}),F("caption","Title shown under the video",{},{wide:true})]}),
   F("photos","Photos","list",{wide:true,addLabel:"+ Add photo",show:o=>o.type!=="video",title:i=>i.caption||"Photo",blank:{caption:"",src:""},item:[F("src","Photo","image",{max:1600,wide:true}),F("caption","Caption",{},{wide:true})]})]},
 references:{key:"references",addLabel:"+ Add referee",cat:"type",title:i=>i.name,blank:{type:"Professional",name:"",position:"",org:"",orgWebsite:"",location:"",email:"",profile:""},
  intro:"Your referees: name, designation, current organisation, location and email. Drag the dots to choose who is shown first. Add the organisation’s website to make its name a link. If you add a profile link (LinkedIn or portfolio), the name becomes a link; without it the name is plain text.",
  item:()=>[F("name","Name"),sel("references","type","Type (tab)"),F("position","Designation",{},{wide:true}),F("org","Current organisation"),F("orgWebsite","Organisation website (optional)"),F("location","Location"),F("email","Email"),F("profile","Profile link (LinkedIn or portfolio, optional)","text",{wide:true,help:"If filled, clicking the name opens this link."})]},
 contact:{special:"contact"}
};
const customDef=id=>({custom:true,addLabel:"+ Add card",cat:"cat",title:i=>i.title,blank:{title:"",subtitle:"",cat:"",text:"",link:"",linkText:"",image:""},
  intro:"The cards of this section. Give them a tab if you want visitors to filter them.",
  item:()=>[F("title","Title",{},{wide:true}),F("subtitle","Subtitle"),sel(id,"cat","Tab (optional)",true),F("text","Text","area",{wide:true}),F("link","Link (optional)"),F("linkText","Link button text"),F("image","Image (optional)","image",{max:1200,wide:true})]});
const defFor=id=>DEFS[id]||((DATA.sections||[]).find(s=>s.id===id&&s.custom)?customDef(id):null);
const cfgOf=id=>DATA.sections.find(s=>s.id===id);
const itemsOf=id=>{const d=defFor(id);if(!d)return[];if(d.custom){DATA.custom[id]=DATA.custom[id]||[];return DATA.custom[id]}return DATA[d.key]||[]};

/* ---------- placeholders ---------- */
const hasPh=v=>typeof v==="string"?v.includes("[["):Array.isArray(v)?v.some(hasPh):v&&typeof v==="object"?Object.values(v).some(hasPh):false;
const countPh=v=>typeof v==="string"?(v.includes("[[")?1:0):Array.isArray(v)?v.reduce((n,x)=>n+countPh(x),0):v&&typeof v==="object"?Object.values(v).reduce((n,x)=>n+countPh(x),0):0;
function phFor(id){
  if(id==="site")return ["photo","email","whatsapp","cv","profiles"].reduce((n,k)=>n+countPh(DATA[k]),0);
  if(id==="hero")return countPh(DATA.hero);
  const d=defFor(id);if(!d||d.special)return 0;
  return countPh(itemsOf(id));
}

/* ---------- uploads ---------- */
const MAXB=900000;
async function prepImage(file,max){
  if(file.type==="application/pdf")return file;
  const bmp=await createImageBitmap(file);let scale=Math.min(1,max/Math.max(bmp.width,bmp.height));
  for(let t=0;t<5;t++){
    const w=Math.round(bmp.width*scale),h=Math.round(bmp.height*scale),c=document.createElement("canvas");c.width=w;c.height=h;
    const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,w,h);g.drawImage(bmp,0,0,w,h);
    for(let q=.88;q>=.5;q-=.12){const b=await new Promise(r=>c.toBlob(r,"image/jpeg",q));if(b.size<=MAXB)return b}
    scale*=.8;
  }
  throw new Error("That image is too large even after compression.");
}
async function upload(file,max){
  const blob=await prepImage(file,max||1600);
  if(blob.size>1300000)throw new Error("That file is larger than 1.3 MB. For a CV, paste a Google Drive link instead.");
  const j=await api("/api/media?name="+encodeURIComponent(file.name),{method:"POST",headers:{"content-type":blob.type},body:blob});
  return j.url;
}
function pickFile(accept){return new Promise(res=>{const i=el("input",{type:"file",accept});i.onchange=()=>res(i.files[0]||null);i.click()})}

/* ---------- change tracking ---------- */
function changed(){dirty=true;updateBar();clearTimeout(changed.t);changed.t=setTimeout(refreshNav,300)}
function updateBar(){const s=$("#status");s.textContent=dirty?"Unsaved changes":(VERSION?"All changes saved (version "+VERSION+")":"");s.className="status"+(dirty?" dirty":"")}

/* ---------- drag to reorder (mouse and touch) ---------- */
function sortable(box,onDone){
  box.addEventListener("pointerdown",e=>{
    const h=e.target.closest(".drag");if(!h)return;
    const item=h.closest("[data-sort]");if(!item||item.parentElement!==box)return;
    e.preventDefault();item.classList.add("dragging");
    let moved=false;
    const sibs=()=>[...box.children].filter(c=>c!==item&&c.dataset.sort!==undefined);
    /* listen on the window: the handle is moved in the page while dragging, so it can lose the pointer */
    const move=ev=>{
      moved=true;let before=null;
      for(const c of sibs()){const r=c.getBoundingClientRect();if(ev.clientY<r.top+r.height/2){before=c;break}}
      const ref=before||box.querySelector(":scope > .addrow");
      if(ref!==item.nextSibling)box.insertBefore(item,ref);
      if(ev.clientY<90)scrollBy(0,-14);else if(ev.clientY>innerHeight-90)scrollBy(0,14);
    };
    const end=()=>{
      removeEventListener("pointermove",move);removeEventListener("pointerup",end);removeEventListener("pointercancel",end);
      item.classList.remove("dragging");
      if(moved)onDone([...box.children].filter(c=>c.dataset.sort!==undefined).map(c=>+c.dataset.sort));
    };
    addEventListener("pointermove",move);addEventListener("pointerup",end);addEventListener("pointercancel",end);
  });
}

/* ---------- form fields ---------- */
function renderFields(box,obj,fields){
  function draw(){
    box.innerHTML="";
    const grid=el("div",{class:"fields"});box.append(grid);
    fields.forEach(f=>{
      if(f.show&&!f.show(obj))return;
      const wrap=el("div",{class:"f"+((f.wide||["area","lines","list","object","interestTags","image","file","range"].includes(f.type))?" wide":"")});
      const val=obj[f.key];
      const lab=el("label",{},f.label);
      const mark=inp=>{if(hasPh(obj[f.key]))inp.classList.add("ph")};
      const on=()=>{changed();if(f.rerender)draw()};
      const picker=i=>i.addEventListener("click",()=>{try{i.showPicker&&i.showPicker()}catch(e){}});
      switch(f.type){
        case"select":case"mediaType":{
          const cur=f.type==="mediaType"?(obj.type==="video"?"video":"photo"):(obj[f.key]==null?"":obj[f.key]);
          let opts=typeof f.options==="function"?f.options():f.options.slice();
          if(cur!==""&&!opts.includes(cur))opts=[cur,...opts];
          if(!opts.length)opts=[""];
          const s=el("select",{},opts.map(o=>el("option",{value:o,selected:o===cur},(f.labels&&f.labels[o])!==undefined?f.labels[o]:(o===""?"(none)":o))));
          if(cur===""&&!opts.includes(""))s.value=opts[0];
          s.onchange=()=>{if(f.onPick)f.onPick(obj,s.value,obj[f.key]);if(f.type==="mediaType"){if(s.value==="photo")delete obj.type;else obj.type="video";if(s.value==="photo"&&!obj.photos)obj.photos=[{caption:"",src:""}];if(s.value==="video"&&(!obj.videos||!obj.videos.length)){obj.videos=[{url:"",caption:""}];OPEN.add(obj.videos[0])}}else obj[f.key]=s.value;on()};
          wrap.append(lab,s);break}
        case"area":{const t=el("textarea",{});t.value=val||"";mark(t);t.onfocus=()=>{if(t.value.includes("[["))t.select()};t.oninput=()=>{obj[f.key]=t.value;t.classList.toggle("ph",hasPh(t.value));on()};wrap.append(lab,t);if(f.help)wrap.append(el("div",{class:"hint"},f.help));break}
        case"lines":{const t=el("textarea",{});t.value=(val||[]).join("\n");if(hasPh(val))t.classList.add("ph");t.oninput=()=>{obj[f.key]=t.value.split("\n");t.classList.toggle("ph",t.value.includes("[["));on()};wrap.append(lab,t);break}
        case"num":{const i=el("input",{type:"number",step:"any"});i.value=val==null?"":val;i.oninput=()=>{obj[f.key]=i.value===""?"":Number(i.value);on()};wrap.append(lab,i);break}
        case"year":{
          const now=new Date().getFullYear(),ys=[];for(let y=now+1;y>=1985;y--)ys.push(String(y));
          const cur=val==null?"":String(val);if(cur&&!ys.includes(cur))ys.unshift(cur);
          const s=el("select",{},[el("option",{value:""},"(choose year)"),...ys.map(y=>el("option",{value:y,selected:y===cur},y))]);
          s.onchange=()=>{obj[f.key]=s.value===""?"":(typeof val==="number"?Number(s.value):s.value);on()};
          wrap.append(lab,s);break}
        case"bool":{const i=el("input",{type:"checkbox"});i.checked=!!val;i.onchange=()=>{obj[f.key]=i.checked;on()};wrap.append(el("label",{class:"chk"},i,f.label));break}
        case"date":{
          const i=el("input",{type:"date"});const ok=/^\d{4}-\d{2}-\d{2}$/.test(val||"");i.value=ok?val:"";picker(i);
          i.onchange=()=>{obj[f.key]=i.value;on()};
          wrap.append(lab,i);if(!ok&&val)wrap.append(el("div",{class:"hint ph"},"Placeholder: "+val+" (pick a date to replace it)"));break}
        case"month":{
          const i=el("input",{type:"month"});const ok=/^\d{4}-\d{2}(-\d{2})?$/.test(val||"");i.value=ok?String(val).slice(0,7):"";picker(i);
          i.onchange=()=>{obj[f.key]=i.value;on()};
          wrap.append(lab,i);
          if(!ok&&val)wrap.append(el("div",{class:"hint ph"},hasPh(val)?"Placeholder: "+val+" (pick a month to replace it)":"Now: "+val+" (pick a month to be more exact)"));break}
        case"endmonth":{
          const pres=String(val||"").toLowerCase()==="present";
          const i=el("input",{type:"month",disabled:pres});const ok=/^\d{4}-\d{2}(-\d{2})?$/.test(val||"");i.value=ok?String(val).slice(0,7):"";picker(i);
          const c=el("input",{type:"checkbox",checked:pres});
          c.onchange=()=>{i.disabled=c.checked;obj[f.key]=c.checked?"Present":(i.value||"");on()};
          i.onchange=()=>{obj[f.key]=i.value;on()};
          wrap.append(lab,i,el("label",{class:"chk"},c,"Still working here (Present)"));
          if(!ok&&!pres&&val)wrap.append(el("div",{class:"hint ph"},hasPh(val)?"Placeholder: "+val:"Now: "+val+" (pick a month to be more exact)"));break}
        case"enddate":{
          const pres=String(val||"").toLowerCase()==="present";
          const i=el("input",{type:"date",disabled:pres});const ok=/^\d{4}-\d{2}-\d{2}$/.test(val||"");i.value=ok?val:"";picker(i);
          const c=el("input",{type:"checkbox",checked:pres});
          c.onchange=()=>{i.disabled=c.checked;obj[f.key]=c.checked?"Present":(i.value||"");on()};
          i.onchange=()=>{obj[f.key]=i.value;on()};
          wrap.append(lab,i,el("label",{class:"chk"},c,"Still working here (Present)"));
          if(!ok&&!pres&&val)wrap.append(el("div",{class:"hint ph"},"Placeholder: "+val));break}
        case"range":{
          wrap.append(lab);
          const a=el("input",{type:"month"}),b=el("input",{type:"month"});a.value=obj.from||"";b.value=obj.to||"";picker(a);picker(b);
          const ong=f.ongoing?el("input",{type:"checkbox",checked:!!obj.ongoing}):null;
          if(ong)b.disabled=ong.checked;
          const upd=()=>{
            obj.from=a.value;obj.to=(ong&&ong.checked)?"":b.value;if(ong)obj.ongoing=ong.checked;
            if(f.kind==="education"&&a.value&&b.value){const r=dur(a.value,b.value);if(r){obj.duration=r.text;obj.passing=r.passing}}
            if(f.kind==="activity"&&a.value){obj.when=(ong&&ong.checked)?"Since "+mname(a.value):(b.value?mname(a.value)+" to "+mname(b.value):mname(a.value))}
            on();
          };
          a.onchange=b.onchange=upd;if(ong)ong.onchange=upd;
          wrap.append(el("div",{class:"range2"},el("label",{},"From",a),el("label",{},"To",b)));
          if(ong)wrap.append(el("label",{class:"chk"},ong,"Ongoing"));
          wrap.append(el("div",{class:"hint"},f.kind==="education"?"Duration and passing year below are filled in automatically.":"The dates shown on the website are filled in automatically."));
          break}
        case"interestTags":{
          const ids=(DATA.interests||[]).map(x=>x.id).filter(Boolean),cur=new Set(obj[f.key]||[]);
          const box2=el("div",{class:"chips"},ids.map(id=>{const c=el("input",{type:"checkbox",checked:cur.has(id)});c.onchange=()=>{c.checked?cur.add(id):cur.delete(id);obj[f.key]=[...cur];on()};return el("label",{},c,id)}));
          wrap.append(lab,box2);break}
        case"image":{
          const m=el("div",{class:"media"});
          const draw2=()=>{m.innerHTML="";const v=obj[f.key];
            if(v)m.append(el("img",{src:v,alt:""}));
            const up=el("button",{type:"button",class:"sm"},v?"Replace image":"Upload image");
            up.onclick=async()=>{const file=await pickFile("image/*");if(!file)return;up.disabled=true;up.textContent="Uploading";
              try{obj[f.key]=await upload(file,f.max);changed();toast("Image uploaded. Remember to save.")}catch(e){toast(e.message,true)}draw2()};
            m.append(up);
            if(v){const rm=el("button",{type:"button",class:"sm danger"},"Remove");rm.onclick=()=>{obj[f.key]="";changed();draw2()};m.append(rm)}
          };draw2();wrap.append(lab);if(f.help)wrap.append(el("div",{class:"hint"},f.help));wrap.append(m);break}
        case"file":{
          const i=el("input",{type:"text",placeholder:"Paste a link, or upload a PDF"});i.value=val||"";mark(i);
          i.oninput=()=>{obj[f.key]=i.value;i.classList.toggle("ph",i.value.includes("[["));on()};
          const up=el("button",{type:"button",class:"sm"},"Upload PDF");
          up.onclick=async()=>{const file=await pickFile("application/pdf");if(!file)return;up.disabled=true;up.textContent="Uploading";
            try{const u=await upload(file);obj[f.key]=u;i.value=u;i.classList.remove("ph");changed();toast("PDF uploaded. Remember to save.")}catch(e){toast(e.message,true)}up.disabled=false;up.textContent="Upload PDF"};
          wrap.append(lab,i,up);break}
        case"catname":{
          const i=el("input",{type:"text"});i.value=val||"";mark(i);let old=val||"";
          i.oninput=()=>{obj[f.key]=i.value;on()};
          i.onchange=()=>{const nu=i.value.trim();if(old&&nu&&nu!==old)renameCat(f.sec,old,nu);old=nu};
          wrap.append(lab,i);break}
        case"platforms":{
          wrap.append(lab);if(f.help)wrap.append(el("div",{class:"hint"},f.help));
          DATA.profiles=DATA.profiles||[];
          const groups=[...new Set(Object.values(PLATFORMS).map(p=>p.g))].filter(g=>g!=="Other");
          groups.forEach(g=>{
            wrap.append(el("h4",{class:"pgh"},g));
            const grid=el("div",{class:"pgrid"});
            Object.entries(PLATFORMS).filter(([k,p])=>p.g===g).forEach(([k,p])=>{
              const find=()=>DATA.profiles.find(x=>x.platform===k);
              const cur=find();
              const cb=el("input",{type:"checkbox",checked:!!cur&&!cur.off,"aria-label":"Show "+p.name});
              const url=el("input",{type:"text",placeholder:"Paste your "+p.name+" link"});url.value=cur&&cur.url&&!hasPh(cur.url)?cur.url:"";
              const ensure=()=>{let e=find();if(!e){e={platform:k,label:p.name,url:""};DATA.profiles.push(e)}return e};
              cb.onchange=()=>{const e=ensure();if(cb.checked)delete e.off;else e.off=true;row.classList.toggle("on",cb.checked);changed()};
              url.oninput=()=>{const e=ensure();e.url=url.value.trim();if(url.value.trim()&&!cb.checked){cb.checked=true;delete e.off}row.classList.toggle("on",cb.checked);changed()};
              const badge=el("span",{class:"pbadge",style:"background:"+p.bg+";color:"+p.fg,"aria-hidden":"true"},p.t);
              const row=el("div",{class:"prow"+(cb.checked?" on":"")},el("label",{class:"pchk"},cb,badge,el("span",{class:"pn"},p.name)),url);
              grid.append(row);
            });
            wrap.append(grid);
          });
          break}
        case"object":{
          const fs=el("fieldset",{},el("legend",{},f.label));obj[f.key]=obj[f.key]||{};
          const inner=el("div");fs.append(inner);renderFields(inner,obj[f.key],f.fields);wrap.append(fs);break}
        case"list":{
          wrap.append(el("div",{class:"hint"},f.label));obj[f.key]=obj[f.key]||[];
          listEditor(wrap,obj[f.key],f);break}
        default:{
          const i=el("input",{type:"text"});i.value=val==null?"":val;mark(i);
          i.onfocus=()=>{if(i.value.includes("[["))i.select()};
          i.oninput=()=>{obj[f.key]=i.value;i.classList.toggle("ph",i.value.includes("[["));on()};
          wrap.append(lab,i);if(f.help)wrap.append(el("div",{class:"hint"},f.help));
        }
      }
      grid.append(wrap);
    });
  }
  draw();
}

function renameCat(secId,old,nu){
  const d=defFor(secId);if(!d||!d.cat)return;
  let n=0;itemsOf(secId).forEach(it=>{if(it[d.cat]===old){it[d.cat]=nu;n++}});
  changed();if(n)toast(`Renamed "${old}" to "${nu}" in ${n} item${n===1?"":"s"} too.`);
}

/* ---------- lists: drag, edit, on/off, copy, delete ---------- */
const OFFTG={get:i=>!i.off,set:(i,v)=>{if(v)delete i.off;else i.off=true}};
function listEditor(parent,arr,def){
  const box=el("div",{class:"list"});parent.append(box);
  const tg=def.toggle||OFFTG;
  const ttl=i=>(def.title&&def.title(i))||"New item (click Edit to fill it in)";
  const after=()=>{changed();if(def.onChange)def.onChange()};
  sortable(box,order=>{const old=arr.slice();order.forEach((idx,k)=>{arr[k]=old[idx]});after();draw()});
  function draw(){
    box.innerHTML="";
    if(!arr.length)box.append(el("div",{class:"empty"},def.empty||"Nothing here yet. Press + Add."));
    arr.forEach((it,i)=>{
      const on=tg.get(it);
      const card=el("div",{class:"card"+(hasPh(it)?" hasph":"")+(on?"":" off"),"data-sort":i});
      const title=el("button",{type:"button",class:"ctitle"},ttl(it));
      const body=el("div",{class:"cbody"});body.hidden=!OPEN.has(it);
      const edit=el("button",{type:"button",class:"sm"},OPEN.has(it)?"Close":"Edit");
      const flip=()=>{body.hidden=!body.hidden;body.hidden?OPEN.delete(it):OPEN.add(it);edit.textContent=body.hidden?"Edit":"Close";
        if(!body.hidden&&!body.dataset.done){body.dataset.done=1;renderFields(body,it,def.item&&(typeof def.item==="function"?def.item():def.item))}};
      title.onclick=edit.onclick=flip;
      const sw=el("button",{type:"button",class:"sw"+(on?" on":""),role:"switch","aria-checked":String(on),title:on?"Shown on the website. Click to hide it.":"Hidden from the website. Click to show it."},on?"On":"Off");
      sw.onclick=()=>{tg.set(it,!tg.get(it));after();draw()};
      const head=el("div",{class:"chead"},el("span",{class:"drag",title:"Drag to change the order"}),title,edit,sw);
      if(!def.noCopy)head.append(el("button",{type:"button",class:"sm",onclick:()=>{arr.splice(i+1,0,clone(it));after();draw()}},"Copy"));
      if(!def.canDelete||def.canDelete(it)){
        const del=el("button",{type:"button",class:"sm danger"},"Delete");let armed=false,t;
        del.onclick=()=>{
          if(!armed){armed=true;del.textContent="Sure?";del.classList.add("armed");t=setTimeout(()=>{armed=false;del.textContent="Delete";del.classList.remove("armed")},3000);return}
          clearTimeout(t);const [rm]=arr.splice(i,1);if(def.onDelete)def.onDelete(rm);after();draw();
        };
        head.append(del);
      }
      card.append(head,body);
      if(!body.hidden){body.dataset.done=1;renderFields(body,it,def.item&&(typeof def.item==="function"?def.item():def.item))}
      body.addEventListener("input",()=>{title.textContent=ttl(it);card.classList.toggle("hasph",hasPh(it))});
      body.addEventListener("change",()=>{title.textContent=ttl(it);card.classList.toggle("hasph",hasPh(it))});
      box.append(card);
    });
    box.append(el("div",{class:"addrow"},el("button",{type:"button",class:"btn line",onclick:()=>{
      const n=def.make?def.make():clone(def.blank||{});OPEN.add(n);arr.push(n);after();draw();
      const c=box.children[arr.length-1];if(c){c.scrollIntoView({behavior:"smooth",block:"center"});const inp=$("input[type=text],input:not([type]),textarea",c)||$("input,select",c);if(inp)inp.focus()}
    }},def.addLabel||"+ Add item")));
  }
  draw();
}

/* ---------- navigation ---------- */
function navLabel(sc){return sc.nav||sc.title||sc.id}
function buildNav(){
  const nav=$("#side");nav.innerHTML="";
  const add=(id,label,cls)=>nav.append(el("button",{type:"button","data-id":id,class:cls||"",onclick:()=>show(id)},el("span",{},label),el("b",{hidden:true},"0")));
  add("site","Profile and links");add("hero","Home page top");add("layout","Page sections and order");
  nav.append(el("hr"));
  DATA.sections.forEach(sc=>{if(defFor(sc.id))add(sc.id,navLabel(sc),sc.visible===false?"dim":"")});
  nav.append(el("hr"));
  add("inbox","Visitor messages");add("media","Uploads");add("history","Versions and backup");
  refreshNav();
}
function refreshNav(){
  $$("#side button").forEach(b=>{
    const id=b.dataset.id,sc=cfgOf(id),bd=$("b",b);
    if(sc){$("span",b).textContent=navLabel(sc);b.classList.toggle("dim",sc.visible===false)}
    b.classList.toggle("on",id===SECTION);
    let n=0;if(id==="inbox"){n=INBOX;bd.classList.add("n")}else n=phFor(id);
    bd.textContent=n;bd.hidden=!n;
  });
}

function tipFor(main,id){
  const n=phFor(id);
  if(n)main.append(el("div",{class:"tip"},"Yellow boxes with [[double brackets]] are sample text. Click one and type your own text: the brackets are not needed, just replace everything. "+n+" left on this page."));
}

function show(id){
  SECTION=id;const main=$("#main");main.innerHTML="";refreshNav();scrollTo(0,0);
  if(id==="site")return pageSite(main);
  if(id==="hero")return pageHero(main);
  if(id==="layout")return pageLayout(main);
  if(id==="inbox")return inbox(main);
  if(id==="media")return mediaLib(main);
  if(id==="history")return versions(main);
  sectionPage(main,id);
  scrollTo(0,0);
}

function pageSite(main){
  main.append(el("h2",{},"Profile and links"),el("p",{class:"lead"},"Your portrait, contact details and profile links."));tipFor(main,"site");
  const b=el("div");main.append(b);
  renderFields(b,DATA,[
    F("photo","Your portrait","image",{max:800,wide:true,help:"A clear photo of your face. It appears in the frame beside your name."}),
    F("email","Email"),F("whatsapp","WhatsApp link or number",{},{help:"Paste your WhatsApp link (for example https://wa.link/xxxxxx) or your number with country code, digits only."}),F("whatsappQr","WhatsApp QR code (optional)","image",{max:600,wide:true,help:"Desktop visitors can scan it with their phone. Use a clear black and white QR image."}),
    F("cv","CV (upload a PDF, or paste a link)","file",{wide:true,help:"Visitors can preview it in a new tab or download it. Upload a public version of your CV (up to 1.3 MB) without your home address or personal phone numbers."}),
    F("profiles","Profile platforms","platforms",{wide:true,help:"Tick the platforms you want visitors to see and paste your profile link. Unticked platforms, and ticked ones without a link, stay hidden."}),
    F("profilesOther","Other links (any website)","list",{wide:true,addLabel:"+ Add link",title:i=>i.label||"New link",blank:{label:"",url:""},item:[F("label","Name shown on the website"),F("url","Link","text",{wide:true})]}),
    F("experienceFallback","Experience shown until job dates are added","object",{wide:true,fields:[F("y","Years","num"),F("m","Months","num"),F("d","Days","num")]})
  ]);
}
function pageHero(main){
  main.append(el("h2",{},"Home page top"),el("p",{class:"lead"},"The first screen visitors see: your name, role, introduction and highlights."));tipFor(main,"hero");
  const b=el("div");main.append(b);
  renderFields(b,DATA.hero,[
    F("name","Your name"),F("role","Role line (one line)"),
    F("lead","Introduction","area",{wide:true,help:"Write {experience} where you want your total experience (for example “7 years”) to appear. It updates by itself from your job dates."}),
    F("open","Highlighted line (leave empty to hide)",{},{wide:true}),
    F("facts","Highlights under the introduction","list",{wide:true,addLabel:"+ Add highlight",title:i=>i.title,blank:{title:"",text:""},item:[F("title","Bold text",{},{help:"Use {experience_full} to show your total experience as years, months and days."}),F("text","Small text under it")]}),
    F("footer","Footer line",{},{wide:true})
  ]);
}

function pageLayout(main){
  main.append(el("h2",{},"Page sections and order"),el("p",{class:"lead"},"Drag the dots to change the order of the sections on your website. Switch a section Off to hide it. Press Edit to rename it, change its subtitle, or the name shown in the menu. + Add makes a brand new section."));
  const dz=el("div",{class:"panel"},el("h3",{},"Website design"),el("p",{class:"help"},"Both designs show the same information from this admin panel. The classic design is your current long page. The new design shows one page at a time, so visitors scroll much less. You can always look at the new one at your-domain/v2/ and at the classic one at your-domain/?classic=1."));
  main.append(dz);renderFields(dz,DATA.settings,[F("design","Design shown at your main address","select",{options:["classic","v2"],labels:{classic:"Classic design (current)",v2:"New design (tabbed pages)"}})]);
  const b=el("div");main.append(b);
  listEditor(b,DATA.sections,{
    addLabel:"+ Add new section",title:i=>navLabel(i)+(i.visible===false?"  (hidden)":"")+(i.custom?"  (your section)":""),
    noCopy:true,canDelete:i=>!!i.custom,
    toggle:{get:i=>i.visible!==false,set:(i,v)=>{i.visible=v}},
    make:()=>{const id="custom-"+Math.random().toString(36).slice(2,7);DATA.custom[id]=[];DATA.categories[id]=[];return {id,custom:true,nav:"New section",title:"New section",lede:"",visible:true}},
    onDelete:i=>{delete DATA.custom[i.id];delete DATA.categories[i.id]},
    onChange:()=>buildNav(),
    item:[F("nav","Name in the menu"),F("title","Section title"),F("lede","Subtitle under the title","area",{wide:true})]
  });
}

function sectionPage(main,id){
  const cfg=cfgOf(id),def=defFor(id);if(!cfg||!def){main.append(el("p",{},"Not found."));return}
  main.append(el("h2",{},navLabel(cfg)));
  if(def.intro)main.append(el("p",{class:"lead"},def.intro));
  tipFor(main,id);
  const head=el("div",{class:"panel"},el("h3",{},"Heading of this section on the website"));main.append(head);
  renderFields(head,cfg,[F("nav","Name in the menu"),F("title","Section title"),F("lede","Subtitle under the title","area",{wide:true}),F("visible","Show this section on the website","bool")]);
  if(def.special==="contact"){main.append(el("div",{class:"panel"},el("h3",{},"Contact details"),el("p",{class:"help"},"Your email, WhatsApp number and profile links are edited under “Profile and links”. Visitors’ messages arrive in “Visitor messages”.")));return}
  if(def.cat){
    const cats=DATA.categories[id]=DATA.categories[id]||[];cats.forEach(c=>OPEN.add(c));
    const p=el("div",{class:"panel"},el("h3",{},"Sub-sections (the tabs above the items)"),el("p",{class:"help"},"Drag to reorder, rename, switch Off to hide a tab, or add a new one. When you rename a tab, its items move with it."));main.append(p);
    listEditor(p,cats,{addLabel:"+ Add tab",title:c=>c.name,blank:{name:""},noCopy:true,item:[F("name","Tab name","catname",{sec:id})],empty:"No tabs yet. The website then builds them from your items."});
  }
  if(id==="recommendations"){recsPanel(main);main.append(el("h3",{style:"margin:22px 0 10px"},"Recommendations you added yourself"))}
  const lw=el("div");main.append(lw);
  listEditor(lw,itemsOf(id),def);
  if(def.extra)def.extra(main);
}

/* ---------- recommendations written by visitors ---------- */
const STATUS_TEXT={published:"Live on your website",hidden:"Hidden",pending:"Waiting for your approval"};
async function recsPanel(main){
  const p=el("div",{class:"panel"});main.append(p);
  const link=window.__demoLink||(location.origin+"/recommend/");
  const inp=el("input",{type:"text",readonly:true,value:link,class:"linkbox","aria-label":"Recommendation link"});
  inp.onfocus=()=>inp.select();
  const copyBtn=el("button",{type:"button",class:"btn gold",onclick:async()=>{
    try{await navigator.clipboard.writeText(link)}catch(e){inp.select();try{document.execCommand("copy")}catch(_){}}
    toast("Link copied. Send it to the person.")}},"Copy link");
  const openBtn=el("button",{type:"button",class:"btn line",onclick:()=>{if(window.__openRecPage)window.__openRecPage();else window.open("/recommend/","_blank","noopener")}},"Open the page");
  const auto=el("input",{type:"checkbox",checked:DATA.settings.recAutoPublish!==false});
  auto.onchange=()=>{DATA.settings.recAutoPublish=auto.checked;changed()};
  p.append(el("h3",{},"Your recommendation link"),
    el("p",{class:"help"},"Send this link by WhatsApp or email to anyone who worked with you. They write a recommendation on a simple page. Their name, position and words appear on your website; their email stays private."),
    el("div",{class:"linkrow"},inp,copyBtn,openBtn),
    el("label",{class:"chk",style:"margin-top:14px"},auto,"Show new recommendations on my website straight away"),
    el("p",{class:"hint"},"If you turn this off (then press Save and publish), new recommendations wait for your approval below. Either way, if many arrive within one hour they wait for your approval. This protects you from spam."));
  const list=el("div",{class:"vlist"});
  main.append(el("h3",{style:"margin:6px 0 10px"},"Recommendations from visitors"),el("p",{class:"help"},"Changes in this list happen immediately. You do not need to press Save and publish."),list);
  list.textContent="Loading";
  async function draw(){
    let items;try{items=(await api("/api/recs")).items}catch(e){list.textContent=e.message;return}
    list.innerHTML="";
    if(!items.length){list.append(el("div",{class:"empty"},"No recommendations from visitors yet. Copy the link above and send it to someone."));return}
    items.forEach(r=>{
      const body=el("div",{class:"vbody"});
      const reply=el("textarea",{placeholder:"Write a reply that appears under their recommendation (optional)",maxlength:"1000"});reply.value=r.reply||"";
      const saveReply=el("button",{type:"button",class:"btn line",onclick:async()=>{try{await api("/api/recs/"+r.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({reply:reply.value})});toast("Reply saved. It is on your website now.")}catch(e){toast(e.message,true)}}},"Save reply");
      const tabs=catOpts("recommendations");
      const typeSel=el("select",{},[el("option",{value:""},"(no tab)"),...tabs.map(t=>el("option",{value:t,selected:t===r.type},t))]);
      if(r.type&&!tabs.includes(r.type))typeSel.append(el("option",{value:r.type,selected:true},r.type));
      typeSel.onchange=async()=>{try{await api("/api/recs/"+r.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({type:typeSel.value})});toast("Tab changed.")}catch(e){toast(e.message,true)}};
      const showE=el("input",{type:"checkbox",checked:!!r.show_email});
      showE.onchange=async()=>{try{await api("/api/recs/"+r.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({show_email:showE.checked})});toast(showE.checked?"Their email is now shown on the website.":"Their email is hidden.")}catch(e){toast(e.message,true);showE.checked=!showE.checked}};
      body.append(el("pre",{},r.text),
        el("div",{class:"meta"},[r.position,r.org,r.relation].filter(Boolean).join(", ")||"No position given"),
        el("div",{class:"meta"},"Email (private): ",el("a",{href:"mailto:"+r.email,class:"v"},r.email)),
        el("div",{class:"vrow"},el("label",{class:"chk"},showE,"Show their email on the website"),el("label",{class:"vsel"},"Tab",typeSel)),
        reply,saveReply);
      const st=r.status;
      const sw=el("button",{type:"button",class:"sw"+(st==="published"?" on":""),title:st==="published"?"Live. Click to hide it.":"Not live. Click to publish it."},st==="published"?"On":"Off");
      sw.onclick=async()=>{try{await api("/api/recs/"+r.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({status:st==="published"?"hidden":"published"})});toast(st==="published"?"Hidden from your website.":"Now live on your website.");draw()}catch(e){toast(e.message,true)}};
      const del=el("button",{type:"button",class:"sm danger"},"Delete");let armed=false,t;
      del.onclick=async()=>{if(!armed){armed=true;del.textContent="Sure?";del.classList.add("armed");t=setTimeout(()=>{armed=false;del.textContent="Delete";del.classList.remove("armed")},3000);return}
        clearTimeout(t);try{await api("/api/recs/"+r.id,{method:"DELETE"});toast("Deleted.");draw()}catch(e){toast(e.message,true)}};
      const open=el("button",{type:"button",class:"sm"},st==="pending"?"Read":"Edit");
      body.hidden=st!=="pending";if(!body.hidden)open.textContent="Close";
      open.onclick=()=>{body.hidden=!body.hidden;open.textContent=body.hidden?"Edit":"Close"};
      list.append(el("div",{class:"card"+(st==="published"?"":" off")+(st==="pending"?" hasph":"")},
        el("div",{class:"chead"},el("div",{class:"vtitle"},el("strong",{},r.name),el("span",{class:"tag2"},r.type||"No tab"),el("span",{class:"meta"},STATUS_TEXT[st]+" | "+new Date(r.created).toLocaleDateString())),open,sw,del),body));
    });
  }
  draw();
}

/* ---------- visitor messages ---------- */
async function inbox(main){
  main.append(el("h2",{},"Visitor messages"),
    el("p",{class:"lead"},"This is your private mailbox for your website. When a visitor presses “Send a message” in the Contact section and submits the form, it arrives here. Only you can see it, and it is never shown on your website."));
  const box=el("div");main.append(box);box.textContent="Loading";
  try{
    const r=await api("/api/submissions");box.innerHTML="";INBOX=r.items.length;refreshNav();
    if(!r.items.length)box.append(el("div",{class:"empty"},"No messages yet.",el("ol",{},el("li",{},"A message is a question or note from a visitor. Press “Reply” to answer by email."),el("li",{},"Recommendations do not come here. People write them through your recommendation link (Recommendations page), and they appear on your website."))));
    r.items.forEach(s=>{
      const acts=el("div",{class:"acts"});
      if(s.kind==="recommendation")acts.append(el("button",{type:"button",class:"btn gold",onclick:()=>{
        DATA.recommendations=DATA.recommendations||[];
        const n={type:catOpts("recommendations")[0]||"Professional",quote:s.text,name:s.name,position:s.position||"",org:s.org||"",relation:s.relation||"",email:s.email};
        OPEN.add(n);DATA.recommendations.push(n);changed();show("recommendations");toast("Added to Recommendations. Check it, then press Save and publish.")}},"Add to Recommendations"));
      acts.append(el("a",{class:"btn line",href:"mailto:"+s.email},"Reply by email"),
        el("button",{type:"button",class:"btn danger",onclick:async()=>{if(!confirm("Delete this message for good?"))return;await api("/api/submissions/"+s.id,{method:"DELETE"});show("inbox")}},"Delete"));
      box.append(el("div",{class:"row"},el("div",{class:"grow"},
        el("div",{},el("span",{class:"tag2"},s.kind==="recommendation"?"Recommendation":"Message"),el("strong",{},"From "+s.name)),
        el("div",{class:"meta"},[s.email,s.position,s.org,s.relation].filter(Boolean).join(", ")+" | "+new Date(s.created).toLocaleString()),
        el("pre",{},s.text)),acts));
    });
  }catch(e){box.textContent=e.message}
}

async function mediaLib(main){
  main.append(el("h2",{},"Uploads"),el("p",{class:"lead"},"Every photo, certificate and PDF you uploaded. Delete files you no longer use."));
  const box=el("div",{class:"mgrid"});main.append(box);
  try{
    const r=await api("/api/media");
    if(!r.items.length)main.append(el("div",{class:"empty"},"No uploads yet."));
    r.items.forEach(m=>{
      box.append(el("div",{class:"mcard"},
        m.mime==="application/pdf"?el("div",{class:"pdf"},"PDF"):el("img",{src:m.url,alt:"",loading:"lazy"}),
        el("small",{},m.name+" ("+Math.round(m.size/1024)+" KB)"),
        el("div",{class:"acts",style:"display:flex;gap:6px"},
          el("button",{type:"button",class:"sm",onclick:()=>{navigator.clipboard&&navigator.clipboard.writeText(location.origin+m.url);toast("Link copied")}},"Copy link"),
          el("button",{type:"button",class:"sm danger",onclick:async()=>{if(!confirm("Delete this file? Any page that uses it will lose it."))return;await api("/api/media/"+m.id,{method:"DELETE"});show("media")}},"Delete"))));
    });
  }catch(e){main.append(e.message)}
}

async function versions(main){
  main.append(el("h2",{},"Versions and backup"));
  const tools=el("div",{class:"row"},el("div",{class:"grow"},el("strong",{},"Backup"),el("div",{class:"meta"},"Download all your content as a file, or load one back.")),
    el("div",{class:"acts"},
      el("button",{type:"button",class:"btn line",onclick:()=>{const b=new Blob([JSON.stringify(DATA,null,1)],{type:"application/json"});const a=el("a",{href:URL.createObjectURL(b),download:"portfolio-backup-"+new Date().toISOString().slice(0,10)+".json"});a.click()}},"Download backup"),
      el("button",{type:"button",class:"btn line",onclick:async()=>{const f=await pickFile("application/json");if(!f)return;try{const d=JSON.parse(await f.text());if(!d||typeof d!=="object"||Array.isArray(d))throw 0;DATA=Object.assign({},DEFAULT,d);normalize();changed();buildNav();show("site");toast("Backup loaded. Press Save and publish to make it live.")}catch(e){toast("That file is not a valid backup.",true)}}},"Load backup")));
  main.append(tools,el("h3",{style:"margin:22px 0 10px"},"Saved versions"));
  const box=el("div");main.append(box);
  try{
    const r=await api("/api/history");
    if(!r.items.length)box.append(el("div",{class:"empty"},"No saved versions yet."));
    r.items.forEach(v=>box.append(el("div",{class:"row"},el("div",{class:"grow"},el("strong",{},"Version "+v.version),el("div",{class:"meta"},new Date(v.created).toLocaleString()+" | "+Math.round(v.size/1024)+" KB")),
      el("button",{type:"button",class:"btn line",onclick:async()=>{if(!confirm("Go back to version "+v.version+"? Your current content is kept as a version too."))return;
        try{await api("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:v.id})});await load();toast("Restored and published.")}catch(e){toast(e.message,true)}}},"Restore"))));
  }catch(e){box.textContent=e.message}
}

/* ---------- load, save, session ---------- */
function clean(v){
  if(Array.isArray(v)){const a=v.map(clean);return a.every(x=>typeof x==="string")?a.map(x=>x.trim()).filter(Boolean):a}
  if(v&&typeof v==="object"){const o={};for(const k in v)o[k]=clean(v[k]);return o}
  return v;
}
function normalize(){
  DATA.hero=Object.assign({},clone(DEFAULT.hero),DATA.hero||{});
  DATA.sections=(DATA.sections||[]).slice();
  DEFAULT.sections.forEach(d=>{if(!DATA.sections.some(x=>x.id===d.id))DATA.sections.push(clone(d))});
  DATA.sections.forEach(s=>{if(s.visible===undefined)s.visible=true});
  DATA.settings=Object.assign({recAutoPublish:true,design:"classic"},DATA.settings||{});
  DATA.custom=DATA.custom||{};
  DATA.categories=DATA.categories||{};
  const keys=new Set([...Object.keys(DEFAULT.categories),...DATA.sections.filter(s=>s.custom).map(s=>s.id)]);
  keys.forEach(k=>{DATA.categories[k]=(DATA.categories[k]||DEFAULT.categories[k]||[]).map(x=>typeof x==="string"?{name:x}:x)});
  DATA.sections.filter(s=>s.custom).forEach(s=>{DATA.custom[s.id]=DATA.custom[s.id]||[]});
  DATA.profiles=DATA.profiles||[];DATA.profilesOther=DATA.profilesOther||[];
  DATA.profiles.forEach(pr=>{if(!pr.platform||!PLATFORMS[pr.platform])pr.platform=platformOf(pr)});
  const oth=DATA.profiles.filter(pr=>pr.platform==="other");
  if(oth.length){DATA.profilesOther.push(...oth.map(o=>({label:o.label||"",url:o.url||"",off:o.off})));DATA.profiles=DATA.profiles.filter(pr=>pr.platform!=="other")}
  DATA.profiles.forEach(pr=>{if(pr.url&&hasPh(pr.url))pr.url=""});
  (DATA.gallery||[]).forEach(g=>{if(g.type==="video"){if(!Array.isArray(g.videos)||!g.videos.length)g.videos=g.url?[{url:g.url,caption:""}]:[{url:"",caption:""}];delete g.url}});
}
async function load(){
  DEFAULT=await (await fetch("/default-content.json")).json();
  const r=await api("/api/content?raw=1");
  if(r.data){DATA=Object.assign({},DEFAULT,r.data);VERSION=r.version;dirty=false}
  else{DATA=clone(DEFAULT);VERSION=0;dirty=true}
  normalize();
  try{INBOX=(await api("/api/submissions")).items.length}catch(e){INBOX=0}
  buildNav();if(!defFor(SECTION)&&!["site","hero","layout","inbox","media","history"].includes(SECTION))SECTION="site";
  show(SECTION);updateBar();
  if(!r.data)$("#status").textContent="Starting content loaded. Press Save and publish to make it live."
}
async function save(){
  const b=$("#saveBtn");b.disabled=true;b.textContent="Saving";
  try{
    const r=await api("/api/content",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({data:clean(DATA),base:VERSION})});
    VERSION=r.version;dirty=false;updateBar();toast("Saved. Your website is updated.");
  }catch(e){toast(e.message,true)}
  b.disabled=false;b.textContent="Save and publish";
}
function showApp(){$("#login").hidden=true;$("#app").hidden=false}
function logout(){TOKEN="";try{sessionStorage.removeItem("tk")}catch(e){}$("#app").hidden=true;$("#login").hidden=false}

async function doLogin(){
  $("#loginErr").textContent="";
  try{
    const r=await fetch("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:$("#pw").value})});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Could not log in.");
    TOKEN=j.token;try{sessionStorage.setItem("tk",TOKEN)}catch(e){}$("#pw").value="";showApp();await load();
  }catch(x){$("#loginErr").textContent=x.message}
}
$("#loginBtn").addEventListener("click",doLogin);
$("#pw").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();doLogin()}});
$("#saveBtn").addEventListener("click",save);
$("#logoutBtn").addEventListener("click",()=>{if(dirty&&!confirm("You have unsaved changes. Log out anyway?"))return;logout()});
addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"&&TOKEN){e.preventDefault();save()}});
addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue=""}});
if(TOKEN){showApp();load().catch(()=>logout())}
