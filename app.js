/* ============================================================
   Element refs
   ============================================================ */
const grid = document.getElementById('project-grid');
const filtersEl = document.getElementById('filters');
const searchEl = document.getElementById('search');
const emptyEl = document.getElementById('empty-state');
const statsEl = document.getElementById('stats');
const stackEl = document.getElementById('stack-cloud');
const navEl = document.getElementById('nav');
const backdrop = document.getElementById('modal-backdrop');
const modalBody = document.getElementById('modal-body');

let projects = [];
let activeTag = null;
let lastFocused = null;

const ARROW = '<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4"/></svg>';

/* ============================================================
   Helpers
   ============================================================ */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function tagChip(label) {
  const t = el('span', 'tag', label);
  t.dataset.tag = label.toLowerCase();
  return t;
}

function statusBadge(status) {
  const b = el('span', 'status-badge', status);
  b.dataset.status = status.toLowerCase();
  return b;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/* ============================================================
   Theme
   ============================================================ */
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
});

/* ============================================================
   Nav shadow on scroll
   ============================================================ */
const onScroll = () => navEl.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ============================================================
   Scroll reveal
   ============================================================ */
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

function observeReveals() {
  document.querySelectorAll('.reveal:not(.visible)').forEach((node, i) => {
    node.style.transitionDelay = `${Math.min(i, 5) * 70}ms`;
    revealObserver.observe(node);
  });
}

/* ============================================================
   Animated counters
   ============================================================ */
function countUp(node, target) {
  const duration = 900;
  const start = performance.now();
  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = Math.round(target * eased);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function renderStats() {
  const allTags = projects.flatMap((p) => p.tags || []);
  const finance = projects.filter((p) => (p.tags || []).some((t) => t.toLowerCase() === 'finance'));
  const shipped = projects.filter((p) => (p.status || '').toLowerCase() === 'complete');

  const data = [
    { value: projects.length, label: 'Projects' },
    { value: finance.length, label: 'Finance builds' },
    { value: new Set(allTags.map((t) => t.toLowerCase())).size, label: 'Technologies' },
    { value: shipped.length, label: 'Shipped' },
  ];

  statsEl.replaceChildren(
    ...data.map((d) => {
      const box = el('div', 'stat');
      const value = el('div', 'stat-value', '0');
      value.dataset.target = d.value;
      box.append(value, el('div', 'stat-label', d.label));
      return box;
    })
  );

  const statObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        countUp(entry.target, Number(entry.target.dataset.target));
        statObserver.unobserve(entry.target);
      }
    },
    { threshold: 0.5 }
  );
  statsEl.querySelectorAll('.stat-value').forEach((n) => statObserver.observe(n));
}

/* ============================================================
   Cards
   ============================================================ */
function renderCard(project, index) {
  // An article rather than a button, so the local edit control can nest inside
  // it without producing a button within a button.
  const card = el('article', 'card');
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `View details for ${project.title}`);

  if (IS_LOCAL) {
    const edit = el('button', 'card-edit');
    edit.type = 'button';
    edit.title = 'Edit this project';
    edit.setAttribute('aria-label', `Edit ${project.title}`);
    edit.append(...parseSvg(
      '<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M13.2 3.6l3.2 3.2M4 16h3.2l8.4-8.4a1.6 1.6 0 0 0 0-2.3l-.9-.9a1.6 1.6 0 0 0-2.3 0L4 12.8V16z" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    ));
    edit.addEventListener('click', (e) => {
      e.stopPropagation();
      openForm(projects.indexOf(project));
    });
    card.appendChild(edit);
  }

  const top = el('div', 'card-top');
  top.appendChild(el('h3', null, project.title));
  if (project.status) top.appendChild(statusBadge(project.status));
  card.appendChild(top);

  card.appendChild(el('p', 'card-desc', project.description));

  if (project.tags?.length) {
    const row = el('div', 'tag-row');
    project.tags.forEach((t) => row.appendChild(tagChip(t)));
    card.appendChild(row);
  }

  const foot = el('div', 'card-foot');
  foot.appendChild(el('span', null, formatDate(project.date)));
  const cta = el('span', 'card-cta');
  cta.append('View details', ...parseSvg(ARROW));
  foot.appendChild(cta);
  card.appendChild(foot);

  card.addEventListener('click', () => openModal(project));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal(project);
    }
  });
  return card;
}

function parseSvg(markup) {
  const wrap = document.createElement('div');
  wrap.innerHTML = markup;
  return [...wrap.childNodes];
}

/* ============================================================
   Modal
   ============================================================ */
