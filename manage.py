#!/usr/bin/env python3
"""Manage the projects on the dashboard without hand-editing JSON.

Usage:
    python3 manage.py add        Add a project through guided prompts
    python3 manage.py list       Show every project with its index
    python3 manage.py edit       Change one field on an existing project
    python3 manage.py remove     Delete a project
    python3 manage.py validate   Check projects.json for problems
"""

import json
import re
import sys
from datetime import date
from pathlib import Path

DATA_FILE = Path(__file__).parent / "projects.json"

STATUSES = ["complete", "in progress", "learning", "planned"]
FIELDS = ["title", "description", "tags", "repo", "demo", "status", "date", "highlights"]

BOLD, DIM, GREEN, RED, YELLOW, CYAN, RESET = (
    "\033[1m", "\033[2m", "\033[32m", "\033[31m", "\033[33m", "\033[36m", "\033[0m"
)


# ----------------------------------------------------------------------
# Storage
# ----------------------------------------------------------------------
def load():
    """Read projects.json, failing loudly rather than silently corrupting it."""
    if not DATA_FILE.exists():
        return []
    try:
        raw = DATA_FILE.read_text(encoding="utf-8").strip()
        if not raw:
            return []
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        sys.exit(
            f"{RED}projects.json is not valid JSON{RESET}\n"
            f"  line {exc.lineno}, column {exc.colno}: {exc.msg}\n\n"
            f"  Fix that line, or restore the last good copy with:\n"
            f"    git checkout projects.json"
        )
    if not isinstance(data, list):
        sys.exit(f"{RED}projects.json must contain a list of projects.{RESET}")
    return data


def save(projects):
    """Write atomically so an interrupted run cannot leave a truncated file."""
    projects.sort(key=lambda p: p.get("date", ""), reverse=True)
    tmp = DATA_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(projects, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(DATA_FILE)


# ----------------------------------------------------------------------
# Prompts
# ----------------------------------------------------------------------
def ask(label, default="", required=False, hint=""):
    suffix = f" {DIM}[{default}]{RESET}" if default else ""
    if hint:
        print(f"  {DIM}{hint}{RESET}")
    while True:
        try:
            value = input(f"{CYAN}?{RESET} {BOLD}{label}{RESET}{suffix}: ").strip()
        except (EOFError, KeyboardInterrupt):
            sys.exit(f"\n{YELLOW}Cancelled. Nothing was saved.{RESET}")
        value = value or default
        if value or not required:
            return value
        print(f"  {RED}This one is required.{RESET}")


def ask_list(label, hint=""):
    """Collect multiple lines until the user submits an empty one."""
    if hint:
        print(f"  {DIM}{hint}{RESET}")
    print(f"{CYAN}?{RESET} {BOLD}{label}{RESET} {DIM}(one per line, blank line to finish){RESET}")
    items = []
    while True:
        try:
            line = input(f"  {DIM}{len(items) + 1}.{RESET} ").strip()
        except (EOFError, KeyboardInterrupt):
            sys.exit(f"\n{YELLOW}Cancelled. Nothing was saved.{RESET}")
        if not line:
            return items
        items.append(line)


def ask_choice(label, choices, default):
    print(f"{CYAN}?{RESET} {BOLD}{label}{RESET}")
    for i, choice in enumerate(choices, 1):
        marker = f" {DIM}(default){RESET}" if choice == default else ""
        print(f"  {DIM}{i}.{RESET} {choice}{marker}")
    while True:
        raw = ask("Pick a number", default=str(choices.index(default) + 1))
        if raw.isdigit() and 1 <= int(raw) <= len(choices):
            return choices[int(raw) - 1]
        print(f"  {RED}Enter a number between 1 and {len(choices)}.{RESET}")


def pick_project(projects, verb):
    if not projects:
        sys.exit(f"{YELLOW}No projects yet. Run: python3 manage.py add{RESET}")
    cmd_list(projects)
    raw = ask(f"Which project do you want to {verb}? Enter its number", required=True)
    if not raw.isdigit() or not 1 <= int(raw) <= len(projects):
        sys.exit(f"{RED}That is not one of the numbers listed.{RESET}")
    return int(raw) - 1


# ----------------------------------------------------------------------
# Validation
# ----------------------------------------------------------------------
def check(projects):
    """Return a list of human-readable problems. Empty list means healthy."""
    problems = []
    for i, p in enumerate(projects):
        where = f"project {i + 1} ({p.get('title', 'untitled')!r})"
        if not isinstance(p, dict):
            problems.append(f"{where}: should be an object, not {type(p).__name__}")
            continue
        for field in ("title", "description"):
            if not p.get(field):
                problems.append(f"{where}: missing {field}")
        tags = p.get("tags")
        if not tags or not isinstance(tags, list):
            problems.append(f"{where}: tags should be a non-empty list")
        date_value = p.get("date", "")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(date_value)):
            problems.append(f"{where}: date should look like 2026-08-12, got {date_value!r}")
        for url_field in ("repo", "demo"):
            url = p.get(url_field, "")
            if url and not str(url).startswith(("http://", "https://")):
                problems.append(f"{where}: {url_field} should start with https://, got {url!r}")
            if "your-username" in str(url):
                problems.append(f"{where}: {url_field} still has the placeholder 'your-username'")
        if p.get("highlights") and not isinstance(p["highlights"], list):
            problems.append(f"{where}: highlights should be a list")
        unknown = set(p) - set(FIELDS)
        if unknown:
            problems.append(f"{where}: unrecognized field(s) {', '.join(sorted(unknown))}")
    return problems


