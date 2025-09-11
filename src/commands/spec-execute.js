import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { CodexClient } from '../utils/codex-client.js';

export async function executeTask(taskId, options = {}) {
  const codexClient = new CodexClient();
  const specDir = path.join('.codex-specs', 'current');

  if (!await fs.pathExists(path.join(specDir, 'tasks.json'))) {
    console.error(chalk.red('❌ No tasks found. Run "codex-spec plan" first.'));
    return;
  }

  const tasks = await fs.readJson(path.join(specDir, 'tasks.json'));
  const plan = await fs.readFile(path.join(specDir, 'plan.md'), 'utf8').catch(() => '');
  const task = tasks.find(t => t.id === taskId);
  if (!task) {
    console.error(chalk.red(`❌ Task ${taskId} not found`));
    return;
  }

  const uncompletedDeps = (task.dependencies || []).filter(depId => {
    const depTask = tasks.find(t => t.id === depId);
    return depTask && depTask.status !== 'completed';
  });
  if (uncompletedDeps.length > 0 && !options.force) {
    console.error(chalk.red(`❌ Incomplete dependencies: ${uncompletedDeps.join(', ')}`));
    console.log(chalk.yellow('💡 Complete dependencies first or use --force to override'));
    return;
  }

  console.log(chalk.blue(`🚀 Executing task: ${task.title}`));
  console.log(chalk.gray(`📋 Phase: ${task.phase} | Complexity: ${task.complexity}`));

  const executionPrompt = buildExecutionPrompt(task, plan);
  try {
    task.status = 'in-progress';
    task.startedAt = new Date().toISOString();
    await fs.writeJson(path.join(specDir, 'tasks.json'), tasks, { spaces: 2 });

    const result = await codexClient.executeCodexCLI(executionPrompt, {
      exec: true,
      onProgress: (data) => process.stdout.write(chalk.gray(data)),
      sandbox: options.readOnly ? 'read-only' : 'workspace-write'
    });

    // Persist full execution log
    const logPath = await writeExecutionLog(specDir, task.id, result);
    const summary = buildTailSummary(result, 12);
    const changedFiles = extractChangedFiles(result);

    if (options.readOnly) {
      console.log(chalk.yellow('\nℹ️ Read-only mode: not marking task as completed.'));
      printChangedFiles(changedFiles, true);
      console.log(chalk.cyan('📝 Preview summary:\n') + summary);
      console.log(chalk.gray(`\n📄 Full log: ${logPath}`));
      // Revert status back to pending and store preview details
      task.status = 'pending';
      task.previewedAt = new Date().toISOString();
      task.preview = { log: logPath };
      // Clear any previous error since this run succeeded
      delete task.error;
      delete task.failedAt;
      await fs.writeJson(path.join(specDir, 'tasks.json'), tasks, { spaces: 2 });
    } else {
      console.log(chalk.green('\n✅ Task completed successfully'));
      printChangedFiles(changedFiles, false);
      console.log(chalk.cyan('📝 Implementation summary:\n') + summary);
      console.log(chalk.gray(`\n📄 Full log: ${logPath}`));
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.result = { log: logPath };
      const filesCreated = changedFiles.filter(f => f.action === 'Add').map(f => f.path);
      const filesUpdated = changedFiles.filter(f => f.action !== 'Add').map(f => f.path);
      task.artifacts = { filesCreated, filesUpdated, log: logPath };
      // Clear any previous error since this run succeeded
      delete task.error;
      delete task.failedAt;
      await fs.writeJson(path.join(specDir, 'tasks.json'), tasks, { spaces: 2 });
    }
  } catch (error) {
    console.error(chalk.red('❌ Task execution failed:'), error.message);
    task.status = 'failed';
    task.error = error.message;
    task.failedAt = new Date().toISOString();
    await fs.writeJson(path.join(specDir, 'tasks.json'), tasks, { spaces: 2 });
  }
}

