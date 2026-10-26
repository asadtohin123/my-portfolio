
const $=id=>document.getElementById(id);
const opened=Date.now();
let busy=false;

/* brand the page with the owner's name and tabs (falls back quietly if the backend is not reachable) */
(async function(){
  let types=["Professional","Academic"],name="";
  try{
    const r=await fetch("/api/content",{cache:"no-cache"});
    if(r.ok){
      const j=await r.json(),d=j&&j.data;
      if(d){
        name=(d.hero&&d.hero.name)||"";
        const c=d.categories&&d.categories.recommendations;
        if(Array.isArray(c)&&c.length){
          const l=c.filter(x=>x&&!(typeof x==="object"&&x.off)).map(x=>typeof x==="string"?x:x.name).filter(Boolean);
          if(l.length)types=l;
        }
        if(d.settings&&d.settings.recAutoPublish===false)$("consent").textContent+=" It will appear after the owner has read it.";
      }
    }
  }catch(e){}
  $("type").innerHTML=types.map(t=>"<option></option>").join("");
  [...$("type").options].forEach((o,i)=>{o.value=o.textContent=types[i]});
  if(name){
    const first=name.trim().split(/\s+/);
    $("title").textContent="Write a recommendation for "+name;
    $("badge").textContent=first.map(w=>w[0]).slice(0,2).join("").toUpperCase();
    document.title="Recommendation for "+name;
  }
})();

$("text").addEventListener("input",()=>{$("cnt").textContent=$("text").value.length});

async function send(){
  if(busy)return;
  const err=$("err");err.textContent="";
  const b={name:$("name").value.trim(),email:$("email").value.trim(),position:$("position").value.trim(),org:$("org").value.trim(),
    relation:$("relation").value.trim(),type:$("type").value,text:$("text").value.trim(),showEmail:$("showEmail").checked,website:$("website").value,t:opened};
  if(!b.name){err.textContent="Please write your name.";$("name").focus();return}
  if(!/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(b.email)){err.textContent="Please write a valid email address.";$("email").focus();return}
  if(b.text.length<20){err.textContent="Please write at least 20 characters in your recommendation.";$("text").focus();return}
  if(/(https?:\/\/|www\.)/i.test(b.text+" "+b.name+" "+b.position+" "+b.org+" "+b.relation)){err.textContent="Please do not include web links.";return}
  busy=true;const btn=$("send");btn.disabled=true;btn.textContent="Sending";
  try{
    const r=await fetch("/api/recommend",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||"Could not send. Please try again.");
    $("formBox").hidden=true;$("doneBox").hidden=false;
    $("doneText").textContent=j.published?"Your recommendation is now live on the website.":"Your recommendation was received. It will appear on the website after the owner has read it.";
    $("doneLink").textContent=j.published?"See it on the website":"Visit the website";
    scrollTo(0,0);
  }catch(x){err.textContent=x.message;btn.disabled=false;btn.textContent="Send recommendation"}
  busy=false;
}
$("send").addEventListener("click",send);
["name","email","position","org","relation"].forEach(id=>$(id).addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();send()}}));
