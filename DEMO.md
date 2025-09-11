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

```bash
npx codex-spec --help
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
npx codex-spec context-setup --force
```

This creates `.codex-specs/context/{product.md,tech.md,structure.md}` describing the app.

### Create a feature specification

```bash
npx codex-spec create "Add due date to todos" "Allow setting and updating a dueDate field"
```

### Generate requirements and an implementation plan

```bash
npx codex-spec requirements
npx codex-spec plan
npx codex-spec plan-summary
```

This will produce `.codex-specs/current/{specification.md,requirements.md,plan.md,tasks.json}`.

### Execute a task

Inspect `.codex-specs/current/tasks.json` for a task id (e.g., `task-1`) and run:

```bash
npx codex-spec execute task-1
```

If tasks have dependencies, complete those first or pass `--force` to override.

### Track progress

```bash
npx codex-spec status
npx codex-spec plan-summary
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


