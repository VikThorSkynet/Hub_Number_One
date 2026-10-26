(() => {
  let today=new Date();let month=new Date(today.getFullYear(),today.getMonth(),1);
  const iso=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const selected=new URLSearchParams(location.search).get('date');
  let selectedDate=/^\d{4}-\d{2}-\d{2}$/.test(selected||'')?selected:iso(today);
  if(selected&&selectedDate===selected){const parts=selected.split('-').map(Number);month=new Date(parts[0],parts[1]-1,1);}
  let events=[];
  const labels={prova:'Provas',notas:'Notas e boletins',feriado:'Feriado ou recesso',aulas:'Aulas',segunda_chamada:'2ª chamada',projeto:'Projetos',sexta_letiva:'Sexta letiva',encerramento:'Encerramento',outro:'Outro',daa:'DAA',secretaria:'Secretaria',administrativo:'Administrativo',coordenacao:'Coordenação'};
  const grid=document.getElementById('calendarDays');
  const dayDialog = element('dialog', 'day-events-dialog');
  dayDialog.setAttribute('aria-labelledby', 'dayDialogTitle');
  const dayHeading = element('h2'); dayHeading.id = 'dayDialogTitle';
  const closeDay = element('button', '', '×'); closeDay.type = 'button'; closeDay.setAttribute('aria-label', 'Fechar eventos do dia');
  const dayHeader = element('div', 'dialog-heading'); dayHeader.append(dayHeading, closeDay);
  const dayBody = element('div', 'day-dialog-events');
  const addDay = element('button', 'primary', '+ Evento neste dia'); addDay.type = 'button';
  const dayFooter = element('div', 'form-actions'); dayFooter.append(addDay);
  dayDialog.append(dayHeader, dayBody, dayFooter); document.body.append(dayDialog);
  closeDay.onclick = () => dayDialog.close();
  addDay.onclick = () => {dayDialog.close();document.getElementById('newEvent').click();};
  function showDay() {renderSelected();if(!dayDialog.open)dayDialog.showModal();}
  function renderCalendar(){document.getElementById('monthLabel').textContent=month.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});grid.replaceChildren();const start=new Date(month.getFullYear(),month.getMonth(),1-month.getDay());const count=Math.ceil((month.getDay()+new Date(month.getFullYear(),month.getMonth()+1,0).getDate())/7)*7;for(let i=0;i<count;i++){const date=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),day=iso(date),current=schoolSchedule.summarizeDay(events,day);const cell=element('button','day'+(date.getMonth()!==month.getMonth()?' outside':'')+(day===iso(today)?' today':'')+(day===selectedDate?' selected':''));cell.type='button';cell.setAttribute('aria-label',date.toLocaleDateString('pt-BR',{dateStyle:'full'})+(current.length?`, ${current.length} evento(s)`:''));if(day===iso(today))cell.setAttribute('aria-current','date');cell.append(element('span','',date.getDate()));const dots=element('span','event-dots');[...new Set(current.map(event=>event.category))].slice(0,3).forEach(category=>dots.append(element('i','event-dot '+category)));cell.append(dots);if(document.body.dataset.page==='home'){const chips=element('span','calendar-event-labels');current.slice(0,2).forEach(event=>chips.append(element('span','calendar-event-chip '+event.category+(event.completed?' is-completed':''),(event.completed?'✓ ':'')+event.title)));if(current.length>2)chips.append(element('span','calendar-more','+'+(current.length-2)+' eventos'));cell.append(chips);}cell.onclick=()=>{if(document.getElementById('dateEvents')){selectedDate=day;if(date.getMonth()!==month.getMonth())month=new Date(date.getFullYear(),date.getMonth(),1);renderCalendar();showDay();}else location.href='/calendario?date='+day;};grid.append(cell);}}
  function renderSelected() {
    const heading = new Date(selectedDate+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});
    const sideHeading = document.getElementById('selectedDateHeading');
    if(sideHeading)sideHeading.textContent = heading;
    dayHeading.textContent = heading;
    const rows = schoolSchedule.summarizeDay(events,selectedDate);
    for(const box of [document.getElementById('dateEvents'), dayBody]) {
      if(!box)continue;
      box.replaceChildren();
      if(!rows.length)box.append(element('p','muted','Nenhum evento cadastrado para este dia.'));
      rows.forEach(event=>{
        const card = element('article','event-item'+(event.completed?' is-completed':''));
        card.append(element('span','event-tag '+event.category,labels[event.category]||'Outro'),element('strong','',event.title));
        if(event.end_date&&event.end_date!==event.event_date)card.append(element('span','muted','De '+new Date(event.event_date+'T12:00:00').toLocaleDateString('pt-BR')+' até '+new Date(event.end_date+'T12:00:00').toLocaleDateString('pt-BR')));
        if(event.description){card.append(element('span','observation-label','Observações'),element('p','event-observations',event.description));}
        if(event.source!=='manual')card.append(element('span','muted','Fonte: calendário 2026.2'));
        const completion = element('button',event.completed?'completion-button':'completion-button primary',event.completed?'✓ Concluído · Reabrir':'Marcar como concluído');
        completion.type='button';
        completion.onclick=async()=>{
          completion.disabled=true;
          try{await api('/api/events/completion',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:event.completionItems,completed:!event.completed})});await load();}
          catch(error){const message=element('p','status',error.message);message.setAttribute('role','alert');card.append(message);completion.disabled=false;}
        };
        card.append(completion);
        if(event.source==='manual'){
          const actions=element('div','event-actions');const edit=element('button','','Editar'),remove=element('button','danger','Excluir');
          edit.onclick=()=>{dayDialog.close();window.editSchoolEvent?.(event);};
          remove.onclick=()=>{dayDialog.close();window.removeSchoolEvent?.(event);};
          actions.append(edit,remove);card.append(actions);
        }
        box.append(card);
      });
    }
  }
  function renderUpcoming() {
    const box = document.getElementById('upcomingEvents');
    if (!box) return;
    box.replaceChildren();
    const first = iso(today), last = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6));
    const rows = schoolSchedule.summarizeUpcoming(events, first, last);
    if (!rows.length) {
      box.append(element('p', 'muted', 'Nenhum evento pendente para os próximos 7 dias.'));
      return;
    }
    rows.forEach(event => {
      const link = element('a', 'upcoming-item');
      link.href = '/calendario?date=' + event.dates[0];
      if(document.body.dataset.page==='home')link.onclick=click=>{click.preventDefault();selectedDate=event.dates[0];const d=new Date(selectedDate+'T12:00:00');month=new Date(d.getFullYear(),d.getMonth(),1);renderCalendar();showDay();};
      const dates = event.dates.map(day => new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}));
      link.append(element('span', 'upcoming-date', dates.join(' · ')), element('span', 'upcoming-title', event.title), element('i', 'event-dot ' + event.category));
      box.append(link);
    });
  }
  let loading=false;
  async function load(){if(loading)return;loading=true;try{today=new Date();events=await api('/api/events');renderCalendar();renderSelected();renderUpcoming();document.getElementById('eventsStatus')?.replaceChildren();window.schoolEvents=events;}catch(error){const status=document.getElementById('eventsStatus');if(status)status.textContent=error.message;const upcoming=document.getElementById('upcomingEvents');if(upcoming)upcoming.replaceChildren(element('p','muted','Não foi possível carregar as datas.'));}finally{loading=false;}}
  document.getElementById('previousMonth').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);renderCalendar();};document.getElementById('nextMonth').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);renderCalendar();};document.getElementById('today').onclick=()=>{month=new Date(today.getFullYear(),today.getMonth(),1);selectedDate=iso(today);renderCalendar();renderSelected();};
  window.selectSchoolDate=day=>{selectedDate=day;const d=new Date(day+'T12:00:00');month=new Date(d.getFullYear(),d.getMonth(),1);};window.reloadSchoolEvents=load;window.selectedSchoolDate=()=>selectedDate;load();setInterval(()=>{if(!document.hidden)load();},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
})();
