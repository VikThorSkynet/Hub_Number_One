(() => {
  const today=new Date();let month=new Date(today.getFullYear(),today.getMonth(),1);
  const iso=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const selected=new URLSearchParams(location.search).get('date');
  let selectedDate=/^\d{4}-\d{2}-\d{2}$/.test(selected||'')?selected:iso(today);
  if(selected&&selectedDate===selected){const parts=selected.split('-').map(Number);month=new Date(parts[0],parts[1]-1,1);}
  let events=[];
  const labels={prova:'Provas',notas:'Notas e boletins',feriado:'Feriado ou recesso',aulas:'Aulas',segunda_chamada:'2ª chamada',projeto:'Projetos',sexta_letiva:'Sexta letiva',encerramento:'Encerramento',outro:'Outro'};
  const grid=document.getElementById('calendarDays');
  function renderCalendar(){document.getElementById('monthLabel').textContent=month.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});grid.replaceChildren();const start=new Date(month.getFullYear(),month.getMonth(),1-month.getDay());const count=Math.ceil((month.getDay()+new Date(month.getFullYear(),month.getMonth()+1,0).getDate())/7)*7;for(let i=0;i<count;i++){const date=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),day=iso(date),current=events.filter(event=>event.event_date===day);const cell=element('button','day'+(date.getMonth()!==month.getMonth()?' outside':'')+(day===iso(today)?' today':'')+(day===selectedDate&&document.body.dataset.page==='calendar'?' selected':''));cell.type='button';cell.setAttribute('aria-label',date.toLocaleDateString('pt-BR',{dateStyle:'full'})+(current.length?`, ${current.length} evento(s)`:''));if(day===iso(today))cell.setAttribute('aria-current','date');cell.append(element('span','',date.getDate()));const dots=element('span','event-dots');[...new Set(current.map(event=>event.category))].slice(0,3).forEach(category=>dots.append(element('i','event-dot '+category)));cell.append(dots);cell.onclick=()=>{if(document.body.dataset.page==='calendar'){selectedDate=day;if(date.getMonth()!==month.getMonth())month=new Date(date.getFullYear(),date.getMonth(),1);renderCalendar();renderSelected();}else location.href='/calendario?date='+day;};grid.append(cell);}}
  function renderSelected(){const box=document.getElementById('dateEvents');if(!box)return;document.getElementById('selectedDateHeading').textContent=new Date(selectedDate+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});box.replaceChildren();const rows=events.filter(event=>event.event_date===selectedDate);if(!rows.length){box.append(element('p','muted','Nenhuma data cadastrada para este dia.'));return;}rows.forEach(event=>{const card=element('article','event-item');card.append(element('span','event-tag '+event.category,labels[event.category]||'Outro'),element('strong','',event.title));if(event.description)card.append(element('p','muted',event.description));if(event.source!=='manual')card.append(element('span','muted','Fonte: calendário 2026.2'));if(event.source==='manual'){const actions=element('div','event-actions');const edit=element('button','','Editar'),remove=element('button','danger','Excluir');edit.onclick=()=>window.editSchoolEvent?.(event);remove.onclick=()=>window.removeSchoolEvent?.(event);actions.append(edit,remove);card.append(actions);}box.append(card);});}
  function renderUpcoming() {
    const box = document.getElementById('upcomingEvents');
    if (!box) return;
    box.replaceChildren();
    const first = iso(today), last = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6));
    const rows = schoolSchedule.summarizeUpcoming(events, first, last);
    if (!rows.length) {
      box.append(element('p', 'muted', 'Nenhuma data importante cadastrada para os próximos 7 dias.'));
      return;
    }
    rows.forEach(event => {
      const link = element('a', 'upcoming-item');
      link.href = '/calendario?date=' + event.dates[0];
      const dates = event.dates.map(day => new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}));
      link.append(element('span', 'upcoming-date', dates.join(' · ')), element('span', 'upcoming-title', event.title), element('i', 'event-dot ' + event.category));
      box.append(link);
    });
  }
  async function load(){try{events=await api('/api/events');renderCalendar();renderSelected();renderUpcoming();document.getElementById('eventsStatus')?.replaceChildren();window.schoolEvents=events;}catch(error){const status=document.getElementById('eventsStatus');if(status)status.textContent=error.message;const upcoming=document.getElementById('upcomingEvents');if(upcoming)upcoming.replaceChildren(element('p','muted','Não foi possível carregar as datas.'));}}
  document.getElementById('previousMonth').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);renderCalendar();};document.getElementById('nextMonth').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);renderCalendar();};document.getElementById('today').onclick=()=>{month=new Date(today.getFullYear(),today.getMonth(),1);selectedDate=iso(today);renderCalendar();renderSelected();};
  window.reloadSchoolEvents=load;window.selectedSchoolDate=()=>selectedDate;load();
})();
