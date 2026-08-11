# Project Dashboard

A static portfolio dashboard for showcasing projects to interviewers. No framework, no build step. Adding a project means editing one JSON file and pushing to git.

## Adding a project

Open `projects.json` and add an entry to the array:

```json
{
  "title": "Portfolio Rebalancer",
  "description": "Computes trades needed to bring a portfolio back to target allocation weights.",
  "tags": ["Finance", "Python"],
  "repo": "https://github.com/your-username/portfolio-rebalancer",
  "demo": "",
  "status": "learning",
  "date": "2026-08-12",
  "highlights": [
    "Takes current holdings and target weights, returns the orders to close the gap.",
    "Accounts for a minimum trade threshold so tiny drifts do not generate noise trades."
  ]
}
```

| Field | Notes |
| --- | --- |
| `title` | Project name shown on the card |
| `description` | 1 to 2 sentences on what it does |
| `tags` | Any strings. `Finance` and `Interview` get their own colors. Every tag becomes a filter chip and a Toolkit entry automatically |
| `repo` | GitHub URL, or `""` to hide the link |
| `demo` | Live URL, or `""` to hide the link |
| `status` | `complete` shows green, `learning` and `in progress` show amber, anything else shows grey |
| `date` | `YYYY-MM-DD`. Cards sort newest first |
| `highlights` | Optional bullet list shown in the detail popup. This is where you explain the interesting engineering |

Everything else updates itself. The stat counters, filter chips, and Toolkit section are all derived from the project list, so you never touch the HTML.

## Writing highlights that land

The cards are the hook and the popup is the substance. Interviewers skim cards, then open the one that interests them. Use `highlights` to answer the question they are actually asking: what was hard about this, and did you understand it? Prefer "caches daily bars so repeat screens skip the API" over "uses caching for performance."

## Running locally

```bash
python3 -m http.server 8000 -d ~/portfolio-dashboard
```

Then open http://localhost:8000. Opening `index.html` directly via `file://` will not work, because the browser blocks loading `projects.json`.

## Deploying

**GitHub Pages:** push to a GitHub repo, then in the repo go to Settings > Pages > Source: `main` branch, `/ (root)`. Your site appears at `https://your-username.github.io/portfolio-dashboard/`.

**Vercel:** go to vercel.com, import the repo, accept the defaults (no build step needed).

## Before you share the link

- Replace the three sample projects with real ones.
- Update the GitHub URL in the Contact section of `index.html`.
- Check the hero headline still sounds like you.
