'use strict';
// Content remains readable and source links work without JavaScript.
const records = [...document.querySelectorAll('.record')];
const search = document.querySelector('#record-search');
const filters = [...document.querySelectorAll('[data-filter]')];
let selected = 'all';
function applyFilter() {
  const query = search.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const record of records) {
    const matches = (selected === 'all' || record.dataset.group === selected) && record.textContent.toLocaleLowerCase().includes(query);
    record.hidden = !matches;
    if (matches) visible++;
  }
  document.querySelector('#record-count').textContent = `${visible} of ${records.length} retrieval targets shown`;
  document.querySelector('#no-records').hidden = visible !== 0;
}
document.querySelector('.record-controls').hidden = false;
search.addEventListener('input', applyFilter);
for (const button of filters) button.addEventListener('click', () => {
  selected = button.dataset.filter;
  for (const item of filters) item.setAttribute('aria-pressed', String(item === button));
  applyFilter();
});
applyFilter();
const researchNotes = [...document.querySelectorAll('.research-note')];
const noteSearch = document.querySelector('#note-search');
function filterNotes() {
  const query = noteSearch.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const note of researchNotes) {
    note.hidden = !`${note.id} ${note.textContent}`.toLocaleLowerCase().includes(query);
    if (!note.hidden) visible++;
  }
  document.querySelector('#note-count').textContent = `${visible} of ${researchNotes.length} research notes shown`;
}
if (noteSearch) {
  document.querySelector('.note-controls').hidden = false;
  noteSearch.addEventListener('input', filterNotes);
  filterNotes();
}
let printState;
const printableDetails = [...document.querySelectorAll('details')];
window.addEventListener('beforeprint', () => {
  if (printState) return;
  printState = printableDetails.map(record => ({ open: record.open, hidden: record.hidden }));
  for (const record of printableDetails) { record.hidden = false; record.open = true; }
});
window.addEventListener('afterprint', () => {
  if (!printState) return;
  printableDetails.forEach((record, index) => { record.open = printState[index].open; record.hidden = printState[index].hidden; });
  printState = undefined;
});
function revealLinkedDetail() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  const detail = target?.closest('details');
  if (detail) {
    // Reset filters if a direct record link targets a hidden retrieval entry.
    if (detail.hidden) {
      if (detail.classList.contains('research-note') && noteSearch) {
        noteSearch.value = ''; filterNotes();
      }
      selected = 'all'; search.value = '';
      for (const button of filters) button.setAttribute('aria-pressed', String(button.dataset.filter === 'all'));
      applyFilter();
    }
    detail.open = true;
    target.scrollIntoView({ block: 'start' });
  }
}
window.addEventListener('hashchange', revealLinkedDetail);
revealLinkedDetail();
const navigation = [...document.querySelectorAll('.contents a')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      for (const link of navigation) {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }
  }, { rootMargin: '-10% 0px -65% 0px', threshold: 0 });
  document.querySelectorAll('.chapter').forEach(chapter => observer.observe(chapter));
}