function buildExecutionPrompt(task, plan) {
  return `
Based on our implementation plan and this specific task:

## Implementation Plan Context
${plan}

## Current Task Details
**Task ID:** ${task.id}
**Title:** ${task.title}
**Phase:** ${task.phase}
**Complexity:** ${task.complexity}

**Description:** 
${task.description}

**Files to create/modify:** 
${(task.files || []).join(', ')}

**Dependencies completed:** 
${(task.dependencies || []).length > 0 ? task.dependencies.join(', ') : 'None'}

**Acceptance Criteria:**
${(task.acceptanceCriteria || []).map(criteria => `- ${criteria}`).join('\n')}

## Implementation Instructions

Please implement this task following these guidelines:
1. **Architecture Alignment**: Follow the technical architecture defined in the plan
2. **Code Standards**: Adhere to the project's coding standards in AGENTS.md  
3. **Testing**: Write tests as specified in the plan's QA strategy
4. **Documentation**: Update relevant documentation and comments
5. **Integration**: Consider integration points mentioned in the plan

${task.technicalNotes ? `**Technical Notes:** ${task.technicalNotes}` : ''}

Please provide a complete implementation with all necessary files, tests, and documentation updates.
`;
}

export async function executePhase(phaseName, options = {}) {
  const tasks = await fs.readJson(path.join('.codex-specs', 'current', 'tasks.json'));
  const phaseTasks = tasks.filter(t => t.phase === phaseName && t.status !== 'completed');
  if (phaseTasks.length === 0) {
    console.log(chalk.yellow(`No pending tasks found for phase: ${phaseName}`));
    return;
  }
  console.log(chalk.blue(`🚀 Executing ${phaseTasks.length} tasks in phase: ${phaseName}`));
  for (const task of phaseTasks) {
    await executeTask(task.id, { readOnly: options.readOnly });
  }
  console.log(chalk.green(`✅ Phase "${phaseName}" completed`));
}

function stripAnsi(input) {
  return String(input).replace(/\u001b\[[0-9;]*m/g, '');
}

function buildTailSummary(output, maxLines = 12) {
  const clean = stripAnsi(output);
  const lines = clean.split(/\r?\n/).filter(Boolean);
  const noisyPrefixes = ['diff --git', 'index ', '@@', '---', '+++', '*** ', '```', '+', '-'];
  const filtered = lines.filter(l => !noisyPrefixes.some(p => l.startsWith(p)));
  const arr = filtered.length > 2 ? filtered : lines; // fallback if over-filtered
  const tail = arr.slice(-maxLines);
  return tail.join('\n');
}

async function writeExecutionLog(specDir, taskId, contents) {
  const logsDir = path.join(specDir, 'logs');
  await fs.ensureDir(logsDir);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(logsDir, `${taskId}-${ts}.log`);
  await fs.writeFile(file, contents);
  return file;
}

function extractChangedFiles(output) {
  const clean = stripAnsi(output);
  const map = new Map();
  const re1 = /\*\*\*\s+(Add|Update)\s+File:\s+([^\n]+)/g; // our patch header style
  const re2 = /File:\s+([^\s]+)\s*$/gm; // generic "File: path" lines, assume Update
  let m;
  while ((m = re1.exec(clean)) !== null) {
    const action = m[1].trim();
    const p = m[2].trim();
    const prev = map.get(p);
    if (!prev || prev.action !== 'Add') {
      map.set(p, { action, path: p });
    }
  }
  while ((m = re2.exec(clean)) !== null) {
    const p = m[1].trim();
    if (p && !p.startsWith('http') && !map.has(p)) {
      map.set(p, { action: 'Update', path: p });
    }
  }
  return Array.from(map.values());
}

function printChangedFiles(changedFiles, isPreview) {
  if (!changedFiles || changedFiles.length === 0) return;
  const created = changedFiles.filter(f => f.action === 'Add').map(f => f.path);
  const updated = changedFiles.filter(f => f.action !== 'Add').map(f => f.path);
  const title = isPreview ? '🗂️ Files changed (preview):' : '🗂️ Files changed:';
  console.log(chalk.cyan(title));
  if (created.length > 0) {
    console.log(chalk.green('  + Created:'));
    created.forEach(p => console.log('    ' + p));
  }
  if (updated.length > 0) {
    console.log(chalk.blue('  ~ Updated:'));
    updated.forEach(p => console.log('    ' + p));
  }
}


