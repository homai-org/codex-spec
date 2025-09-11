import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { CodexClient } from '../utils/codex-client.js';

export async function executeTask(taskId, options = {}) {
  const codexClient = new CodexClient();
  const specDir = '.codex-specs';

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
      mode: 'code',
      onProgress: (data) => process.stdout.write(chalk.gray(data))
    });

    console.log(chalk.green('\n✅ Task completed successfully'));
    console.log(chalk.cyan('📝 Implementation summary:'), result.slice(-200) + '...');

    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    task.result = result;
    await fs.writeJson(path.join(specDir, 'tasks.json'), tasks, { spaces: 2 });
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

export async function executePhase(phaseName) {
  const tasks = await fs.readJson('.codex-specs/tasks.json');
  const phaseTasks = tasks.filter(t => t.phase === phaseName && t.status !== 'completed');
  if (phaseTasks.length === 0) {
    console.log(chalk.yellow(`No pending tasks found for phase: ${phaseName}`));
    return;
  }
  console.log(chalk.blue(`🚀 Executing ${phaseTasks.length} tasks in phase: ${phaseName}`));
  for (const task of phaseTasks) {
    await executeTask(task.id);
  }
  console.log(chalk.green(`✅ Phase "${phaseName}" completed`));
}


