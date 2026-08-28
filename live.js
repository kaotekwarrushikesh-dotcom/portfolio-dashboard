/* Live repository activity.
 *
 * The dates on this site were hand-typed into projects.json, which means they say what was
 * last remembered rather than what last happened. This module replaces them with the real
 * push date from GitHub, so the site ages itself: push code and the card updates without
 * anyone editing a file.
 *
 * Three constraints shape the implementation.
 *
 * GitHub allows 60 unauthenticated API requests an hour per IP address. A visitor loading
 * the page five times would spend a tenth of that on data that changes at most daily, so
 * every response is cached in localStorage for an hour and served from there in between.
 *
 * Nothing here is allowed to break the page. The API can be rate-limited, blocked by a
 * corporate proxy, or simply down, and a recruiter must never see an error where a date
 * should be. Every failure path falls back silently to the date already on the card.
 *
 * It runs after first paint and never blocks it. Cards render immediately with their static
 * date and upgrade in place a moment later if the network cooperates.
 */

/* Exposed on `window.LiveActivity` rather than as an ES module, because app.js is loaded as
 * a classic script. Converting it to a module would change its scoping for the sake of this
 * one file, which is a larger change than the feature warrants. */
const GITHUB_CACHE_KEY = 'repo-activity-v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // one hour; these fields change daily at most
const REQUEST_TIMEOUT_MS = 6000;

function readCache() {
  try {
    const raw = localStorage.getItem(GITHUB_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    // A corrupted or unavailable store is not worth recovering from; start clean.
    return {};
  }
}

function writeCache(cache) {
  try {
    localStorage.setItem(GITHUB_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Private browsing and full quotas both throw here. Losing the cache costs a request,
    // not correctness, so there is nothing to handle.
  }
}

/* owner/repo from a GitHub URL, or null for anything else. */
function parseRepo(url) {
  if (!url) return null;
  const match = String(url).match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

/* "3 days ago", "last month". Relative time reads as activity; an absolute date reads as a
 * record. This site is trying to show the former. */
function relativeTime(iso) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;

  const seconds = Math.round((Date.now() - then.getTime()) / 1000);
  if (seconds < 90) return 'just now';

  const units = [
    ['minute', 60], ['hour', 3600], ['day', 86400],
    ['week', 604800], ['month', 2592000], ['year', 31536000],
  ];
  let label = 'year';
  let size = 31536000;
  for (const [unit, unitSeconds] of units) {
    if (seconds < unitSeconds * 2 && unit !== 'year') break;
    label = unit;
    size = unitSeconds;
  }
  // Pick the largest unit that yields at least one whole period.
  for (let i = units.length - 1; i >= 0; i -= 1) {
    if (seconds >= units[i][1]) {
      label = units[i][0];
      size = units[i][1];
      break;
    }
  }
  const count = Math.max(1, Math.floor(seconds / size));
  return `${count} ${label}${count === 1 ? '' : 's'} ago`;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' },
    });
  } finally {
    clearTimeout(timer);
  }
}

/* One repository's activity, from cache when it is fresh enough. Returns null rather than
 * throwing: every caller treats missing data as "leave the card alone". */
async function fetchActivity(repoUrl) {
  const parsed = parseRepo(repoUrl);
  if (!parsed) return null;

  const key = `${parsed.owner}/${parsed.repo}`;
  const cache = readCache();
  const hit = cache[key];
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) return hit.data;

  try {
    const response = await fetchWithTimeout(`https://api.github.com/repos/${key}`);
    if (!response.ok) {
      // 403 is the rate limit, 404 a private or renamed repo. Both mean "no data", and a
      // stale cache entry is better than nothing if one exists.
      return hit ? hit.data : null;
    }
    const json = await response.json();
    const data = {
      pushedAt: json.pushed_at,
      language: json.language,
      stars: json.stargazers_count,
      openIssues: json.open_issues_count,
    };
    cache[key] = { data, fetchedAt: Date.now() };
    writeCache(cache);
    return data;
  } catch {
    return hit ? hit.data : null;
  }
}

/* Fetch every repo in parallel and hand back a map keyed by repo URL. */
async function fetchAllActivity(projects) {
  const withRepos = projects.filter((p) => parseRepo(p.repo));
  const results = await Promise.all(
    withRepos.map(async (p) => [p.repo, await fetchActivity(p.repo)])
  );
  return Object.fromEntries(results.filter(([, data]) => data));
}

/* The most recent push across every repository, for the hero line. */
function mostRecentPush(activityByRepo) {
  const dates = Object.values(activityByRepo)
    .map((a) => a?.pushedAt)
    .filter(Boolean)
    .map((iso) => new Date(iso).getTime())
    .filter((t) => !Number.isNaN(t));
  return dates.length ? new Date(Math.max(...dates)).toISOString() : null;
}

window.LiveActivity = {
  parseRepo, relativeTime, fetchActivity, fetchAllActivity, mostRecentPush,
};
