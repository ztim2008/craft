export function formBridgeScript(jobId: string): string {
  return `<script>
(function(){
  var JOB=${JSON.stringify(jobId)};
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
      var res=await fetch("/api/preview/"+JOB+"/form",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
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

export function injectFormBridge(html: string, jobId: string): string {
  const script = formBridgeScript(jobId);
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${script}</body>`);
  return html + script;
}
