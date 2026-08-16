# Bench Clock

A spatial experiment planner for wet-lab scientists running multiple protocols
in parallel. Built for SPECS with CLAD in Lens Studio.

CLAD Summer Hackathon, Week 1 — Organize.

See DESCRIPTION.md for the full write-up and PROMPTS.md for the CLAD prompt log.

## Running it

Requires Lens Studio 5.23 or later. No SPECS hardware needed.

1. Clone this repo
2. Open `specs_project.esproj` in Lens Studio
3. Hit Preview
4. Click a panel to advance that protocol to its next step

Three protocols are seeded so it runs without setup: Western blot, plasmid
miniprep, and HEK293 passage. Each starts partway through on a timed step, so
the countdowns are live from the first frame.
