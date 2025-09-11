import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { CodexClient } from '../utils/codex-client.js';
import { PromptBuilder } from '../utils/prompt-builder.js';

export async function createSpec(featureName, description = '', options = {}) {
  const codexClient = new CodexClient();
  const promptBuilder = new PromptBuilder();

  // Determine spec directory name using pattern: YYYY-MM-DD_name_of_the_spec
  const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  const slug = await chooseSpecSlug(featureName, codexClient, options.title);
  const { dirName, dirPath: baseDir } = await ensureUniqueDirName('.codex-specs', today, slug);
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

  // Maintain a convenient alias for follow-up commands (requirements/plan) without spec name
  const currentDir = path.join('.codex-specs', 'current');
  await fs.ensureDir(currentDir);
  await fs.writeFile(path.join(currentDir, 'specification.md'), spec);
  await fs.writeFile(path.join(currentDir, 'AGENTS.md'), agents);
  console.log(chalk.gray(`📎 Aliased as latest at ${path.join(currentDir, 'specification.md')}`));
}

function toSnakeCase(input) {
  const normalized = input
    .replace(/['"“”‘’`]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return normalized || 'spec';
}

async function chooseSpecSlug(featureName, codexClient, overrideTitle) {
  if (overrideTitle) return toSnakeCase(overrideTitle);
  const base = toSnakeCase(featureName);
  try {
    const suggestion = await codexClient.generateWithAPI(
      `Generate a concise, clear snake_case slug (3-6 words) for this feature. Letters, numbers, and underscores only. No prefix/suffix.\n\nFeature: ${featureName}`,
      'Return ONLY the snake_case slug, nothing else.'
    );
    const cleaned = toSnakeCase(String(suggestion).split(/\s|\n/)[0]);
    return cleaned || base;
  } catch (_) {
    return base;
  }
}

async function ensureUniqueDirName(rootDir, datePrefix, slug) {
  let dirName = `${datePrefix}-${slug}`;
  let dirPath = path.join(rootDir, dirName);
  let counter = 2;
  while (await fs.pathExists(dirPath)) {
    dirName = `${datePrefix}-${slug}-${counter}`;
    dirPath = path.join(rootDir, dirName);
    counter += 1;
  }
  return { dirName, dirPath };
}


