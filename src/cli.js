#!/usr/bin/env node
import { Command } from 'commander';
import {
  contextSetup,
  contextUpdate,
  contextRefresh,
  createSpec,
  generateRequirements,
  createPlan,
  executeTask,
  executePhase,
  checkStatus,
  planSummary
} from './commands/index.js';

const program = new Command();

program
  .name('codex-spec')
  .description('Spec-driven development workflow for OpenAI Codex')
  .version('1.0.0');

// Context Management Commands
program
  .command('context-setup')
  .description('Initialize project context (product.md, tech.md, structure.md)')
  .option('--force', 'Overwrite existing context files')
  .action(contextSetup);

program
  .command('context-update [component]')
  .description('Update project context after implementing features')
  .option('--auto', 'Automatically detect changes')
  .action(contextUpdate);

program
  .command('context-refresh')
  .description('Manually refresh project context from current codebase')
  .action(contextRefresh);

// Feature Development Commands
program
  .command('create <feature-name> [description]')
  .description('Create a new feature specification')
  .option('--title <title>', 'Override AI-chosen spec directory title')
  .action(createSpec);

program
  .command('requirements [spec-name]')
  .description('Generate requirements document')
  .action(generateRequirements);

program
  .command('plan [spec-name]')
  .description('Create implementation plan with tasks')
  .action(createPlan);

program
  .command('execute <task-id>')
  .description('Execute specific task with Codex')
  .option('--read-only', 'Run in read-only sandbox (no file writes)')
  .action(executeTask);

program
  .command('status')
  .description('Check project status')
  .action(checkStatus);

program
  .command('tasks')
  .description('List tasks with IDs, titles, phase, and status')
  .action(async () => {
    const { listTasks } = await import('./commands/spec-tasks.js');
    await listTasks();
  });

// Advanced Commands
program
  .command('execute-phase <phase-name>')
  .description('Execute all tasks in a specific phase')
  .option('--read-only', 'Run in read-only sandbox (no file writes)')
  .action(executePhase);

program
  .command('plan-summary')
  .description('Show implementation plan overview')
  .action(planSummary);

// Add a helpful hint in the global help output for phase names with spaces
program.addHelpText('afterAll', `\nNotes:\n  - If a phase name contains spaces, quote or escape it.\n    macOS/Linux: codex-spec execute-phase "Core Features"  OR  codex-spec execute-phase Core\\ Features\n    Windows:     codex-spec execute-phase "Core Features"\n`);

program.parse();


