import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { CodexClient } from '../utils/codex-client.js';
import { PromptBuilder } from '../utils/prompt-builder.js';

export async function createPlan(specName) {
  const codexClient = new CodexClient();
  const promptBuilder = new PromptBuilder();

  const specDir = path.join('.codex-specs', specName || 'current');
  const contextDir = '.codex-specs/context';

  if (!await fs.pathExists(specDir)) {
    console.error(chalk.red('❌ No specification found. Run "codex-spec create" first.'));
    return;
  }

  const specification = await fs.readFile(path.join(specDir, 'specification.md'), 'utf8');
  const requirements = await fs.readFile(path.join(specDir, 'requirements.md'), 'utf8').catch(() => '');

  let projectContext = '';
  if (await fs.pathExists(contextDir)) {
    const product = await fs.readFile(path.join(contextDir, 'product.md'), 'utf8').catch(() => '');
    const tech = await fs.readFile(path.join(contextDir, 'tech.md'), 'utf8').catch(() => '');
    const structure = await fs.readFile(path.join(contextDir, 'structure.md'), 'utf8').catch(() => '');
    projectContext = `
## Project Context

### Product Context
${product}

### Technical Context  
${tech}

### Structure Context
${structure}
`;
  }

  console.log(chalk.blue('🎯 Creating implementation plan...'));
  const planPrompt = promptBuilder.buildPlanCreationPrompt(specification, requirements, projectContext);
  const plan = await codexClient.generateWithAPI(
    planPrompt,
    'You are a technical architect creating detailed implementation plans. Focus on architecture, technical approach, and breaking down work into manageable tasks with clear phases.'
  );

  await fs.writeFile(path.join(specDir, 'plan.md'), plan);

  console.log(chalk.blue('📋 Extracting tasks from plan...'));
  const taskExtractionPrompt = promptBuilder.buildTaskExtractionPrompt(plan);
  const tasksJson = await codexClient.generateWithAPI(
    taskExtractionPrompt,
    'Extract tasks from the implementation plan and return as valid JSON array. Each task should have: id, title, description, files, dependencies, acceptanceCriteria, phase, complexity.'
  );

  try {
    const tasks = JSON.parse(tasksJson);
    await fs.writeJson(path.join(specDir, 'tasks.json'), tasks, { spaces: 2 });
    console.log(chalk.green('✅ Implementation plan created'));
    console.log(chalk.cyan(`📋 ${tasks.length} tasks identified`));
    console.log(chalk.cyan('📁 Plan saved to:'), path.join(specDir, 'plan.md'));
    // Auto-run summary after success
    const { planSummary } = await import('./spec-status.js');
    await planSummary();
  } catch (error) {
    console.error(chalk.red('❌ Failed to parse tasks JSON:'), error.message);
    console.log(chalk.yellow('📄 Plan document saved, but task extraction failed'));
    console.log(chalk.cyan('💡 You may need to manually review and fix the plan'));
  }
}


