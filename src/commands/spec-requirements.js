import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { CodexClient } from '../utils/codex-client.js';
import { PromptBuilder } from '../utils/prompt-builder.js';

export async function generateRequirements(specName) {
  const codexClient = new CodexClient();
  const promptBuilder = new PromptBuilder();
  const specDir = path.join('.codex-specs', specName || 'current');

  if (!await fs.pathExists(path.join(specDir, 'specification.md'))){
    console.error(chalk.red('❌ No specification found. Run "codex-spec create" first.'));
    return;
  }

  console.log(chalk.blue('🧭 Generating requirements...'));
  const specification = await fs.readFile(path.join(specDir, 'specification.md'), 'utf8');
  const prompt = promptBuilder.buildRequirementsPrompt(specification);

  const requirements = await codexClient.generateWithAPI(
    prompt,
    'You are a business analyst producing precise, testable software requirements.'
  );

  await fs.writeFile(path.join(specDir, 'requirements.md'), requirements);
  console.log(chalk.green('✅ Requirements generated'));
  console.log(chalk.cyan('📁 Saved to:'), path.join(specDir, 'requirements.md'));
}


