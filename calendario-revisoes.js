(() => {
 function init(){
 const source=window.CalendarioFonte;if(!source)return;
 const dateKey=value=>{if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value;const d=new Date(value);return Number.isNaN(+d)?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const today=()=>dateKey(new Date());
 let selected=today(),month=new Date(new Date().getFullYear(),new Date().getMonth(),1),marks={};
 const storage='calendario_revisoes_'+source.context;
 try{marks=JSON.parse(localStorage.getItem(storage)||'{}')||{};}catch{}
 const modal=document.createElement('dialog');modal.id='calendarioRevisoes';modal.className="cal-context-"+source.context;modal.innerHTML='<header><strong>📅 Calendário de revisões</strong><button type="button" data-close aria-label="Fechar calendário">×</button></header><nav><button type="button" data-prev aria-label="Mês anterior">‹</button><b data-month></b><button type="button" data-next aria-label="Próximo mês">›</button><button type="button" data-today>Hoje</button></nav><p class="cal-legenda">Verde: cards do dia concluídos. Vermelho: cards pendentes. Revise os cadernos e marque sua leitura separadamente.</p><div class="cal-week">'+['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(x=>'<span>'+x+'</span>').join('')+'</div><div class="cal-grid"></div><h3 data-day></h3><button type="button" data-all>▶ Responder todos os cards deste dia</button><p data-progress></p><div data-tasks></div>';
 document.body.append(modal);modal.addEventListener('keydown',event=>event.stopPropagation());
 function tasks(day){return source.items(day,today(),dateKey);}
 function completed(task,day){if(task.done)return true;const key=day+'|'+task.id;return Object.hasOwn(marks,key)?marks[key]:!!task.done;}
 function render(){
  source.beforeRender?.();
  if(source.loadMarks)marks=source.loadMarks();
  modal.querySelector('[data-month]').textContent=month.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const grid=modal.querySelector('.cal-grid');grid.replaceChildren();
  for(let i=0;i<month.getDay();i++)grid.append(document.createElement('span'));
  const last=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  for(let n=1;n<=last;n++){
   const day=dateKey(new Date(month.getFullYear(),month.getMonth(),n)),list=tasks(day),done=list.filter(t=>completed(t,day)).length,cardTasks=list.filter(t=>t.cards||t.indices),finished=cardTasks.length?cardTasks.every(t=>completed(t,day)):list.length&&done===list.length;
   const button=document.createElement('button');button.type='button';button.dataset.date=day;button.className=(day===selected?'selected ':'')+(day===today()?'today ':'')+(finished?'finished':list.length?'pending':'');
   button.textContent=String(n);button.setAttribute('aria-label',`${n}: ${list.length} atividades, ${done} concluídas`);button.setAttribute('aria-pressed',String(day===selected));
   if(list.length){const small=document.createElement('small');small.textContent=finished?'✓':`${done}/${list.length}`;button.append(small);}
   button.onclick=()=>{selected=day;render();};grid.append(button);
  }
  modal.querySelector('[data-day]').textContent=new Date(selected+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
  const area=modal.querySelector('[data-tasks]');area.replaceChildren();const list=tasks(selected),groups=new Map();const cardTasks=list.filter(t=>t.cards||t.indices);const total=cardTasks.reduce((n,t)=>n+(t.cards||t.indices).length,0);modal.querySelector('[data-all]').disabled=!total;modal.querySelector('[data-all]').textContent='▶ Responder todos os cards deste dia ('+total+')';modal.querySelector('[data-progress]').textContent=total ? cardTasks.filter(t=>completed(t,selected)).length+'/'+cardTasks.length+' assuntos de cards concluídos' : 'Nenhum card disponível para este dia.';
  for(const task of list){if(!groups.has(task.group))groups.set(task.group,[]);groups.get(task.group).push(task);}
  for(const [name,entries]of groups){const section=document.createElement('section'),title=document.createElement('h4');title.textContent=name;section.append(title);
   for(const task of entries){const row=document.createElement('div');row.className='cal-task';const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=completed(task,selected);check.setAttribute('aria-label','Concluir '+task.title);check.onchange=()=>{marks[selected+'|'+task.id]=check.checked;localStorage.setItem(storage,JSON.stringify(marks));source.saveMarks?.({...marks});render();};label.append(check,document.createTextNode(task.title));const go=document.createElement('button');go.type='button';go.textContent=task.actionLabel;go.onclick=()=>{modal.close();source.open(task);};row.append(label,go);section.append(row);}
   area.append(section);
  }
  if(!list.length)area.textContent='Nenhuma revisão programada para este dia.';
 }
 window.abrirCalendarioRevisoes=()=>{selected=today();month=new Date(new Date().getFullYear(),new Date().getMonth(),1);render();modal.showModal();modal.scrollTop=0;modal.querySelector("[data-tasks]").scrollTop=0;};
 modal.querySelector('[data-close]').onclick=()=>modal.close();
 modal.querySelector('[data-prev]').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);render();};
 modal.querySelector('[data-next]').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);render();};
 function responderDia(){const list=tasks(selected);const indices=[...new Set(list.flatMap(t=>t.indices||[]))];const cards=[...new Map(list.flatMap(t=>t.cards||[]).map(c=>[String(c.id),c])).values()];if(!indices.length&&!cards.length)return;modal.close();source.open({title:'Cards de '+new Date(selected+'T12:00:00').toLocaleDateString('pt-BR'),indices,cards:source.context==='caderno'?cards:undefined});}
 modal.querySelector('[data-all]').onclick=responderDia;
 modal.querySelector('[data-today]').onclick=()=>{selected=today();month=new Date(new Date().getFullYear(),new Date().getMonth(),1);render();responderDia();};
 modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
 window.addEventListener('calendario:atualizar',()=>{if(modal.open)render();});
 source.attach(window.abrirCalendarioRevisoes);
 }
 if(window.CalendarioFonte)init();else window.addEventListener("calendario:fonte-pronta",init,{once:true});
})();
