/* Shared presentation rules: imported dates retain their source data. */
(function (root) {
  const simpleTitle = event => event.title.split(' · ')[0].replace(/ — turmas de .*/, '');
  function summarizeDay(events, day) {
    const groups = new Map();
    for (const event of events.filter(item => item.event_date <= day && (item.end_date || item.event_date) >= day)) {
      const imported = event.source === 'calendar-2026-2';
      const title = imported ? simpleTitle(event) : event.title;
      const key = imported ? JSON.stringify([event.category, title]) : `manual:${event.id}`;
      if (!groups.has(key)) groups.set(key, {...event, title, completionItems: [], completed:true, descriptions: new Set()});
      groups.get(key).completionItems.push({id:event.id,revision:event.revision});
      groups.get(key).completed = groups.get(key).completed && Boolean(event.completed);
      if (event.description) groups.get(key).descriptions.add(event.description);
    }
    return [...groups.values()].map(({descriptions, ...event}) => ({...event, description:[...descriptions].join(' · ')}));
  }
  function summarizeUpcoming(events, first, last) {
    const groups = new Map();
    for (const event of events) {
      if(event.completed)continue;
      if ((event.end_date || event.event_date) < first || event.event_date > last) continue;
      const imported = event.source === 'calendar-2026-2';
      const group = /seg\/qua|segunda e quarta/i.test(event.title) ? 'S/Q'
        : /ter\/qui|terça e quinta/i.test(event.title) ? 'T/Q' : '';
      const title = imported ? simpleTitle(event) : event.title;
      const key = imported ? JSON.stringify([event.category, title, group]) : `manual:${event.id}`;
      if (!groups.has(key)) groups.set(key, {title: title + (imported && group ? ` ${group}` : ''), category: event.category, dates: []});
      const summary = groups.get(key);
      const start = event.event_date < first ? first : event.event_date;
      const end = (event.end_date || event.event_date) > last ? last : (event.end_date || event.event_date);
      for (let day = start; day <= end;) {
        if (!summary.dates.includes(day)) summary.dates.push(day);
        const date = new Date(day + 'T12:00:00'); date.setDate(date.getDate() + 1);
        day = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      }
    }
    return [...groups.values()].map(item => ({...item, dates: item.dates.sort()}))
      .sort((a, b) => a.dates[0].localeCompare(b.dates[0]) || a.title.localeCompare(b.title, 'pt-BR'));
  }
  const departments = ['daa','secretaria','administrativo','coordenacao'];
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const eventDepartment = event => event.department || (departments.includes(event.category) ? event.category : '');
  function isOverdue(event, today, time='00:00') {
    const end = event.end_date || event.event_date;
    const deadline = event.end_time || event.start_time;
    return !event.completed && (end < today || end === today && Boolean(deadline) && deadline < time);
  }
  function filterEvents(events, filters, today, time) {
    return events.filter(event => (!filters.category || event.category === filters.category)
      && (!filters.department || eventDepartment(event) === filters.department)
      && (!filters.assignee || normalize(event.assignee) === normalize(filters.assignee))
      && (!filters.query || normalize([event.title,event.description,event.assignee,event.location].join(' ')).includes(normalize(filters.query)))
      && (!filters.status || filters.status === 'pending' && !event.completed
        || filters.status === 'completed' && Boolean(event.completed)
        || filters.status === 'overdue' && isOverdue(event,today,time)
        || filters.status === 'today' && event.event_date <= today && (event.end_date || event.event_date) >= today));
  }
  // Place continuous bars in non-overlapping lanes, including across week boundaries.
  function weekSegments(events, days) {
    const segments=[]; const active=new Map();
    days.forEach((day,column) => {
      for(const event of summarizeDay(events,day)) {
        const key=event.source==='calendar-2026-2' ? JSON.stringify([event.title,event.category,event.completed]) : 'manual:'+event.id;
        const previous=active.get(key);
        if(previous && previous.end===column-1)previous.end=column;
        else {const segment={event,start:column,end:column,day};segments.push(segment);active.set(key,segment);}
      }
    });
    segments.sort((a,b)=>a.start-b.start || (b.end-b.start)-(a.end-a.start) || (a.event.start_time||'').localeCompare(b.event.start_time||''));
    const occupied=[];
    for(const segment of segments) {
      let lane=0;while(occupied[lane]!==undefined && occupied[lane]>=segment.start)lane++;
      occupied[lane]=segment.end;segment.lane=lane;
    }
    return segments;
  }
  const scheduleGroup = weekday => weekday === 2 ? 0 : weekday === 3 ? 1 : weekday;
  const api = {summarizeUpcoming, summarizeDay, scheduleGroup, eventDepartment, isOverdue, filterEvents, weekSegments};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.schoolSchedule = api;
})(typeof window !== 'undefined' ? window : globalThis);
