export function formBridgeScript(endpoint: string): string {
  return `<script>
(function(){
  var ENDPOINT=${JSON.stringify(endpoint)};
  function popupFromHref(href){
    var m=String(href||"").match(/#(n-[0-9a-f-]{36})\\b/i);
    if(!m) return null;
    var el=document.getElementById(m[1]);
    if(!el) return null;
    if(el.getAttribute("data-popup")==="true"||(el.className||"").indexOf("cli-popup")>=0) return el;
    return null;
  }
  function nativeShow(el){
    return window.userScripts&&window.userScripts.Util&&typeof window.userScripts.Util.showPopup==="function"
      ? function(){ window.userScripts.Util.showPopup(el); }
      : null;
  }
  function nativeHide(el){
    return window.userScripts&&window.userScripts.Util&&typeof window.userScripts.Util.hidePopup==="function"
      ? function(){ window.userScripts.Util.hidePopup(el); }
      : null;
  }
  function showPopup(el){
    if(!el) return;
    var native=nativeShow(el);
    if(native){ native(); return; }
    el.classList.add("show");
  }
  function hidePopup(el){
    if(!el) return;
    var native=nativeHide(el);
    if(native){ native(); return; }
    el.classList.remove("show");
  }
  function collect(form){
    var fields={};
    form.querySelectorAll("input,textarea,select").forEach(function(el){
      if(el.type==="hidden"&&!el.name) return;
      if(el.type==="submit"||el.type==="button") return;
      var key=el.name||el.getAttribute("placeholder")||el.id||el.type;
      if(key) fields[key]=el.value||"";
    });
    return fields;
  }
  async function send(form){
    var payload={formId:form.id||"",fields:collect(form),page:location.pathname};
    try{
      var res=await fetch(ENDPOINT,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      var data=await res.json();
      if(!res.ok) throw new Error(data.error||"Ошибка отправки");
      alert(data.message||"Заявка отправлена");
      form.reset();
      var pop=form.closest('[data-popup="true"]')||form.closest("section.cli-popup");
      if(pop) hidePopup(pop);
    }catch(err){
      alert(err.message||"Не удалось отправить заявку");
    }
  }
  document.addEventListener("click",function(e){
    var t=e.target;
    if(!t||!t.closest) return;
    var closer=t.closest("[data-popup-close]");
    if(closer){
      var pop=closer.closest('[data-popup="true"]')||closer.closest("section.cli-popup");
      if(pop){ e.preventDefault(); e.stopPropagation(); hidePopup(pop); }
      return;
    }
    if(t.getAttribute&&t.getAttribute("data-popup")==="true"){
      e.preventDefault();
      e.stopPropagation();
      hidePopup(t);
      return;
    }
    var link=t.closest("a[href]");
    var pop=link?popupFromHref(link.getAttribute("href")||link.href):null;
    if(!pop) return;
    e.preventDefault();
    e.stopPropagation();
    showPopup(pop);
  },true);
  document.addEventListener("submit",function(e){
    var form=e.target&&e.target.closest?e.target.closest("form"):null;
    if(!form) return;
    e.preventDefault();
    e.stopPropagation();
    send(form);
  },true);
  document.addEventListener("click",function(e){
    var t=e.target;
    if(!t||!t.closest) return;
    var btn=t.closest("button,[type=submit],.cli-button");
    if(!btn) return;
    if(btn.closest("[data-popup-close]")) return;
    if(btn.tagName==="A"&&popupFromHref(btn.getAttribute("href")||btn.href)) return;
    var form=btn.closest("form");
    if(!form) return;
    e.preventDefault();
    e.stopPropagation();
    send(form);
  },true);
  document.addEventListener("DOMContentLoaded",function(){
    var hash=location.hash||"";
    var pop=popupFromHref(hash);
    if(!pop) return;
    history.replaceState({},document.title,location.pathname+location.search);
    showPopup(pop);
  });
})();
</script>`;
}

export function injectFormBridge(html: string, endpoint: string): string {
  const stripped = html.replace(/<script>\s*\(function\(\)\{\s*var (JOB|ENDPOINT)=[\s\S]*?<\/script>/i, "");
  const script = formBridgeScript(endpoint);
  if (/<\/body>/i.test(stripped)) return stripped.replace(/<\/body>/i, `${script}</body>`);
  return stripped + script;
}