function openModal(project) {
  lastFocused = document.activeElement;
  modalBody.replaceChildren();

  modalBody.appendChild(el('h2', null, project.title));

  const meta = el('div', 'modal-meta');
  if (project.status) meta.appendChild(statusBadge(project.status));
  meta.appendChild(el('span', null, formatDate(project.date)));
  modalBody.appendChild(meta);

  modalBody.appendChild(el('p', 'modal-desc', project.description));

  if (project.highlights?.length) {
    modalBody.appendChild(el('div', 'modal-section-label', 'What it does'));
    const ul = el('ul', 'modal-highlights');
    project.highlights.forEach((h) => ul.appendChild(el('li', null, h)));
    modalBody.appendChild(ul);
  }

  if (project.tags?.length) {
    modalBody.appendChild(el('div', 'modal-section-label', 'Built with'));
    const row = el('div', 'tag-row');
    project.tags.forEach((t) => row.appendChild(tagChip(t)));
    row.style.marginBottom = '4px';
    modalBody.appendChild(row);
  }

  const actions = el('div', 'modal-actions');
  if (project.repo) {
    const a = el('a', 'btn btn-primary', 'View source');
    a.href = project.repo;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    actions.appendChild(a);
  }
  if (project.demo) {
    // A generated report is not a live demo, so label the link by what it actually opens.
    const isDoc = /\.(pdf|csv|xlsx?)($|\?)/i.test(project.demo);
    const a = el('a', 'btn btn-ghost', isDoc ? 'View report' : 'Live demo');
    a.href = project.demo;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    actions.appendChild(a);
  }
  if (actions.children.length) modalBody.appendChild(actions);

  backdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('modal-close').focus();
}

function closeModal() {
  backdrop.hidden = true;
  document.body.style.overflow = '';
  lastFocused?.focus();
}

