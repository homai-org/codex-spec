import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export async function checkStatus() {
  const specDir = '.codex-specs';
  const tasksPath = path.join(specDir, 'tasks.json');

  if (!await fs.pathExists(tasksPath)) {
    console.log(chalk.yellow('No tasks.json found. Generate a plan first.'));
    return;
  }

  const tasks = await fs.readJson(tasksPath);
  const totals = { total: tasks.length, completed: 0, inProgress: 0, failed: 0, pending: 0 };
  tasks.forEach(t => {
    if (t.status === 'completed') totals.completed += 1;
    else if (t.status === 'in-progress') totals.inProgress += 1;
    else if (t.status === 'failed') totals.failed += 1;
    else totals.pending += 1;
  });

  const pct = (n) => totals.total ? Math.round((n / totals.total) * 100) : 0;

  console.log(chalk.cyan('📊 Task Status'));
  console.log(`  Total: ${totals.total}`);
  console.log(chalk.green(`  Completed: ${totals.completed} (${pct(totals.completed)}%)`));
  console.log(chalk.blue(`  In Progress: ${totals.inProgress} (${pct(totals.inProgress)}%)`));
  console.log(chalk.red(`  Failed: ${totals.failed} (${pct(totals.failed)}%)`));
  console.log(chalk.gray(`  Pending: ${totals.pending} (${pct(totals.pending)}%)`));
}

export async function planSummary() {
  const specDir = '.codex-specs';
  const tasksPath = path.join(specDir, 'tasks.json');

  if (!await fs.pathExists(tasksPath)) {
    console.log(chalk.yellow('No tasks.json found. Generate a plan first.'));
    return;
  }

  const tasks = await fs.readJson(tasksPath);
  const phases = [...new Set(tasks.map(t => t.phase))];
  console.log(chalk.cyan('🗺️ Plan Summary by Phase'));
  phases.forEach(phase => {
    const phaseTasks = tasks.filter(t => t.phase === phase);
    const completed = phaseTasks.filter(t => t.status === 'completed').length;
    console.log(`  ${phase}: ${completed}/${phaseTasks.length} completed`);
  });
}


