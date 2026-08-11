# Project Dashboard

A static portfolio dashboard for showcasing projects to interviewers. Adding a project means editing one JSON file and pushing to git.

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
  "date": "2026-08-12"
}
```

| Field | Notes |
| --- | --- |
| `title` | Project name shown on the card |
| `description` | 1 to 2 sentences on what it does |
| `tags` | Any strings. `Finance` and `Interview` get their own colors, and every tag becomes a filter chip automatically |
| `repo` | GitHub URL, or `""` to hide the link |
| `demo` | Live URL, or `""` to hide the link |
| `status` | Free text, e.g. `learning`, `in progress`, `complete` |
| `date` | `YYYY-MM-DD`. Cards sort newest first |

Then:

```bash
git add projects.json && git commit -m "Add portfolio rebalancer" && git push
```

## Running locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly via `file://` will not work, because the browser blocks loading `projects.json`.

## Deploying

**GitHub Pages:** push to a GitHub repo, then in the repo go to Settings > Pages > Source: `main` branch, `/ (root)`. Your site appears at `https://your-username.github.io/portfolio-dashboard/`.

**Vercel:** go to vercel.com, import the repo, accept the defaults (no build step needed).
