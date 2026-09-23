const {test} = require('node:test');
const assert = require('node:assert/strict');
const {summarizeUpcoming, summarizeDay, scheduleGroup} = require('./static/schedule-utils.js');

test('daily details remove cohort suffixes and duplicates but preserve manual events and source data', () => {
  const base = {event_date:'2026-09-04', source:'calendar-2026-2', category:'notas', description:''};
  const events = [
    {...base, id:1, title:'Envio de notas e boletins · CH4 TQ (ter/qui)'},
    {...base, id:2, title:'Envio de notas e boletins · CH1 SQ (seg/qua)'},
    {...base, id:3, title:'Envio de notas e boletins · GOB2 TQ (ter/qui)'},
    {...base, id:4, source:'manual', title:'Reunião · equipe', revision:2},
    {...base, id:5, event_date:'2026-09-05', title:'Outro dia'}
  ];
  const rows = summarizeDay(events, '2026-09-04');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].title, 'Envio de notas e boletins');
  assert.equal(rows[1].title, 'Reunião · equipe');
  assert.equal(rows[1].revision, 2);
  assert.match(events[0].title, /CH4/);
});

test('upcoming dates combine cohorts without combining weekday groups or losing dates', () => {
  const event = (id, day, group, course) => ({id, event_date:day, source:'calendar-2026-2', category:'prova', title:`Semana de provas · ${course} (${group})`});
  const result = summarizeUpcoming([
    event(1, '2026-09-22', 'ter/qui', 'A'), event(2, '2026-09-22', 'ter/qui', 'B'),
    event(3, '2026-09-24', 'ter/qui', 'A'), event(4, '2026-09-23', 'seg/qua', 'C'),
    event(5, '2026-09-29', 'ter/qui', 'A')
  ], '2026-09-22', '2026-09-28');
  assert.deepEqual(result, [
    {title:'Semana de provas T/Q', category:'prova', dates:['2026-09-22','2026-09-24']},
    {title:'Semana de provas S/Q', category:'prova', dates:['2026-09-23']}
  ]);
});

test('manual events keep titles and separate entries; end-of-term group is abbreviated', () => {
  const manual = {event_date:'2026-12-15', source:'manual', category:'outro', title:'Reunião · equipe'};
  const result = summarizeUpcoming([
    {...manual, id:1}, {...manual, id:2},
    {id:3, event_date:'2026-12-15', source:'calendar-2026-2', category:'encerramento', title:'Fim das aulas — turmas de terça e quinta'}
  ], '2026-12-15', '2026-12-21');
  assert.equal(result.length, 3);
  assert.equal(result[0].title, 'Fim das aulas T/Q');
  assert.equal(result[1].title, manual.title);
  assert.deepEqual(summarizeUpcoming([], '2026-12-15', '2026-12-21'), []);
});

test('paired weekdays share a schedule group, Friday and Saturday remain independent', () => {
  assert.deepEqual([0,1,2,3,4,5].map(scheduleGroup), [0,1,0,1,4,5]);
});

test('periods appear on each inclusive day and are clipped to the upcoming window', () => {
  const events = [{id:90, event_date:'2027-01-30', end_date:'2027-02-04', title:'Semana de provas', category:'prova', source:'manual'}];
  assert.equal(summarizeDay(events, '2027-01-29').length, 0);
  assert.equal(summarizeDay(events, '2027-01-30').length, 1);
  assert.equal(summarizeDay(events, '2027-02-04').length, 1);
  assert.equal(summarizeDay(events, '2027-02-05').length, 0);
  assert.deepEqual(summarizeUpcoming(events, '2027-02-01', '2027-02-03')[0].dates, ['2027-02-01','2027-02-02','2027-02-03']);
});
