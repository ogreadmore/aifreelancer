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
let printState;
window.addEventListener('beforeprint', () => {
  if (printState) return;
  printState = records.map(record => ({ open: record.open, hidden: record.hidden }));
  for (const record of records) { record.hidden = false; record.open = true; }
});
window.addEventListener('afterprint', () => {
  if (!printState) return;
  records.forEach((record, index) => { record.open = printState[index].open; record.hidden = printState[index].hidden; });
  printState = undefined;
});
const printButton = document.querySelector('.print-button');
printButton.hidden = false;
printButton.addEventListener('click', () => window.print());
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