# ----------------------------------------------------------------------
# Commands
# ----------------------------------------------------------------------
def cmd_add(projects):
    print(f"\n{BOLD}Add a project{RESET}  {DIM}(Ctrl+C to cancel){RESET}\n")

    entry = {
        "title": ask("Title", required=True, hint="The name an interviewer will scan first."),
        "description": ask(
            "Short description", required=True,
            hint="One or two sentences. This is the card text.",
        ),
    }

    tags_raw = ask(
        "Tags", required=True,
        hint="Comma separated. 'Finance' and 'Interview' get their own colors.",
    )
    entry["tags"] = [t.strip() for t in tags_raw.split(",") if t.strip()]

    entry["repo"] = ask("Repo URL", hint="Leave blank to hide the link.")
    entry["demo"] = ask("Live demo URL", hint="Leave blank to hide the link.")
    entry["status"] = ask_choice("Status", STATUSES, "learning")
    entry["date"] = ask("Date", default=date.today().isoformat())

    print()
    entry["highlights"] = ask_list(
        "Highlights",
        hint="Shown in the detail popup. Say what was actually hard, not what tools you used.",
    )

    projects.append(entry)
    problems = check([entry])
    if problems:
        print(f"\n{YELLOW}Heads up:{RESET}")
        for problem in problems:
            print(f"  {YELLOW}!{RESET} {problem}")
        if ask("Save anyway?", default="y").lower() not in ("y", "yes"):
            sys.exit(f"{YELLOW}Not saved.{RESET}")

    save(projects)
    print(f"\n{GREEN}Saved{RESET} {BOLD}{entry['title']}{RESET}. Reload the page to see it.\n")


def cmd_list(projects):
    if not projects:
        print(f"{YELLOW}No projects yet. Run: python3 manage.py add{RESET}")
        return
    print()
    for i, p in enumerate(projects, 1):
        tags = ", ".join(p.get("tags", []))
        print(f"  {BOLD}{i}.{RESET} {p.get('title', 'untitled')}  {DIM}{p.get('status', '')}{RESET}")
        print(f"     {DIM}{p.get('date', '')}  |  {tags}{RESET}")
    print()


def cmd_edit(projects):
    index = pick_project(projects, "edit")
    project = projects[index]
    field = ask_choice("Which field?", FIELDS, "description")

    if field in ("tags",):
        raw = ask(field, default=", ".join(project.get(field, [])), required=True)
        project[field] = [t.strip() for t in raw.split(",") if t.strip()]
    elif field == "highlights":
        print(f"  {DIM}Current: {len(project.get('highlights', []))} item(s). This replaces them all.{RESET}")
        project[field] = ask_list("Highlights")
    elif field == "status":
        project[field] = ask_choice("Status", STATUSES, project.get("status", "learning"))
    else:
        project[field] = ask(field, default=str(project.get(field, "")))

    save(projects)
    print(f"\n{GREEN}Updated{RESET} {BOLD}{project.get('title')}{RESET}.\n")


def cmd_remove(projects):
    index = pick_project(projects, "remove")
    title = projects[index].get("title", "untitled")
    if ask(f"Delete {title!r}? This cannot be undone", default="n").lower() not in ("y", "yes"):
        sys.exit(f"{YELLOW}Kept.{RESET}")
    projects.pop(index)
    save(projects)
    print(f"\n{GREEN}Removed{RESET} {title}.\n")


def cmd_validate(projects):
    problems = check(projects)
    if not problems:
        count = len(projects)
        print(f"\n{GREEN}All good.{RESET} {count} project{'s' if count != 1 else ''}, no problems found.\n")
        return
    print(f"\n{RED}Found {len(problems)} problem(s):{RESET}")
    for problem in problems:
        print(f"  {RED}x{RESET} {problem}")
    print()
    sys.exit(1)


COMMANDS = {
    "add": cmd_add,
    "list": cmd_list,
    "edit": cmd_edit,
    "remove": cmd_remove,
    "validate": cmd_validate,
}


def main():
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if command not in COMMANDS:
        print(__doc__)
        sys.exit(0 if command in ("", "-h", "--help", "help") else 1)
    COMMANDS[command](load())


if __name__ == "__main__":
    main()
