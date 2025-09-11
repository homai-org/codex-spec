import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { CodexClient } from '../utils/codex-client.js';
import { PromptBuilder } from '../utils/prompt-builder.js';

export async function createSpec(featureName, description = '') {
  const codexClient = new CodexClient();
  const promptBuilder = new PromptBuilder();

  const baseDir = path.join('.codex-specs', featureName || 'current');
  await fs.ensureDir(baseDir);

  console.log(chalk.blue(`📝 Creating specification for: ${featureName}`));
  const prompt = promptBuilder.buildSpecCreationPrompt(featureName, description);
  const spec = await codexClient.generateWithAPI(
    prompt,
    'You are a senior product engineer writing precise, actionable specifications.'
  );

  await fs.writeFile(path.join(baseDir, 'specification.md'), spec);

  const agents = promptBuilder.buildAgentsFile(featureName, description);
  await fs.writeFile(path.join(baseDir, 'AGENTS.md'), agents);

  console.log(chalk.green('✅ Specification created'));
  console.log(chalk.cyan('📁 Saved to:'), path.join(baseDir, 'specification.md'));
}


