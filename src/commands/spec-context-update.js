import fs from 'fs-extra';
import chalk from 'chalk';
import { CodexClient } from '../utils/codex-client.js';
import { PromptBuilder } from '../utils/prompt-builder.js';
import { execSync } from 'child_process';

export async function contextUpdate(component, options = {}) {
  const codexClient = new CodexClient();
  const promptBuilder = new PromptBuilder();

  console.log(chalk.blue('🔄 Updating project context...'));

  let changeSummary = '';
  if (options.auto) {
    try {
      changeSummary = execSync('git diff --name-status HEAD~1..HEAD | cat', { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    } catch (_) {
      changeSummary = 'No git diff available.';
    }
  }

  const ctxDir = '.codex-specs/context';
  await fs.ensureDir(ctxDir);
  const info = { projectName: '', projectDescription: '', projectType: '', targetUsers: '', keyFeatures: '', techStack: '' };

  if (!component || component === 'product') {
    const product = await codexClient.generateWithAPI(
      promptBuilder.buildProductContextPrompt(info, changeSummary),
      'Update the product context reflecting recent changes.'
    );
    await fs.writeFile(`${ctxDir}/product.md`, product);
  }
  if (!component || component === 'tech') {
    const tech = await codexClient.generateWithAPI(
      promptBuilder.buildTechContextPrompt(info, changeSummary),
      'Update the technical context reflecting recent changes.'
    );
    await fs.writeFile(`${ctxDir}/tech.md`, tech);
  }
  if (!component || component === 'structure') {
    const structure = await codexClient.generateWithAPI(
      promptBuilder.buildStructureContextPrompt(info, changeSummary),
      'Update the structure context reflecting recent changes.'
    );
    await fs.writeFile(`${ctxDir}/structure.md`, structure);
  }

  console.log(chalk.green('✅ Context updated'));
}


