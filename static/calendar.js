(() => {
  const $ = id => document.getElementById(id);
  const iso = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const dateOf = day => new Date(day+'T12:00:00');
  const plusDays = (day, amount) => {const d=dateOf(day);d.setDate(d.getDate()+amount);return iso(d);};
  const shortDate = day => dateOf(day).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
  const fullDate = day => dateOf(day).toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});
  let today = new Date(), events = [], loading = false, view = 'month', dialogMode = 'day';
  const queryDate = new URLSearchParams(location.search).get('date');
  let selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(queryDate||'') && !Number.isNaN(dateOf(queryDate).getTime()) ? queryDate : iso(today);
  let anchor = dateOf(selectedDate);
  const filters={category:'',department:'',assignee:'',status:'',query:''};
  const labels={prova:'Provas',notas:'Notas e boletins',feriado:'Feriado ou recesso',aulas:'Aulas',segunda_chamada:'2ª chamada',projeto:'Projetos',sexta_letiva:'Sexta letiva',encerramento:'Encerramento',outro:'Outro',daa:'DAA',secretaria:'Secretaria',administrativo:'Administrativo',coordenacao:'Coordenação'};
  const departments={daa:'DAA',secretaria:'Secretaria',administrativo:'Administrativo',coordenacao:'Coordenação'};
  const grid=$('calendarDays'), weekdayRow=grid.previousElementSibling;
  const clock = () => `${String(today.getHours()).padStart(2,'0')}:${String(today.getMinutes()).padStart(2,'0')}`;
  const overdue = event => schoolSchedule.isOverdue(event,iso(today),clock());
  const filtered = (withStatus=true) => schoolSchedule.filterEvents(events,{...filters,status:withStatus?filters.status:''},iso(today),clock());
  const button = (label, className='', action) => {const b=element('button',className,label);b.type='button';if(action)b.onclick=action;return b;};
  const toolbar=element('div','calendar-toolbar');
  const viewButtons=element('div','view-buttons');viewButtons.setAttribute('role','group');viewButtons.setAttribute('aria-label','Visualização do calendário');
  for(const [value,label] of [['month','Mês'],['week','Semana'],['list','Lista']]){const b=button(label,'',()=>{view=value;renderCalendar();});b.dataset.view=value;viewButtons.append(b);}
  toolbar.append(viewButtons);
  const filterBar=element('div','calendar-filters');
  function selectFilter(key,label,options){const wrapper=element('label','',label),select=element('select');select.id='filter-'+key;for(const [value,text] of options){const option=element('option','',text);option.value=value;select.append(option);}select.onchange=()=>{filters[key]=select.value;renderAll();};wrapper.append(select);filterBar.append(wrapper);return select;}
  selectFilter('department','Setor',[['','Todos os setores'],...Object.entries(departments)]);
  selectFilter('category','Categoria',[['','Todas as categorias'],...Object.entries(labels)]);
  const ownerSelect=selectFilter('assignee','Responsável',[['','Todos os responsáveis']]);
  selectFilter('status','Situação',[['','Todas'],['pending','Pendentes'],['completed','Concluídos'],['today','Hoje'],['overdue','Atrasados']]);
  const searchLabel=element('label','','Buscar'),search=element('input');search.type='search';search.placeholder='Evento, observação ou local';search.oninput=()=>{filters.query=search.value;renderAll();};searchLabel.append(search);filterBar.append(searchLabel);
  const clear=button('Limpar filtros','',()=>{Object.keys(filters).forEach(key=>filters[key]='');filterBar.querySelectorAll('select,input').forEach(control=>control.value='');renderAll();});toolbar.append(clear);
  $('monthLabel').before(toolbar,filterBar);
  const overview=element('div','calendar-overview');filterBar.after(overview);
  const periodHeader=element('div','calendar-period-header');
  $('monthLabel').before(periodHeader);
  periodHeader.append($('monthLabel'),$('previousMonth').parentElement);
  $('monthLabel').setAttribute('role','heading');$('monthLabel').setAttribute('aria-level','3');
  $('today').title='Voltar para a data de hoje';
  const dayDialog=element('dialog','day-events-dialog');dayDialog.setAttribute('aria-labelledby','dayDialogTitle');
  const dayHeading=element('h2');dayHeading.id='dayDialogTitle';
  const closeDay=button('×','',()=>dayDialog.close());closeDay.setAttribute('aria-label','Fechar eventos do dia');
  const dayHeader=element('div','dialog-heading');dayHeader.append(dayHeading,closeDay);
  const dayBody=element('div','day-dialog-events'),dayFooter=element('div','form-actions');
  const addDay=button('+ Evento neste dia','primary',()=>{dayDialog.close();$('newEvent').click();});dayFooter.append(addDay);
  dayDialog.append(dayHeader,dayBody,dayFooter);document.body.append(dayDialog);
  function openDay(day,mode='day'){selectedDate=day;anchor=dateOf(day);dialogMode=mode;renderAll();if(!dayDialog.open)dayDialog.showModal();}
  function mergedRows(rows){const days=[...new Set(rows.map(event=>event.event_date))].sort();return days.flatMap(day=>schoolSchedule.summarizeDay(rows.filter(event=>event.event_date===day),day));}
  function renderOverview(){
    overview.replaceChildren();const rows=filtered(false);
    const current=schoolSchedule.summarizeDay(rows.filter(e=>!e.completed),iso(today));
    const late=mergedRows(rows.filter(overdue));
    const todayButton=button(`${current.length} · Hoje`,'overview-today',()=>openDay(iso(today),'today'));
    const lateButton=button(`${late.length} · Atrasados`,'overview-overdue',()=>{dialogMode='overdue';renderDialog();if(!dayDialog.open)dayDialog.showModal();});
    todayButton.title='Eventos pendentes que acontecem hoje';lateButton.title='Pendências cuja data ou horário final já passou';
    overview.append(todayButton,lateButton,element('span','muted','Resumo por setor, responsável, categoria e busca.'));
  }
  function period(){
    if(view==='week'){const d=new Date(anchor);d.setDate(d.getDate()-d.getDay());return [iso(d),iso(new Date(d.getFullYear(),d.getMonth(),d.getDate()+6))];}
    return [iso(new Date(anchor.getFullYear(),anchor.getMonth(),1)),iso(new Date(anchor.getFullYear(),anchor.getMonth()+1,0))];
  }
  function renderCalendar(){
    const rows=filtered(),[first,last]=period();
    const periodName=view==='week'?`${shortDate(first)} a ${shortDate(last)}`:anchor.toLocaleDateString('pt-BR',{month:'long'});
    const periodYear=view==='week'&&dateOf(first).getFullYear()!==dateOf(last).getFullYear()?`${dateOf(first).getFullYear()} / ${dateOf(last).getFullYear()}`:String(view==='week'?dateOf(last).getFullYear():anchor.getFullYear());
    $('monthLabel').replaceChildren(element('span','calendar-month-name',periodName),element('span','calendar-year',periodYear));
    viewButtons.querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-pressed',String(b.dataset.view===view));});
    $('previousMonth').setAttribute('aria-label',view==='week'?'Semana anterior':'Mês anterior');$('nextMonth').setAttribute('aria-label',view==='week'?'Próxima semana':'Próximo mês');
    grid.classList.add('team-calendar');grid.dataset.view=view;grid.replaceChildren();weekdayRow.classList.toggle('hidden',view==='list');
    if(view==='list'){
      const listRows=mergedRows(rows.filter(e=>e.event_date<=last&&(e.end_date||e.event_date)>=first));
      if(!listRows.length)grid.append(element('p','empty-state','Nenhum evento neste mês com os filtros selecionados.'));
      listRows.forEach(event=>{const entry=button('','calendar-list-entry',()=>openDay(event.event_date<first?first:event.event_date));entry.append(element('span','list-date',shortDate(event.event_date)+(event.end_date&&event.end_date!==event.event_date?' a '+shortDate(event.end_date):'')),element('strong','',event.title),element('span','muted',[event.start_time,event.assignee,event.location].filter(Boolean).join(' · ')),statusBadge(event));grid.append(entry);});
      return;
    }
    const beginning=dateOf(first);if(view==='month')beginning.setDate(beginning.getDate()-beginning.getDay());
    const count=view==='week'?7:Math.ceil((dateOf(first).getDay()+dateOf(last).getDate())/7)*7;
    for(let offset=0;offset<count;offset+=7){
      const week=element('div','calendar-week');const days=Array.from({length:7},(_,i)=>plusDays(iso(beginning),offset+i));
      days.forEach((day,index)=>{const current=schoolSchedule.summarizeDay(rows,day),date=dateOf(day);const b=button(String(date.getDate()),'calendar-date'+(day===iso(today)?' today':'')+(day===selectedDate?' selected':'')+(view==='month'&&date.getMonth()!==anchor.getMonth()?' outside':''),()=>openDay(day));b.style.gridColumn=String(index+1);b.style.gridRow='1';b.setAttribute('aria-label',date.toLocaleDateString('pt-BR',{dateStyle:'full'})+`, ${current.length} evento(s)`);if(day===iso(today))b.setAttribute('aria-current','date');week.append(b);});
      for(const segment of schoolSchedule.weekSegments(rows,days)){
        const event=segment.event;const spanLabel=segment.end>segment.start?` · ${shortDate(days[segment.start])}–${shortDate(days[segment.end])}`:'';const b=button((event.completed?'✓ ':'')+(event.start_time?event.start_time+' ':'')+event.title+spanLabel,'calendar-span '+event.category+(event.completed?' is-completed':'')+(overdue(event)?' overdue':''),()=>openDay(segment.day));
        b.style.gridColumn=`${segment.start+1} / ${segment.end+2}`;b.style.gridRow=String(segment.lane+2);
        const rangeStart=event.source==='manual'?event.event_date:days[segment.start];const rangeEnd=event.source==='manual'?(event.end_date||event.event_date):days[segment.end];
        b.title=[event.title,`${shortDate(rangeStart)} a ${shortDate(rangeEnd)}`,event.assignee,event.location].filter(Boolean).join(' · ');
        b.setAttribute('aria-label',b.title);week.append(b);
      }
      grid.append(week);
    }
  }
  function statusBadge(event){let text='Pendente',kind='pending';if(event.completed){text='✓ Concluído';kind='completed';}else if(overdue(event)){text='Atrasado';kind='overdue';}else if(event.event_date<=iso(today)&&(event.end_date||event.event_date)>=iso(today)){text='Hoje';kind='today';}return element('span','event-state '+kind,text);}
  function renderCards(box,rows,showDate=false){
    box.replaceChildren();if(!rows.length){box.append(element('p','muted','Nenhum evento com os filtros selecionados.'));return;}
    rows.forEach(event=>{
      const card=element('article','event-item'+(event.completed?' is-completed':'')+(overdue(event)?' overdue':''));
      const tags=element('div','event-tags');tags.append(element('span','event-tag '+event.category,labels[event.category]||'Outro'),statusBadge(event));card.append(tags,element('strong','',event.title));
      if(showDate||event.end_date&&event.end_date!==event.event_date)card.append(element('span','muted',fullDate(event.event_date)+(event.end_date&&event.end_date!==event.event_date?' até '+fullDate(event.end_date):'')));
      const metadata=[event.assignee?'Responsável: '+event.assignee:'',schoolSchedule.eventDepartment(event)?'Setor: '+departments[schoolSchedule.eventDepartment(event)]:'',event.start_time?'Horário: '+event.start_time+(event.end_time?' às '+event.end_time:''):'',event.location?'Local: '+event.location:'',event.series_id?'Repetição: '+(event.recurrence==='weekly'?'semanal':'mensal'):''].filter(Boolean);
      metadata.forEach(text=>card.append(element('span','event-meta',text)));
      if(event.description)card.append(element('span','observation-label','Observações'),element('p','event-observations',event.description));
      if(event.source!=='manual')card.append(element('span','muted','Fonte: calendário 2026.2'));
      const completion=button(event.completed?'✓ Concluído · Reabrir':'Marcar como concluído',event.completed?'completion-button':'completion-button primary');
      completion.onclick=async()=>{completion.disabled=true;try{await api('/api/events/completion',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:event.completionItems,completed:!event.completed})});await load();}catch(error){const message=element('p','status',error.message);message.setAttribute('role','alert');card.append(message);completion.disabled=false;}};
      card.append(completion);
      if(event.source==='manual'){const actions=element('div','event-actions');actions.append(button('Editar','',()=>{dayDialog.close();window.editSchoolEvent?.(event);}),button('Excluir','danger',()=>{dayDialog.close();window.removeSchoolEvent?.(event);}));card.append(actions);}
      box.append(card);
    });
  }
  function renderDialog(){
    dayHeading.textContent=dialogMode==='overdue'?'Pendências atrasadas':fullDate(selectedDate);
    addDay.classList.toggle('hidden',dialogMode==='overdue');
    const rows=dialogMode==='today'?filtered(false).filter(event=>!event.completed):filtered();
    renderCards(dayBody,dialogMode==='overdue'?mergedRows(filtered(false).filter(overdue)):schoolSchedule.summarizeDay(rows,selectedDate),dialogMode==='overdue');
  }
  function renderSelected(){if($('selectedDateHeading'))$('selectedDateHeading').textContent=fullDate(selectedDate);if($('dateEvents'))renderCards($('dateEvents'),schoolSchedule.summarizeDay(filtered(),selectedDate));renderDialog();}
  function renderUpcoming(){
    const box=$('upcomingEvents');if(!box)return;box.replaceChildren();
    const rows=schoolSchedule.summarizeUpcoming(filtered(),iso(today),plusDays(iso(today),6));
    if(!rows.length){box.append(element('p','muted','Nenhum evento pendente nos próximos 7 dias com estes filtros.'));return;}
    rows.forEach(event=>{const link=element('a','upcoming-item');link.href='/calendario?date='+event.dates[0];link.onclick=click=>{click.preventDefault();openDay(event.dates[0]);};link.append(element('span','upcoming-date',event.dates.map(shortDate).join(' · ')),element('span','upcoming-title',event.title),element('i','event-dot '+event.category));box.append(link);});
  }
  function renderAll(){renderCalendar();renderSelected();renderUpcoming();renderOverview();}
  async function load(){
    if(loading)return;loading=true;
    try{today=new Date();events=await api('/api/events');window.schoolEvents=events;
      const owners=[...new Set(events.map(event=>event.assignee).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
      if(filters.assignee&&!owners.includes(filters.assignee))owners.push(filters.assignee);
      ownerSelect.replaceChildren();for(const [value,label] of [['','Todos os responsáveis'],...owners.map(name=>[name,name])]){const option=element('option','',label);option.value=value;ownerSelect.append(option);}ownerSelect.value=filters.assignee;
      renderAll();$('eventsStatus')?.replaceChildren();
    }catch(error){if($('eventsStatus'))$('eventsStatus').textContent=error.message;}finally{loading=false;}
  }
  function navigate(direction){if(view==='week')anchor=dateOf(plusDays(iso(anchor),7*direction));else anchor=new Date(anchor.getFullYear(),anchor.getMonth()+direction,1);renderCalendar();}
  $('previousMonth').onclick=()=>navigate(-1);$('nextMonth').onclick=()=>navigate(1);
  $('today').onclick=()=>{today=new Date();anchor=new Date(today);selectedDate=iso(today);renderAll();};
  window.selectSchoolDate=day=>{selectedDate=day;anchor=dateOf(day);dialogMode='day';};window.selectedSchoolDate=()=>selectedDate;window.reloadSchoolEvents=load;
  load();setInterval(()=>{if(!document.hidden&&!document.querySelector('dialog[open]'))load();},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!document.querySelector('dialog[open]'))load();});
})();
