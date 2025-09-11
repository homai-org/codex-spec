import fs from 'fs-extra';
import chalk from 'chalk';
import { CodexClient } from '../utils/codex-client.js';
import { PromptBuilder } from '../utils/prompt-builder.js';

export async function contextRefresh() {
  const codexClient = new CodexClient();
  const promptBuilder = new PromptBuilder();
  const ctxDir = '.codex-specs/context';
  await fs.ensureDir(ctxDir);

  console.log(chalk.blue('🧼 Refreshing project context from scratch...'));

  const analysis = 'Full refresh requested. Reassess the project holistically.';
  const info = { projectName: '', projectDescription: '', projectType: '', targetUsers: '', keyFeatures: '', techStack: '' };

  const product = await codexClient.generateWithAPI(
    promptBuilder.buildProductContextPrompt(info, analysis),
    'Produce complete, current product context.'
  );
  const tech = await codexClient.generateWithAPI(
    promptBuilder.buildTechContextPrompt(info, analysis),
    'Produce complete, current technical context.'
  );
  const structure = await codexClient.generateWithAPI(
    promptBuilder.buildStructureContextPrompt(info, analysis),
    'Produce complete, current structure context.'
  );

  await fs.writeFile(`${ctxDir}/product.md`, product);
  await fs.writeFile(`${ctxDir}/tech.md`, tech);
  await fs.writeFile(`${ctxDir}/structure.md`, structure);

  console.log(chalk.green('✅ Context refresh complete'));
}


