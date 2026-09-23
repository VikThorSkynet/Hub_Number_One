const classNames=['S/Q · Segunda e quarta','T/Q · Terça e quinta','S/Q · Segunda e quarta','T/Q · Terça e quinta','Sexta','Sábado'];
const classList=document.getElementById('classesList'),classStatus=document.getElementById('classesStatus'),classDialog=document.getElementById('classDialog'),classForm=document.getElementById('classForm');
const removeClassDialog=document.getElementById('removeClassDialog');let classes=[],editingClass=null,removingClass=null;
for(let room=1;room<=9;room++){for(const id of ['filterRoom','classRoom']){const option=element('option','',`Sala ${room}`);option.value=room;document.getElementById(id).append(option);}}
function renderClasses() {
  const day = document.getElementById('filterDay').value;
  const room = document.getElementById('filterRoom').value;
  const time = document.getElementById('filterTime').value;
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const query = normalize(document.getElementById('filterText').value);
  const rows = classes.filter(item => (!day || schoolSchedule.scheduleGroup(item.weekday) === Number(day)) && (!room || item.room === Number(room)) && (!time || item.start_time === time) && (!query || normalize(item.course + ' ' + item.teacher).includes(query)));
  classList.replaceChildren();
  if (!rows.length) {
    classList.append(element('div', 'panel empty-state', classes.length ? 'Nenhuma turma corresponde aos filtros.' : 'Nenhuma turma cadastrada.'));
    return;
  }
  for (const group of [0, 1, 4, 5]) {
    const items = rows.filter(item => schoolSchedule.scheduleGroup(item.weekday) === group);
    if (!items.length) continue;
    const section = element('section', 'timetable-panel group-' + group);
    const heading = element('div', 'timetable-heading');
    heading.append(element('h2', '', classNames[group]), element('span', '', items.length + ' turmas'));
    section.append(heading);
    const scroll = element('div', 'timetable-scroll');
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', 'Horários ' + classNames[group]);
    const table = element('table', 'timetable');
    const caption = element('caption', 'sr-only', 'Salas e horários — ' + classNames[group]);
    const times = [...new Set(items.map(item => item.start_time))].sort();
    const head = element('thead'), headRow = element('tr');
    const roomHead = element('th', '', 'Sala'); roomHead.scope = 'col'; headRow.append(roomHead);
    times.forEach(value => {const th = element('th', '', value); th.scope = 'col'; headRow.append(th);});
    head.append(headRow);
    const body = element('tbody');
    const rooms = room ? [Number(room)] : Array.from({length:9}, (_, index) => index + 1);
    rooms.forEach(roomNumber => {
      const row = element('tr'), label = element('th', '', 'Sala ' + roomNumber);
      label.scope = 'row'; row.append(label);
      times.forEach(value => {
        const cell = element('td');
        const matches = items.filter(item => item.room === roomNumber && item.start_time === value);
        if (!matches.length) cell.append(element('span', 'empty-slot', '—'));
        matches.forEach(item => {
          const button = element('button', 'timetable-class');
          button.type = 'button';
          button.setAttribute('aria-label', `Editar ${item.course}, ${classNames[group]}, sala ${roomNumber}, ${value}`);
          button.append(element('strong', '', item.course));
          if (item.students !== null) button.append(element('span', '', item.students + (item.students === 1 ? ' aluno' : ' alunos')));
          if (item.teacher) button.append(element('span', 'class-teacher', item.teacher));
          button.onclick = () => openClass(item);
          cell.append(button);
        });
        row.append(cell);
      });
      body.append(row);
    });
    table.append(caption, head, body); scroll.append(table); section.append(scroll); classList.append(section);
  }
}
async function loadClasses(){try{classes=await api('/api/classes');classStatus.textContent='';const options=document.getElementById('filterTime'),selected=options.value;options.replaceChildren();const all=element('option','','Todos');all.value='';options.append(all);[...new Set(classes.map(c=>c.start_time))].sort().forEach(value=>{const option=element('option','',value);option.value=value;options.append(option);});options.value=selected;renderClasses();}catch(error){classStatus.textContent=error.message;}}
['filterDay','filterRoom','filterTime','filterText'].forEach(id=>document.getElementById(id).addEventListener('input',renderClasses));
function openClass(item=null){editingClass=item;classForm.reset();document.getElementById('classDialogHeading').textContent=item?'Editar turma':'Nova turma';document.getElementById('classDay').value=schoolSchedule.scheduleGroup(item?.weekday??0);document.getElementById('classRoom').value=item?.room??1;document.getElementById('classTime').value=item?.start_time??'17:15';document.getElementById('classCourse').value=item?.course??'';document.getElementById('classStudents').value=item?.students??'';document.getElementById('classTeacher').value=item?.teacher??'';document.getElementById('classFormStatus').textContent='';document.getElementById('deleteClass').classList.toggle('hidden', !item);classDialog.showModal();}
document.getElementById('newClass').onclick=()=>openClass();classDialog.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>classDialog.close());
classForm.onsubmit=async event=>{event.preventDefault();const button=document.getElementById('saveClass');button.disabled=true;try{await api('/api/classes'+(editingClass?'/'+editingClass.id:''),{method:editingClass?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({weekday:Number(document.getElementById('classDay').value),room:Number(document.getElementById('classRoom').value),start_time:document.getElementById('classTime').value,course:document.getElementById('classCourse').value,students:document.getElementById('classStudents').value===''?null:Number(document.getElementById('classStudents').value),teacher:document.getElementById('classTeacher').value,revision:editingClass?.revision})});classDialog.close();await loadClasses();}catch(error){document.getElementById('classFormStatus').textContent=error.message;}finally{button.disabled=false;}};
document.getElementById('cancelClassRemove').onclick=()=>removeClassDialog.close();document.getElementById('confirmClassRemove').onclick=async()=>{const button=document.getElementById('confirmClassRemove');button.disabled=true;try{await api('/api/classes/'+removingClass.id,{method:'DELETE'});removeClassDialog.close();await loadClasses();}catch(error){document.getElementById('removeClassStatus').textContent=error.message;}finally{button.disabled=false;}};
const mapImage=document.getElementById('mapImage'),mapEmpty=document.getElementById('mapImageEmpty');mapImage.onerror=()=>{mapImage.closest('a').classList.add('hidden');mapEmpty.classList.remove('hidden');};
document.getElementById('mapUpload').onsubmit=async event=>{event.preventDefault();const button=document.getElementById('uploadMapButton');button.disabled=true;try{await api('/api/class-map/image',{method:'POST',body:new FormData(event.currentTarget)});const url='/api/class-map/image?v='+Date.now();mapImage.src=url;mapImage.closest('a').href=url;mapImage.closest('a').classList.remove('hidden');mapEmpty.classList.add('hidden');classStatus.textContent='Imagem do mapa atualizada.';}catch(error){classStatus.textContent=error.message;}finally{button.disabled=false;}};
loadClasses();

document.getElementById('deleteClass').onclick = () => {
  if (!editingClass) return;
  removingClass = editingClass;
  document.getElementById('removeClassTitle').textContent = `${removingClass.course} · ${classNames[removingClass.weekday]} · sala ${removingClass.room} · ${removingClass.start_time}`;
  document.getElementById('removeClassStatus').textContent = '';
  classDialog.close();
  removeClassDialog.showModal();
};
