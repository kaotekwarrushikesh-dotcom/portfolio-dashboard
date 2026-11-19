/* ============================================================
   Element refs
   ============================================================ */
const grid = document.getElementById('project-grid');
const searchEl = document.getElementById('search');
const emptyEl = document.getElementById('empty-state');
const progressEl = document.getElementById('progress');
const navEl = document.getElementById('nav');
const backdrop = document.getElementById('modal-backdrop');
const modalBody = document.getElementById('modal-body');

let projects = [];
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
   Progress bar
   Share of projects marked complete. It is derived from each project's
   status, so changing a status in the editor moves the bar by itself.
   ============================================================ */
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function countUp(node, target) {
  if (REDUCED_MOTION) {
    node.textContent = target;
    return;
  }
  const duration = 1000;
  const start = performance.now();
  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = Math.round(target * eased);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function renderProgress() {
  const status = (p) => (p.status || '').toLowerCase();
  const total = projects.length;
  const done = projects.filter((p) => status(p) === 'complete').length;
  // "learning" shares the amber badge with "in progress", so the two read as one group here too.
  const active = projects.filter((p) => ['in progress', 'learning'].includes(status(p))).length;
  const planned = projects.filter((p) => status(p) === 'planned').length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const head = el('div', 'progress-head');
  const title = el('div', 'progress-title', 'Work completed');
  title.id = 'progress-title';
  const pctWrap = el('div', 'progress-pct');
  const num = el('span', 'progress-num', '0');
  pctWrap.append(num, '%');
  head.append(title, pctWrap);

  const track = el('div', 'progress-track');
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-labelledby', 'progress-title');
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', '100');
  track.setAttribute('aria-valuenow', String(pct));
  track.setAttribute('aria-valuetext', `${pct} percent, ${done} of ${total} projects complete`);
  const fill = el('div', 'progress-fill');
  track.appendChild(fill);

  const parts = [total ? `${done} of ${total} projects complete` : 'No projects yet'];
  if (active) parts.push(`${active} in progress`);
  if (planned) parts.push(`${planned} planned`);
  const caption = el('div', 'progress-caption', parts.join(' \u00b7 '));

  progressEl.replaceChildren(head, track, caption);

  // Fill and count once the bar scrolls into view, so the animation is seen rather than missed.
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      fill.style.width = `${pct}%`;
      countUp(num, pct);
      observer.disconnect();
    },
    { threshold: 0.6 }
  );
  observer.observe(progressEl);
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

  const foot = el('div', 'card-foot');
  // The static date renders immediately and is replaced by the real push date once GitHub
  // answers. Tagging the element by repo lets that happen in place, without a re-render that
  // would restart the scroll-reveal animation.
  const when = el('span', 'card-when', formatDate(project.date));
  if (project.repo) when.dataset.repo = project.repo;
  foot.appendChild(when);
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
  const query = searchEl.value.trim();
  const qs = query ? `?${new URLSearchParams({ q: query })}` : '';
  history.replaceState(null, '', qs ? `${qs}${location.hash}` : location.pathname + location.hash);
}

function restoreStateFromUrl() {
  const query = new URLSearchParams(location.search).get('q');
  if (query) searchEl.value = query;
}

function render() {
  const query = searchEl.value.trim().toLowerCase();
  // Tags are no longer drawn anywhere, but they stay in projects.json and in the search
  // text, so typing "python" or "garch" still finds the projects that use them.
  const visible = projects.filter((p) => {
    const haystack = `${p.title} ${p.description} ${(p.tags || []).join(' ')} ${(p.highlights || []).join(' ')}`.toLowerCase();
    return haystack.includes(query);
  });

  grid.replaceChildren(...visible.map(renderCard));
  emptyEl.hidden = visible.length > 0;
  syncUrl();
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
  renderProgress();
  render();
}

/* Replace the hand-typed dates with real GitHub push dates, once and after first paint.
 *
 * Deliberately fire-and-forget. The page is already complete and correct when this runs, so
 * a failure leaves it exactly as it was: no error state, no spinner, no layout shift. The
 * only visible outcome is that a date becomes more accurate. */
function upgradeToLiveActivity() {
  const live = window.LiveActivity;
  if (!live || !projects?.length) return;

  live.fetchAllActivity(projects).then((byRepo) => {
    if (!byRepo || !Object.keys(byRepo).length) return;

    document.querySelectorAll('.card-when[data-repo]').forEach((node) => {
      const activity = byRepo[node.dataset.repo];
      const label = activity && live.relativeTime(activity.pushedAt);
      if (!label) return;
      node.textContent = `Updated ${label}`;
      node.classList.add('is-live');
      node.title = `Last push to GitHub: ${new Date(activity.pushedAt).toLocaleString()}`;
    });

    const latest = live.mostRecentPush(byRepo);
    const banner = document.getElementById('live-activity');
    if (latest && banner) {
      const count = Object.keys(byRepo).length;
      banner.textContent =
        `${count} repositories tracked live · last commit ${live.relativeTime(latest)}`;
      banner.hidden = false;
    }
  });
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

// Cache-bust with the load time: GitHub Pages serves projects.json with a 10-minute
// cache-control, so without this a page loaded (or left open) within that window would
// keep showing a stale project list even after a real update went live.
fetch(`projects.json?v=${Date.now()}`)
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
    renderProgress();
    restoreStateFromUrl();
    render();
    observeReveals();
    upgradeToLiveActivity();
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
