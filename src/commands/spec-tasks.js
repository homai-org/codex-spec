import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

function resolveTasksPath() {
  const current = path.join('.codex-specs', 'current', 'tasks.json');
  const legacy = path.join('.codex-specs', 'tasks.json');
  if (fs.existsSync(current)) return current;
  if (fs.existsSync(legacy)) return legacy;
  return null;
}

export async function listTasks() {
  const tasksPath = resolveTasksPath();
  if (!tasksPath) {
    console.log(chalk.yellow('No tasks.json found. Generate a plan first.'));
    return;
  }
  const tasks = await fs.readJson(tasksPath);
  console.log(chalk.cyan('🧩 Tasks'));

  const pad = (s, n) => String(s ?? '').padEnd(n);
  const truncate = (s, n) => {
    const str = String(s ?? '');
    return str.length <= n ? str : str.slice(0, Math.max(0, n - 1)) + '…';
  };

  // Header
  console.log(`  ${pad('ID', 10)} ${pad('Title', 40)} ${pad('Phase', 14)} ${pad('Status', 10)}`);
  console.log(`  ${'-'.repeat(10)} ${'-'.repeat(40)} ${'-'.repeat(14)} ${'-'.repeat(10)}`);

  // Rows
  tasks.forEach(t => {
    const status = t.status || 'pending';
    const title = truncate(t.title, 40);
    console.log(`  ${pad(t.id, 10)} ${pad(title, 40)} ${pad(t.phase, 14)} ${pad(status, 10)}`);
  });

  console.log(chalk.gray('\nRun a task: codex-spec execute <task-id>'));
  console.log(chalk.gray('Run all tasks in a phase: codex-spec execute-phase <phase-name>'));
  console.log(chalk.gray('If the phase has spaces, quote or escape it:'));
  console.log(chalk.gray('  macOS/Linux: codex-spec execute-phase "Core Features"  OR  codex-spec execute-phase Core\\ Features'));
  console.log(chalk.gray('  Windows:     codex-spec execute-phase "Core Features"'));
}


