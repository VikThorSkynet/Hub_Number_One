/* Shared presentation rules: imported dates retain their source data. */
(function (root) {
  const simpleTitle = event => event.title.split(' · ')[0].replace(/ — turmas de .*/, '');
  function summarizeDay(events, day) {
    const groups = new Map();
    for (const event of events.filter(item => item.event_date === day)) {
      const imported = event.source === 'calendar-2026-2';
      const title = imported ? simpleTitle(event) : event.title;
      const key = imported ? JSON.stringify([event.category, title]) : `manual:${event.id}`;
      if (!groups.has(key)) groups.set(key, {...event, title, descriptions: new Set()});
      if (event.description) groups.get(key).descriptions.add(event.description);
    }
    return [...groups.values()].map(({descriptions, ...event}) => ({...event, description:[...descriptions].join(' · ')}));
  }
  function summarizeUpcoming(events, first, last) {
    const groups = new Map();
    for (const event of events) {
      if (event.event_date < first || event.event_date > last) continue;
      const imported = event.source === 'calendar-2026-2';
      const group = /seg\/qua|segunda e quarta/i.test(event.title) ? 'S/Q'
        : /ter\/qui|terça e quinta/i.test(event.title) ? 'T/Q' : '';
      const title = imported ? simpleTitle(event) : event.title;
      const key = imported ? JSON.stringify([event.category, title, group]) : `manual:${event.id}`;
      if (!groups.has(key)) groups.set(key, {title: title + (imported && group ? ` ${group}` : ''), category: event.category, dates: []});
      const summary = groups.get(key);
      if (!summary.dates.includes(event.event_date)) summary.dates.push(event.event_date);
    }
    return [...groups.values()].map(item => ({...item, dates: item.dates.sort()}))
      .sort((a, b) => a.dates[0].localeCompare(b.dates[0]) || a.title.localeCompare(b.title, 'pt-BR'));
  }
  const scheduleGroup = weekday => weekday === 2 ? 0 : weekday === 3 ? 1 : weekday;
  const api = {summarizeUpcoming, summarizeDay, scheduleGroup};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.schoolSchedule = api;
})(typeof window !== 'undefined' ? window : globalThis);