document.getElementById('modal-close').addEventListener('click', closeModal);
backdrop.addEventListener('click', (e) => {
  if (e.target === backdrop) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (backdrop.hidden) return;

  if (e.key === 'Escape') {
    closeModal();
    return;
  }

  // Keep Tab inside the dialog while it is open.
  if (e.key !== 'Tab') return;
  const focusable = backdrop.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

/* ============================================================
   Filtering
   ============================================================ */
function syncUrl() {
  const params = new URLSearchParams();
  if (activeTag) params.set('tag', activeTag);
  const query = searchEl.value.trim();
  if (query) params.set('q', query);
  const qs = params.toString();
  history.replaceState(null, '', qs ? `?${qs}${location.hash}` : location.pathname + location.hash);
}

function restoreStateFromUrl() {
  const params = new URLSearchParams(location.search);
  const tag = params.get('tag');
  const query = params.get('q');
  if (query) searchEl.value = query;
  if (tag) {
    activeTag = tag.toLowerCase();
    for (const c of filtersEl.children) {
      c.setAttribute('aria-pressed', String((c.dataset.key || null) === activeTag));
    }
  }
}

function render() {
  const query = searchEl.value.trim().toLowerCase();
  const visible = projects.filter((p) => {
    const tags = p.tags || [];
    const matchesTag = !activeTag || tags.some((t) => t.toLowerCase() === activeTag);
    const haystack = `${p.title} ${p.description} ${tags.join(' ')} ${(p.highlights || []).join(' ')}`.toLowerCase();
    return matchesTag && haystack.includes(query);
  });

  grid.replaceChildren(...visible.map(renderCard));
  emptyEl.hidden = visible.length > 0;
  syncUrl();
}

function renderFilters() {
  const counts = new Map();
  for (const p of projects) {
    for (const t of p.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
  }
  const tags = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b));

  const all = el('button', 'filter-chip', 'All');
  all.type = 'button';
  all.setAttribute('aria-pressed', 'true');
  all.dataset.key = '';
  filtersEl.replaceChildren(all);

  for (const tag of tags) {
    const chip = el('button', 'filter-chip', tag);
    chip.type = 'button';
    chip.dataset.key = tag.toLowerCase();
    chip.setAttribute('aria-pressed', 'false');
    filtersEl.appendChild(chip);
  }

}

// Delegated once at startup. Attaching inside renderFilters would stack up
// duplicate listeners every time the list is rebuilt after an edit.
filtersEl.addEventListener('click', (e) => {
  const chip = e.target.closest('.filter-chip');
  if (!chip) return;
  const key = chip.dataset.key;
  activeTag = key && key !== activeTag ? key : null;
  for (const c of filtersEl.children) {
    c.setAttribute('aria-pressed', String((c.dataset.key || null) === activeTag || (!activeTag && !c.dataset.key)));
  }
  render();
});

function renderStack() {
  const counts = new Map();
  for (const p of projects) {
    for (const t of p.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  stackEl.replaceChildren(
    ...sorted.map(([name, count]) => {
      const item = el('div', 'stack-item');
      item.append(el('span', null, name), el('span', 'stack-count', String(count)));
      return item;
    })
  );
}

searchEl.addEventListener('input', render);

/* ============================================================
   Boot
   ============================================================ */
/* ============================================================
   Editor
   Only runs locally. The button stays hidden on a deployed site so
   visitors never see it.
   ============================================================ */
const IS_LOCAL =
  ['localhost', '127.0.0.1', '0.0.0.0', ''].includes(location.hostname) || location.protocol === 'file:';

const CAN_WRITE_FILES = 'showOpenFilePicker' in window;

const formBackdrop = document.getElementById('form-backdrop');
const form = document.getElementById('project-form');
const formError = document.getElementById('form-error');
const formTitleEl = document.getElementById('form-title');
const formIntro = document.getElementById('form-intro');
const deleteBtn = document.getElementById('form-delete');
const addBtn = document.getElementById('add-project');
const toastEl = document.getElementById('toast');

let editIndex = null;
let fileHandle = null;

/* --- Remember the chosen file across reloads via IndexedDB --- */
function idb(mode, fn) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('dashboard-editor', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('handles');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      try {
        const tx = open.result.transaction('handles', mode);
        const req = fn(tx.objectStore('handles'));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (err) {
        // store.put/get can throw synchronously (e.g. DataCloneError). Without this,
        // the throw lands inside an event callback and the promise hangs forever,
        // leaving the Save button stuck on "Saving..." with no way out.
        reject(err);
      }
    };
  });
}

const saveHandle = (h) => idb('readwrite', (s) => s.put(h, 'projects')).catch(() => {});
const loadHandle = () => idb('readonly', (s) => s.get('projects')).catch(() => null);

async function ensureWritable() {
  if (!CAN_WRITE_FILES) return null;
  if (!fileHandle) fileHandle = await loadHandle();

  if (fileHandle) {
    const opts = { mode: 'readwrite' };
    let perm = await fileHandle.queryPermission(opts);
    if (perm === 'prompt') perm = await fileHandle.requestPermission(opts);
    if (perm === 'granted') return fileHandle;
    fileHandle = null;
  }

  toast('Choose your projects.json file to grant write access', 4200);
  const [handle] = await window.showOpenFilePicker({
    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
    excludeAcceptAllOption: false,
  });
  if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') return null;
  fileHandle = handle;
  await saveHandle(handle);
  return handle;
}

function downloadFallback(json) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'projects.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function persist() {
  const json = JSON.stringify(projects, null, 2) + '\n';
  try {
    const handle = await ensureWritable();
    if (handle) {
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return 'file';
    }
  } catch (err) {
    if (err.name === 'AbortError') return 'cancelled';
    console.warn('Direct write failed, falling back to download.', err);
  }
  downloadFallback(json);
  return 'download';
}

function toast(message, ms = 3200) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toastEl.hidden = true;
  }, ms);
}

/* --- Open and close --- */
function openForm(index = null) {
  editIndex = index;
  formError.hidden = true;
  form.reset();

  const editing = index !== null;
  formTitleEl.textContent = editing ? 'Edit project' : 'Add a project';
  formIntro.innerHTML = CAN_WRITE_FILES
    ? 'Saved straight into <code>projects.json</code>.'
    : 'Your browser cannot write files directly, so this downloads an updated <code>projects.json</code> for you to drop into the project folder.';
  deleteBtn.hidden = !editing;

  if (editing) {
    const p = projects[index];
    form.title.value = p.title || '';
    form.description.value = p.description || '';
    form.tags.value = (p.tags || []).join(', ');
    form.status.value = p.status || 'learning';
    form.date.value = p.date || '';
    form.repo.value = p.repo || '';
    form.demo.value = p.demo || '';
    form.highlights.value = (p.highlights || []).join('\n');
  } else {
    form.date.value = new Date().toISOString().slice(0, 10);
  }

  renderTagSuggestions();
  formBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  form.title.focus();
}

function closeForm() {
  formBackdrop.hidden = true;
  document.body.style.overflow = '';
  editIndex = null;
}

