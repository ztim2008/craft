export function formBridgeScript(endpoint: string): string {
  return `<script>
(function(){
  var ENDPOINT=${JSON.stringify(endpoint)};
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
    }catch(err){
      alert(err.message||"Не удалось отправить заявку");
    }
  }
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
    var form=btn.closest("form");
    if(!form) return;
    e.preventDefault();
    e.stopPropagation();
    send(form);
  },true);
})();
</script>`;
}

export function injectFormBridge(html: string, endpoint: string): string {
  const stripped = html.replace(/<script>\s*\(function\(\)\{\s*var (JOB|ENDPOINT)=[\s\S]*?<\/script>/i, "");
  const script = formBridgeScript(endpoint);
  if (/<\/body>/i.test(stripped)) return stripped.replace(/<\/body>/i, `${script}</body>`);
  return stripped + script;
}
