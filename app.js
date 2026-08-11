const grid = document.getElementById('project-grid');
const filtersEl = document.getElementById('filters');
const searchEl = document.getElementById('search');
const emptyEl = document.getElementById('empty-state');

let projects = [];
let activeTag = null;

function makeEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function renderCard(project) {
  const card = makeEl('article', 'card');
  card.appendChild(makeEl('h3', null, project.title));
  card.appendChild(makeEl('p', null, project.description));

  if (project.tags?.length) {
    const tagRow = makeEl('div', 'tag-row');
    for (const tag of project.tags) {
      const tagEl = makeEl('span', 'tag', tag);
      tagEl.dataset.tag = tag.toLowerCase();
      tagRow.appendChild(tagEl);
    }
    card.appendChild(tagRow);
  }

  const links = makeEl('div', 'card-links');
  if (project.repo) {
    const a = makeEl('a', null, 'Code');
    a.href = project.repo;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    links.appendChild(a);
  }
  if (project.demo) {
    const a = makeEl('a', null, 'Live demo');
    a.href = project.demo;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    links.appendChild(a);
  }
  if (links.children.length) card.appendChild(links);

  const meta = makeEl('div', 'card-meta');
  meta.appendChild(makeEl('span', null, project.date || ''));
  if (project.status) meta.appendChild(makeEl('span', 'status-badge', project.status));
  card.appendChild(meta);

  return card;
}

function render() {
  const query = searchEl.value.trim().toLowerCase();
  const visible = projects.filter((p) => {
    const matchesTag = !activeTag || (p.tags || []).some((t) => t.toLowerCase() === activeTag);
    const haystack = `${p.title} ${p.description} ${(p.tags || []).join(' ')}`.toLowerCase();
    return matchesTag && haystack.includes(query);
  });

  grid.replaceChildren(...visible.map(renderCard));
  emptyEl.hidden = visible.length > 0;
}

function renderFilters() {
  const tags = [...new Set(projects.flatMap((p) => p.tags || []))].sort();
  filtersEl.replaceChildren();
  for (const tag of tags) {
    const chip = makeEl('button', 'filter-chip', tag);
    chip.type = 'button';
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => {
      const key = tag.toLowerCase();
      activeTag = activeTag === key ? null : key;
      for (const c of filtersEl.children) {
        c.setAttribute('aria-pressed', String(c.textContent.toLowerCase() === activeTag));
      }
      render();
    });
    filtersEl.appendChild(chip);
  }
}

searchEl.addEventListener('input', render);

fetch('projects.json')
  .then((res) => res.json())
  .then((data) => {
    projects = data.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    renderFilters();
    render();
  })
  .catch(() => {
    emptyEl.hidden = false;
    emptyEl.textContent =
      'Could not load projects.json. If you opened this file directly, run a local server instead: python3 -m http.server 8000';
  });
