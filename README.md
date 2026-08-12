# Project Dashboard

A personal dashboard for tracking what I build and what I am learning. Static site, no framework, no build step, no dependencies beyond Python 3 for the management CLI.

## Daily use

Start the server once and leave it running:

```bash
python3 -m http.server 8000 -d ~/portfolio-dashboard
```

Open http://localhost:8000.

Add a project through guided prompts rather than editing JSON by hand:

```bash
python3 manage.py add
```

Then reload the page. The stat counters, filter chips, and Toolkit section all recompute themselves.

## The manage.py commands

| Command | What it does |
| --- | --- |
| `python3 manage.py add` | Walks you through every field and appends the project |
| `python3 manage.py list` | Numbered list of everything, with dates and tags |
| `python3 manage.py edit` | Change a single field on one project |
| `python3 manage.py remove` | Delete a project, with a confirmation step |
| `python3 manage.py validate` | Check for missing fields, bad dates, broken URLs, leftover placeholders |

Run `validate` before you ever make the site public. It specifically catches repo links still pointing at `your-username`, which is the mistake that would send an interviewer to a 404.

Writes are atomic: the file is written to a temp path and then moved into place, so a cancelled run cannot leave you with a half-written `projects.json`.

## Project fields

| Field | Notes |
| --- | --- |
| `title` | The name an interviewer scans first |
| `description` | One or two sentences. This is the card text |
| `tags` | Any strings. `Finance` and `Interview` get their own colors. Every tag becomes a filter chip and a Toolkit entry |
| `repo` | GitHub URL, or empty to hide the link |
| `demo` | Live URL, or empty to hide the link |
| `status` | `complete` shows green, `learning` and `in progress` show amber, `planned` shows grey |
| `date` | `YYYY-MM-DD`. Cards always sort newest first |
| `highlights` | Bullet list shown in the detail popup. This is where the real content goes |

## Writing highlights that land

Cards are the hook, the popup is the substance. Interviewers skim cards, then open the one that interests them. Use `highlights` to answer what they are actually asking: what was hard here, and did you understand it?

Prefer "caches daily bars so repeat screens skip the API" over "uses caching for performance."

## Shareable filtered views

Filter state lives in the URL. Selecting the Finance chip gives you `?tag=finance`, and searching adds `&q=...`. That link reopens with the same filter applied, so you can send someone straight to a subset:

```
http://localhost:8000/?tag=finance
```

## If something breaks

A syntax error in `projects.json` shows a panel on the page naming the exact line and column, rather than rendering a blank grid. To diagnose and recover:

```bash
python3 manage.py validate
git checkout projects.json
```

Opening `index.html` directly through `file://` will not work, because the browser blocks it from loading `projects.json`. Use the local server.

## Deploying later

Not deployed yet, by choice. Before making it public:

1. Replace the sample projects with real ones and run `python3 manage.py validate`.
2. Update the GitHub URL in the Contact section of `index.html`.
3. Decide whether to publish your email address or link to LinkedIn instead. A raw `mailto:` on a public page gets scraped.

**GitHub Pages:** push to a repo, then Settings > Pages > Source: `main` branch, `/ (root)`.

**Vercel:** import the repo at vercel.com and accept the defaults. No build step needed.
