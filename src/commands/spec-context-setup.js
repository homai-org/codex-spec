import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { CodexClient } from '../utils/codex-client.js';
import { PromptBuilder } from '../utils/prompt-builder.js';

export async function contextSetup(options) {
  const codexClient = new CodexClient();
  const promptBuilder = new PromptBuilder();

  console.log(chalk.blue('🎯 Setting up project context...'));

  const contextDir = '.codex-specs/context';
  const contextExists = await fs.pathExists(contextDir);
  if (contextExists && !options.force) {
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: 'Project context already exists. Overwrite?',
      default: false
    }]);
    if (!overwrite) {
      console.log(chalk.yellow('❌ Setup cancelled'));
      return;
    }
  }

  await fs.ensureDir(contextDir);

  const projectInfo = await gatherProjectInfo();

  let codebaseAnalysis = '';
  const hasSourceCode = await detectSourceCode();
  if (hasSourceCode) {
    console.log(chalk.blue('📁 Analyzing existing codebase...'));
    codebaseAnalysis = await analyzeCodebase(codexClient);
  }

  await generateContextFiles(codexClient, promptBuilder, projectInfo, codebaseAnalysis, contextDir);
  await updateAgentsWithContext();

  console.log(chalk.green('✅ Context setup complete!'));
  console.log(chalk.cyan('📁 Context files created:'));
  console.log('  - .codex-specs/context/product.md');
  console.log('  - .codex-specs/context/tech.md');
  console.log('  - .codex-specs/context/structure.md');
  console.log('  - Updated AGENTS.md with context references');
}

async function gatherProjectInfo() {
  return await inquirer.prompt([
    { type: 'input', name: 'projectName', message: 'Project name:', validate: input => input.length > 0 },
    { type: 'input', name: 'projectDescription', message: 'Brief project description:' },
    { type: 'list', name: 'projectType', message: 'Project type:', choices: ['Web Application','Mobile App','API/Backend Service','Desktop Application','CLI Tool','Library/Package','Microservice','Other'] },
    { type: 'input', name: 'targetUsers', message: 'Target users/audience:' },
    { type: 'input', name: 'keyFeatures', message: 'Key features (comma-separated):' },
    { type: 'input', name: 'techStack', message: 'Current tech stack (if any):' }
  ]);
}

async function detectSourceCode() {
  const commonSourceDirs = ['src', 'lib', 'app', 'components', 'pages', 'api'];
  const configFiles = ['package.json', 'requirements.txt', 'Cargo.toml', 'go.mod', 'pom.xml'];
  for (const dir of commonSourceDirs) if (await fs.pathExists(dir)) return true;
  for (const file of configFiles) if (await fs.pathExists(file)) return true;
  return false;
}

async function analyzeCodebase(codexClient) {
  const analysisPrompt = `
Analyze the current codebase structure and provide a comprehensive overview:

1. **Technology Stack**: Programming languages, frameworks, libraries detected
2. **Architecture Pattern**: MVC, microservices, monolith, serverless, etc.
3. **Key Components**: Main modules, services, or components identified
4. **API Endpoints**: REST routes, GraphQL resolvers, or RPC methods found
5. **Database/Storage**: Data persistence patterns and technologies detected
6. **Build/Deploy**: Build tools, CI/CD configuration, deployment setup
7. **Testing**: Testing frameworks and current test coverage approach
8. **Dependencies**: Major external dependencies and their purposes

Focus on factual observations from the codebase structure, configuration files, and package definitions.
`;
  try {
    return await codexClient.executeCodexCLI(analysisPrompt, { mode: 'ask' });
  } catch (error) {
    console.log(chalk.yellow('⚠️  Could not analyze codebase automatically'));
    return 'Codebase analysis not available - manual setup required.';
  }
}

async function generateContextFiles(codexClient, promptBuilder, projectInfo, codebaseAnalysis, contextDir) {
  console.log(chalk.blue('📋 Generating product context...'));
  const productPrompt = promptBuilder.buildProductContextPrompt(projectInfo, codebaseAnalysis);
  const productContent = await codexClient.generateWithAPI(
    productPrompt,
    'You are a product manager creating comprehensive product documentation. Focus on user needs, business goals, and feature priorities.'
  );
  await fs.writeFile(path.join(contextDir, 'product.md'), productContent);

  console.log(chalk.blue('⚙️ Generating technical context...'));
  const techPrompt = promptBuilder.buildTechContextPrompt(projectInfo, codebaseAnalysis);
  const techContent = await codexClient.generateWithAPI(
    techPrompt,
    'You are a technical architect documenting system architecture, technology choices, and development standards.'
  );
  await fs.writeFile(path.join(contextDir, 'tech.md'), techContent);

  console.log(chalk.blue('🏗️ Generating project structure context...'));
  const structurePrompt = promptBuilder.buildStructureContextPrompt(projectInfo, codebaseAnalysis);
  const structureContent = await codexClient.generateWithAPI(
    structurePrompt,
    'You are documenting project structure, file organization, and development workflows.'
  );
  await fs.writeFile(path.join(contextDir, 'structure.md'), structureContent);
}

async function updateAgentsWithContext() {
  const agentsPath = 'AGENTS.md';
  const contextSection = `
## Project Context Files

Before working on any feature, review these context files:

- **Product Context**: \`.codex-specs/context/product.md\` - Business goals, user needs, feature priorities
- **Technical Context**: \`.codex-specs/context/tech.md\` - Architecture, tech stack, coding standards  
- **Structure Context**: \`.codex-specs/context/structure.md\` - File organization, workflows, conventions

These files are updated as the project evolves. Always check the latest version before implementation.

## Context-Aware Development

When implementing features:
1. Read relevant context files first
2. Align implementation with established patterns
3. Update context files after significant changes
4. Reference context in code reviews
`;

  const agentsExists = await fs.pathExists(agentsPath);
  if (agentsExists) {
    const content = await fs.readFile(agentsPath, 'utf8');
    if (!content.includes('Project Context Files')) {
      await fs.writeFile(agentsPath, content + '\n' + contextSection);
    }
  } else {
    await fs.writeFile(agentsPath, contextSection);
  }
}


