# codex-spec Demo and Testing Guide

This guide walks you through testing the CLI and using it with a small demo app.

## 1) Prerequisites

- Node.js >= 16
- An OpenAI API key exported as `OPENAI_API_KEY`
- (Optional) The `codex` CLI available on PATH if you plan to use local Codex execution

Export your API key:

```bash
export OPENAI_API_KEY=your_api_key_here
```

Install project dependencies:

```bash
npm install
```

## 2) Smoke Test the CLI

Local testing options:

- Use the local source directly:
  ```bash
  node src/cli.js --help
  ```
- Or link globally once, then use `codex-spec` anywhere:
  ```bash
  npm link
  codex-spec --help
  ```

You should see the command list including: `context-setup`, `create`, `requirements`, `plan`, `execute`, `status`.

## 3) Use the Included Demo App

We provide a tiny Express-based Todo API in `examples/todo-api` that you can use to try context setup and feature development.

### Setup the demo app

```bash
cd examples/todo-api
npm install
npm start
```

This starts the API at `http://localhost:3000` with routes for `/todos`.

### Seed project context

From the demo app root (`examples/todo-api`):

```bash
codex-spec context-setup --force
```

This creates `.codex-specs/context/{product.md,tech.md,structure.md}` describing the app.

Suggested answers for prompts:

```
🎯 Setting up project context...
? Project name: todo-api
? Brief project description: Simple Express REST API for managing todos
? Project type: API/Backend Service
? Target users/audience: Developers learning spec-driven AI workflows
? Key features (comma-separated): create todo, list todos, update todo, delete todo, set due date, toggle complete
? Current tech stack (if any): Node.js 18, Express 4, CORS, npm
```

### Create a feature specification

```bash
codex-spec create "Add due date to todos" "Allow setting and updating a dueDate field"
# AI chooses the directory slug by default (snake_case). To override, pass --title:
# codex-spec create "Add due date to todos" "Allow setting and updating a dueDate field" --title "todos_due_date"
```

No prompts here—the feature name and description are passed as arguments.

Resulting directory examples (naming pattern: `YYYY-MM-DD_name_of_the_spec`):

```
.codex-specs/
  2025-09-11_add_due_date_to_todos/
    AGENTS.md
    specification.md
  2025-09-11_add_due_date_to_todos-2/   # created if a name conflict exists
    AGENTS.md
    specification.md
  current/
    AGENTS.md
    specification.md
```

### Generate requirements and an implementation plan

```bash
codex-spec requirements
codex-spec plan
codex-spec tasks          # list task IDs, titles, phase, status
```

This will produce `.codex-specs/current/{specification.md,requirements.md,plan.md,tasks.json}`.

### Execute a task

Inspect `.codex-specs/current/tasks.json` for a task id (e.g., `task-1`) and run:

```bash
codex-spec execute task-1
# Writing files is enabled by default; to prevent writes, use:
# codex-spec execute task-1 --read-only
```

If tasks have dependencies, complete those first or pass `--force` to override.

### Verify results in the demo app

With the server running at `http://localhost:3000`:

- Check current todos in a browser: `http://localhost:3000/todos`
- Or with curl:

```bash
curl -s http://localhost:3000/todos | jq
```

- Create a new todo (before Task 2, `dueDate` is ignored by POST):

```bash
curl -s -X POST http://localhost:3000/todos \
  -H 'Content-Type: application/json' \
  -d '{"title":"Try codex-spec"}' | jq
```

- Update a todo (supports `title`, `completed`, and `dueDate` via PATCH):

```bash
curl -s -X PATCH http://localhost:3000/todos/1 \
  -H 'Content-Type: application/json' \
  -d '{"completed": true, "dueDate": "2030-01-01"}' | jq
```

- After you run Task 2 with writes enabled, POST accepts `dueDate`:

```bash
codex-spec execute task-2  # run with writes (default)
curl -s -X POST http://localhost:3000/todos \
  -H 'Content-Type: application/json' \
  -d '{"title":"Has due date","dueDate":"2030-01-01"}' | jq
```

- After you run Task 4 with writes enabled, GET should reflect sorting/highlight behavior by `dueDate` (verify ordering and any overdue indicator in the response):

```bash
codex-spec execute task-4
curl -s http://localhost:3000/todos | jq
```

### Track progress

```bash
codex-spec status
codex-spec plan-summary
codex-spec tasks
codex-spec tasks
```

## 4) Alternative: Try in a Fresh Repo

If you prefer a clean environment:

```bash
mkdir demo-repo && cd demo-repo
npm init -y
npx codex-spec context-setup --force
npx codex-spec create "User onboarding" "Signup, verification, first-run"
npx codex-spec requirements
npx codex-spec plan
npx codex-spec status
```

## 5) Troubleshooting

- API errors: verify `OPENAI_API_KEY` is set and network is available.
- No tasks found: run `plan` first; task extraction is saved to `tasks.json`.
- Local CLI execution issues: ensure `codex` is installed or rely on the OpenAI API flow.

### Notes

- Phase names containing spaces must be quoted or escaped when running by phase:
  - macOS/Linux: `codex-spec execute-phase "Core Features"` or `codex-spec execute-phase Core\ Features`
  - Windows: `codex-spec execute-phase "Core Features"`
- Spec directory naming: defaults to AI-chosen snake_case slug with date prefix (`YYYY-MM-DD_name_of_the_spec`). Override with `--title "your_slug"`. Conflicts add numeric suffixes (e.g., `-2`).