/* --- Click a suggestion to append it to the tags field --- */
function renderTagSuggestions() {
  const box = document.getElementById('tag-suggest');
  const existing = [...new Set(projects.flatMap((p) => p.tags || []))].sort();
  box.replaceChildren();
  for (const tag of existing.slice(0, 12)) {
    const chip = el('button', 'tag-suggest-chip', tag);
    chip.type = 'button';
    chip.addEventListener('click', () => {
      const current = form.tags.value.split(',').map((t) => t.trim()).filter(Boolean);
      if (!current.some((t) => t.toLowerCase() === tag.toLowerCase())) current.push(tag);
      form.tags.value = current.join(', ');
      form.tags.focus();
    });
    box.appendChild(chip);
  }
}

/* --- Submit --- */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const entry = {
    title: form.title.value.trim(),
    description: form.description.value.trim(),
    tags: form.tags.value.split(',').map((t) => t.trim()).filter(Boolean),
    repo: form.repo.value.trim(),
    demo: form.demo.value.trim(),
    status: form.status.value,
    date: form.date.value || new Date().toISOString().slice(0, 10),
    highlights: form.highlights.value.split('\n').map((h) => h.trim()).filter(Boolean),
  };

  const problems = [];
  if (!entry.title) problems.push('Title is required.');
  if (!entry.description) problems.push('Description is required.');
  if (!entry.tags.length) problems.push('Add at least one tag.');
  for (const field of ['repo', 'demo']) {
    if (entry[field] && !/^https?:\/\//.test(entry[field])) {
      problems.push(`${field === 'repo' ? 'Repo' : 'Demo'} URL should start with https://`);
    }
    if (entry[field].includes('your-username')) {
      problems.push(`The ${field} URL still has the placeholder "your-username".`);
    }
  }

  if (problems.length) {
    formError.textContent = problems.join(' ');
    formError.hidden = false;
    return;
  }

  if (editIndex !== null) projects[editIndex] = entry;
  else projects.push(entry);
  projects.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const saveBtn = document.getElementById('form-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  const result = await persist();
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save project';

  if (result === 'cancelled') {
    formError.textContent = 'Save cancelled, so nothing was written to disk.';
    formError.hidden = false;
    return;
  }

  refreshAll();
  closeForm();
  toast(
    result === 'file'
      ? `Saved "${entry.title}" to projects.json`
      : `Downloaded projects.json. Move it into the project folder to keep the change.`,
    result === 'file' ? 3000 : 6000
  );
});

deleteBtn.addEventListener('click', async () => {
  if (editIndex === null) return;
  const title = projects[editIndex].title;
  if (!confirm(`Delete "${title}"? This rewrites projects.json.`)) return;
  projects.splice(editIndex, 1);
  const result = await persist();
  if (result === 'cancelled') return;
  refreshAll();
  closeForm();
  toast(`Deleted "${title}"`);
});

document.getElementById('form-close').addEventListener('click', closeForm);
document.getElementById('form-cancel').addEventListener('click', closeForm);
formBackdrop.addEventListener('click', (e) => {
  if (e.target === formBackdrop) closeForm();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !formBackdrop.hidden) closeForm();
});
addBtn.addEventListener('click', () => openForm(null));

function refreshAll() {
  renderStats();
  renderFilters();
  renderStack();
  render();
}

function showLoadError(heading, detail, fix) {
  const box = el('div', 'load-error');
  box.appendChild(el('h3', null, heading));
  box.appendChild(el('p', null, detail));
  if (fix) {
    const pre = el('pre', 'load-error-fix');
    pre.textContent = fix;
    box.appendChild(pre);
  }
  grid.replaceChildren(box);
  emptyEl.hidden = true;
}

fetch('projects.json')
  .then(async (res) => {
    if (!res.ok) throw new Error(`http ${res.status}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (err) {
      // Surface the parse error itself. A trailing comma should not look like a blank page.
      const parseError = new Error(err.message);
      parseError.isParseError = true;
      throw parseError;
    }
  })
  .then((data) => {
    if (!Array.isArray(data)) throw new Error('projects.json must contain a list');
    projects = data.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    addBtn.hidden = !IS_LOCAL;
    renderStats();
    renderFilters();
    renderStack();
    restoreStateFromUrl();
    render();
    observeReveals();
  })
  .catch((err) => {
    if (err.isParseError) {
      showLoadError(
        'projects.json has a syntax error',
        err.message,
        'python3 manage.py validate     # find the problem\ngit checkout projects.json     # or restore the last good copy'
      );
    } else if (location.protocol === 'file:') {
      showLoadError(
        'Run this through a local server',
        'Opening the file directly blocks the browser from loading projects.json.',
        'python3 -m http.server 8000 -d ~/portfolio-dashboard'
      );
    } else {
      showLoadError('Could not load projects.json', err.message, null);
    }
    observeReveals();
  });
