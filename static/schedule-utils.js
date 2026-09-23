/* Shared presentation rules: imported dates retain their source data. */
(function (root) {
  function summarizeUpcoming(events, first, last) {
    const groups = new Map();
    for (const event of events) {
      if (event.event_date < first || event.event_date > last) continue;
      const imported = event.source === 'calendar-2026-2';
      const group = /seg\/qua|segunda e quarta/i.test(event.title) ? 'S/Q'
        : /ter\/qui|terça e quinta/i.test(event.title) ? 'T/Q' : '';
      const title = imported ? event.title.split(' · ')[0].replace(/ — turmas de .*/, '') : event.title;
      const key = imported ? JSON.stringify([event.category, title, group]) : `manual:${event.id}`;
      if (!groups.has(key)) groups.set(key, {title: title + (imported && group ? ` ${group}` : ''), category: event.category, dates: []});
      const summary = groups.get(key);
      if (!summary.dates.includes(event.event_date)) summary.dates.push(event.event_date);
    }
    return [...groups.values()].map(item => ({...item, dates: item.dates.sort()}))
      .sort((a, b) => a.dates[0].localeCompare(b.dates[0]) || a.title.localeCompare(b.title, 'pt-BR'));
  }
  const scheduleGroup = weekday => weekday === 2 ? 0 : weekday === 3 ? 1 : weekday;
  const api = {summarizeUpcoming, scheduleGroup};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.schoolSchedule = api;
})(typeof window !== 'undefined' ? window : globalThis);
