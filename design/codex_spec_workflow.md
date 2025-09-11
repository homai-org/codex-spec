# OpenAI Codex Spec-Driven Workflow Tool

## 1. Project Structure

```
codex-spec-workflow/
├── src/
│   ├── commands/
│   │   ├── spec-context-setup.js
│   │   ├── spec-context-update.js
│   │   ├── spec-context-refresh.js
│   │   ├── spec-create.js
│   │   ├── spec-requirements.js
│   │   ├── spec-plan.js
│   │   ├── spec-execute.js
│   │   └── spec-status.js
│   ├── templates/
│   │   ├── product-template.md
│   │   ├── tech-template.md
│   │   ├── structure-template.md
│   │   ├── requirements-template.md
│   │   ├── plan-template.md
│   │   └── agents-template.md
│   ├── utils/
│   │   ├── codex-client.js
│   │   ├── file-manager.js
│   │   └── prompt-builder.js
│   └── cli.js
├── templates/
├── package.json
└── README.md
```

## 2. Enhanced CLI Interface (src/cli.js)

```javascript
#!/usr/bin/env node
import { Command } from 'commander';
import { 
  contextSetup, 
  contextUpdate, 
  contextRefresh, 
  createSpec, 
  generateRequirements, 
  createPlan, 
  executeTask, 
  checkStatus 
} from './commands/index.js';

const program = new Command();

program
  .name('codex-spec')
  .description('Spec-driven development workflow for OpenAI Codex')
  .version('1.0.0');

// Context Management Commands
program
  .command('context-setup')
  .description('Initialize project context (product.md, tech.md, structure.md)')
  .option('--force', 'Overwrite existing context files')
  .action(contextSetup);

program
  .command('context-update [component]')
  .description('Update project context after implementing features')
  .option('--auto', 'Automatically detect changes')
  .action(contextUpdate);

program
  .command('context-refresh')
  .description('Manually refresh project context from current codebase')
  .action(contextRefresh);

// Feature Development Commands
program
  .command('create <feature-name> [description]')
  .description('Create a new feature specification')
  .action(createSpec);

program
  .command('requirements')
  .description('Generate requirements document')
  .action(generateRequirements);

program
  .command('plan')
  .description('Create implementation plan with tasks')
  .action(createPlan);

program
  .command('execute <task-id>')
  .description('Execute specific task with Codex')
  .action(executeTask);

program
  .command('status')
  .description('Check project status')
  .action(checkStatus);

// Advanced Commands
program
  .command('execute-phase <phase-name>')
  .description('Execute all tasks in a specific phase')
  .action(executePhase);

program
  .command('plan-summary')
  .description('Show implementation plan overview')
  .action(planSummary);

program.parse();
```

## 3. Enhanced Codex Integration (src/utils/codex-client.js)

```javascript
import { spawn } from 'child_process';
import OpenAI from 'openai';

export class CodexClient {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Execute Codex CLI commands with enhanced error handling
  async executeCodexCLI(prompt, options = {}) {
    return new Promise((resolve, reject) => {
      const args = ['--mode', options.mode || 'suggest'];
      
      // Add additional Codex CLI options
      if (options.autoApprove) args.push('--auto-approve');
      if (options.verbose) args.push('--verbose');
      
      const codex = spawn('codex', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: options.cwd || process.cwd()
      });

      let output = '';
      let error = '';

      codex.stdout.on('data', (data) => {
        output += data.toString();
        if (options.onProgress) {
          options.onProgress(data.toString());
        }
      });

      codex.stderr.on('data', (data) => {
        error += data.toString();
      });

      codex.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Codex CLI failed (exit code ${code}): ${error}`));
        }
      });

      // Send prompt to Codex
      codex.stdin.write(prompt);
      codex.stdin.end();
    });
  }

  // Enhanced API integration with better model selection
  async generateWithAPI(prompt, systemMessage, options = {}) {
    const model = options.model || 'gpt-4';
    const temperature = options.temperature || 0.3;
    
    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature,
        max_tokens: options.maxTokens || 4000
      });

      return response.choices[0].message.content;
    } catch (error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  // Batch task execution for Codex cloud
  async executeTaskBatch(tasks, options = {}) {
    const results = [];
    
    for (const task of tasks) {
      try {
        console.log(`🚀 Executing: ${task.title}`);
        const result = await this.executeCodexCLI(task.prompt, {
          mode: 'code',
          ...options
        });
        
        results.push({
          taskId: task.id,
          status: 'completed',
          result
        });
      } catch (error) {
        results.push({
          taskId: task.id,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    return results;
  }
}
```

## 4. Context Setup Command (src/commands/spec-context-setup.js)

```javascript
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
  
  // Check if context already exists
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
  
  // Gather project information interactively
  const projectInfo = await gatherProjectInfo();
  
  // Analyze existing codebase if present
  let codebaseAnalysis = '';
  const hasSourceCode = await detectSourceCode();
  
  if (hasSourceCode) {
    console.log(chalk.blue('📁 Analyzing existing codebase...'));
    codebaseAnalysis = await analyzeCodebase(codexClient);
  }
  
  // Generate context files
  await generateContextFiles(codexClient, promptBuilder, projectInfo, codebaseAnalysis, contextDir);
  
  // Update AGENTS.md with context references
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
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      validate: input => input.length > 0
    },
    {
      type: 'input',
      name: 'projectDescription',
      message: 'Brief project description:'
    },
    {
      type: 'list',
      name: 'projectType',
      message: 'Project type:',
      choices: [
        'Web Application',
        'Mobile App', 
        'API/Backend Service',
        'Desktop Application',
        'CLI Tool',
        'Library/Package',
        'Microservice',
        'Other'
      ]
    },
    {
      type: 'input',
      name: 'targetUsers',
      message: 'Target users/audience:'
    },
    {
      type: 'input',
      name: 'keyFeatures',
      message: 'Key features (comma-separated):'
    },
    {
      type: 'input',
      name: 'techStack',
      message: 'Current tech stack (if any):'
    }
  ]);
}

async function detectSourceCode() {
  const commonSourceDirs = ['src', 'lib', 'app', 'components', 'pages', 'api'];
  const configFiles = ['package.json', 'requirements.txt', 'Cargo.toml', 'go.mod', 'pom.xml'];
  
  for (const dir of commonSourceDirs) {
    if (await fs.pathExists(dir)) return true;
  }
  
  for (const file of configFiles) {
    if (await fs.pathExists(file)) return true;
  }
  
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
  // Generate product.md
  console.log(chalk.blue('📋 Generating product context...'));
  const productPrompt = promptBuilder.buildProductContextPrompt(projectInfo, codebaseAnalysis);
  const productContent = await codexClient.generateWithAPI(
    productPrompt,
    "You are a product manager creating comprehensive product documentation. Focus on user needs, business goals, and feature priorities."
  );
  await fs.writeFile(path.join(contextDir, 'product.md'), productContent);
  
  // Generate tech.md
  console.log(chalk.blue('⚙️ Generating technical context...'));
  const techPrompt = promptBuilder.buildTechContextPrompt(projectInfo, codebaseAnalysis);
  const techContent = await codexClient.generateWithAPI(
    techPrompt,
    "You are a technical architect documenting system architecture, technology choices, and development standards."
  );
  await fs.writeFile(path.join(contextDir, 'tech.md'), techContent);
  
  // Generate structure.md
  console.log(chalk.blue('🏗️ Generating project structure context...'));
  const structurePrompt = promptBuilder.buildStructureContextPrompt(projectInfo, codebaseAnalysis);
  const structureContent = await codexClient.generateWithAPI(
    structurePrompt,
    "You are documenting project structure, file organization, and development workflows."
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
```

## 5. Enhanced Plan Creation (src/commands/spec-plan.js)

```javascript
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { CodexClient } from '../utils/codex-client.js';
import { PromptBuilder } from '../utils/prompt-builder.js';

export async function createPlan(specName) {
  const codexClient = new CodexClient();
  const promptBuilder = new PromptBuilder();
  
  // Read existing specification, requirements, and context
  const specDir = path.join('.codex-specs', specName || 'current');
  const contextDir = '.codex-specs/context';
  
  if (!await fs.pathExists(specDir)) {
    console.error(chalk.red('❌ No specification found. Run "codex-spec create" first.'));
    return;
  }
  
  const specification = await fs.readFile(path.join(specDir, 'specification.md'), 'utf8');
  const requirements = await fs.readFile(path.join(specDir, 'requirements.md'), 'utf8').catch(() => '');
  
  // Load project context if available
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
  
  // Generate plan with embedded tasks
  const planPrompt = promptBuilder.buildPlanCreationPrompt(specification, requirements, projectContext);
  
  const plan = await codexClient.generateWithAPI(
    planPrompt,
    "You are a technical architect creating detailed implementation plans. Focus on architecture, technical approach, and breaking down work into manageable tasks with clear phases."
  );
  
  // Save plan
  await fs.writeFile(path.join(specDir, 'plan.md'), plan);
  
  // Extract and save structured task data for execution
  console.log(chalk.blue('📋 Extracting tasks from plan...'));
  const taskExtractionPrompt = promptBuilder.buildTaskExtractionPrompt(plan);
  const tasksJson = await codexClient.generateWithAPI(
    taskExtractionPrompt,
    "Extract tasks from the implementation plan and return as valid JSON array. Each task should have: id, title, description, files, dependencies, acceptanceCriteria, phase, complexity."
  );
  
  try {
    const tasks = JSON.parse(tasksJson);
    await fs.writeJson(path.join(specDir, 'tasks.json'), tasks, { spaces: 2 });
    
    console.log(chalk.green('✅ Implementation plan created'));
    console.log(chalk.cyan(`📋 ${tasks.length} tasks identified`));
    console.log(chalk.cyan('📁 Plan saved to:'), path.join(specDir, 'plan.md'));
    
    // Show plan summary
    showPlanSummary(tasks);
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to parse tasks JSON:'), error.message);
    console.log(chalk.yellow('📄 Plan document saved, but task extraction failed'));
    console.log(chalk.cyan('💡 You may need to manually review and fix the plan'));
  }
}

function showPlanSummary(tasks) {
  console.log(chalk.cyan('\n📊 Plan Summary:'));
  const phases = [...new Set(tasks.map(t => t.phase))];
  
  phases.forEach(phase => {
    const phaseTasks = tasks.filter(t => t.phase === phase);
    const complexities = phaseTasks.reduce((acc, t) => {
      acc[t.complexity] = (acc[t.complexity] || 0) + 1;
      return acc;
    }, {});
    
    console.log(chalk.white(`  ${phase}: ${phaseTasks.length} tasks`));
    Object.entries(complexities).forEach(([complexity, count]) => {
      console.log(chalk.gray(`    ${complexity}: ${count}`));
    });
  });
  
  console.log(chalk.cyan('\n🚀 Next steps:'));
  console.log('  - Review plan.md for technical details');
  console.log('  - Execute tasks: codex-spec execute <task-id>');
  console.log('  - Execute by phase: codex-spec execute-phase <phase-name>');
}
```

## 6. Enhanced Task Execution (src/commands/spec-execute.js)

```javascript
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { CodexClient } from '../utils/codex-client.js';

export async function executeTask(taskId, options = {}) {
  const codexClient = new CodexClient();
  
  // Read current spec and plan
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
  
  // Check dependencies
  const uncompletedDeps = task.dependencies.filter(depId => {
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
  
  // Build execution prompt with plan context
  const executionPrompt = buildExecutionPrompt(task, plan);
  
  try {
    // Mark task as in progress
    task.status = 'in-progress';
    task.startedAt = new Date().toISOString();
    await fs.writeJson(path.join(specDir, 'tasks.json'), tasks, { spaces: 2 });
    
    // Execute with Codex CLI in code mode
    const result = await codexClient.executeCodexCLI(executionPrompt, { 
      mode: 'code',
      onProgress: (data) => {
        // Show real-time progress
        process.stdout.write(chalk.gray(data));
      }
    });
    
    console.log(chalk.green('\n✅ Task completed successfully'));
    console.log(chalk.cyan('📝 Implementation summary:'), result.slice(-200) + '...');
    
    // Update task status
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    task.result = result;
    await fs.writeJson(path.join(specDir, 'tasks.json'), tasks, { spaces: 2 });
    
    // Show next suggested tasks
    suggestNextTasks(tasks, task);
    
  } catch (error) {
    console.error(chalk.red('❌ Task execution failed:'), error.message);
    
    task.status = 'failed';
    task.error = error.message;
    task.failedAt = new Date().toISOString();
    await fs.writeJson(path.join(specDir, 'tasks.json'), tasks, { spaces: 2 });
    
    console.log(chalk.yellow('💡 Review the error and try again, or modify the task'));
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
${task.files.join(', ')}

**Dependencies completed:** 
${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}

**Acceptance Criteria:**
${task.acceptanceCriteria.map(criteria => `- ${criteria}`).join('\n')}

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

function suggestNextTasks(tasks, completedTask) {
  const availableTasks = tasks.filter(t => 
    t.status !== 'completed' && 
    t.status !== 'in-progress' &&
    t.dependencies.every(depId => {
      const depTask = tasks.find(dt => dt.id === depId);
      return depTask && depTask.status === 'completed';
    })
  );
  
  if (availableTasks.length > 0) {
    console.log(chalk.cyan('\n🎯 Suggested next tasks:'));
    availableTasks.slice(0, 3).forEach(task => {
      console.log(chalk.white(`  ${task.id}: ${task.title} (${task.complexity})`));
    });
    console.log(chalk.gray('\n💡 Run: codex-spec execute <task-id>'));
  }
}

// Phase execution function
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
```

## 7. Enhanced Prompt Builder (src/utils/prompt-builder.js)

```javascript
export class PromptBuilder {
  buildSpecCreationPrompt(featureName, description) {
    return `
Create a comprehensive specification for: ${featureName}

Description: ${description}

Please provide a detailed specification with the following structure:

## 1. Feature Overview
- Brief summary of the feature and its purpose
- Business value and objectives
- Success metrics and KPIs

## 2. User Stories & Personas
- Primary user personas who will use this feature
- User stories in the format: "As a [user], I want [goal] so that [benefit]"
- User journey and interaction flow

## 3. Functional Requirements
- Core functionality requirements
- User interface requirements
- Business logic requirements
- Integration requirements

## 4. Acceptance Criteria (EARS Format)
Use WHEN/IF/THEN format for testable criteria:
- WHEN [trigger condition] THEN [expected outcome]
- IF [condition] THEN [system behavior]
- Include edge cases and error scenarios

## 5. Non-Functional Requirements
- Performance requirements (response time, throughput)
- Security requirements
- Accessibility requirements
- Browser/platform compatibility

## 6. Technical Considerations
- Integration points with existing systems
- Dependencies on other features or services
- Data requirements and constraints
- API requirements

## 7. Testing Strategy
- Unit test requirements
- Integration test scenarios
- User acceptance test cases
- Performance test criteria

Format as clean markdown with clear sections and actionable requirements.
`;
  }

  buildAgentsFile(featureName, description) {
    return `# ${featureName} Development Guidelines

## Project Context
${description}

## Development Standards
- Use TypeScript for type safety where applicable
- Follow ESLint configuration in .eslintrc.js
- Write comprehensive unit tests (aim for 80%+ coverage)
- Use conventional commit messages (feat:, fix:, docs:, etc.)
- Follow semantic versioning for releases

## Testing Commands
- Run all tests: \`npm test\`
- Run tests in watch mode: \`npm run test:watch\`
- Run type checking: \`npm run type-check\`
- Run linting: \`npm run lint\`
- Check test coverage: \`npm run coverage\`

## Architecture Principles
- Follow domain-driven design principles
- Keep components small and focused (single responsibility)
- Use dependency injection for testability
- Implement proper error handling and logging
- Follow established patterns in the codebase

## Code Review Checklist
- [ ] All tests pass
- [ ] Code follows established style guide
- [ ] Documentation updated (README, API docs)
- [ ] Type safety maintained
- [ ] Error handling implemented
- [ ] Performance considerations addressed
- [ ] Security implications reviewed

## Implementation Notes
- Reference context files in .codex-specs/context/ before starting
- Follow the implementation plan in plan.md
- Update relevant documentation after completion
- Consider backwards compatibility for API changes
`;
  }

  buildPlanCreationPrompt(specification, requirements, projectContext = '') {
    return `
Create a comprehensive implementation plan based on this specification and requirements:

${projectContext}

## Feature Specification
${specification}

## Detailed Requirements  
${requirements}

Please provide a detailed implementation plan with the following structure:

## 1. Technical Architecture
- Overall system design approach that aligns with existing project architecture
- Key components and their relationships
- Data flow and architecture patterns
- Technology stack decisions and rationale
- Integration strategy with existing systems

## 2. Implementation Strategy
- Development phases (Foundation, Core Features, Integration, Testing, Polish)
- Risk assessment and mitigation strategies
- Testing approach throughout development
- Deployment and rollback strategy

## 3. Detailed Task Breakdown by Phase

For each phase, provide specific tasks with this format:

### Phase: [Phase Name]
**Goal:** [What this phase accomplishes]
**Dependencies:** [What must be completed before this phase]

#### Task: [task-id] - [Task Title]
- **Description:** Clear, specific description of what needs to be implemented
- **Files to create/modify:** Specific file paths and what changes are needed
- **Dependencies:** Other task IDs that must be completed first
- **Acceptance criteria:** Specific, testable criteria to verify completion
- **Complexity:** Small (30min), Medium (2hrs), or Large (1 day)
- **Technical notes:** Implementation hints, gotchas, constraints, or patterns to follow

## 4. Integration Points
- How new components connect with existing system
- API contracts between modules
- Data persistence and migration strategy
- External service integrations

## 5. Quality Assurance Strategy
- Unit testing approach for each component
- Integration testing strategy
- Performance testing requirements
- Security considerations and testing
- Code review checkpoints

## 6. Deployment Plan
- Build and deployment steps
- Environment configuration changes
- Database migrations if needed
- Monitoring and alerting setup

Format as clean markdown with clear task sections that can be extracted programmatically.
Each task should be atomic and completable independently.
`;
  }

  buildTaskExtractionPrompt(plan) {
    return `
Extract all tasks from this implementation plan and return as a JSON array.

${plan}

Return ONLY valid JSON in this exact format (no markdown, no explanations):

[
  {
    "id": "task-1",
    "title": "Task title exactly as written",
    "description": "What needs to be implemented",
    "files": ["src/file1.js", "src/file2.js"],
    "dependencies": ["task-0"],
    "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
    "phase": "Foundation",
    "complexity": "Medium",
    "technicalNotes": "Optional notes to guide implementation"
  }
]
`;
  }

  buildProductContextPrompt(projectInfo, codebaseAnalysis = '') {
    const { projectName, projectDescription, projectType, targetUsers, keyFeatures, techStack } = projectInfo;
    return `
Create product context documentation for project "${projectName}".

## Project Summary
- Description: ${projectDescription}
- Type: ${projectType}
- Target Users: ${targetUsers}
- Key Features: ${keyFeatures}

## Consider Existing Codebase (if any)
${codebaseAnalysis}

Please produce a markdown document covering:
- Product Vision and Value Proposition
- Primary Personas and Goals
- User Journeys
- High-level Features and Priorities
- Success Metrics / KPIs
`;
  }

  buildTechContextPrompt(projectInfo, codebaseAnalysis = '') {
    const { techStack } = projectInfo;
    return `
Create technical context documentation for the project.

## Existing Tech Stack
${techStack}

## Observed Codebase (if any)
${codebaseAnalysis}

Please produce a markdown document covering:
- System Architecture and key components
- Technology decisions and rationale
- Coding standards and conventions
- Error handling, logging, and observability
- Testing strategy and tooling
- Security and performance considerations
`;
  }

  buildStructureContextPrompt(projectInfo, codebaseAnalysis = '') {
    const { projectName } = projectInfo;
    return `
Document the project structure and workflows for "${projectName}".

## Observed Structure (if any)
${codebaseAnalysis}

Please include:
- Repository layout and directory purpose
- Branching strategy and commit conventions
- Build/test scripts and CI/CD outline
- Development workflows (how to run, test, lint, type-check)
- Contribution guidelines highlights
`;
  }

  buildRequirementsPrompt(specification) {
    return `
Generate a detailed requirements document based on this feature specification:

${specification}

Please produce a markdown document with:
- Functional requirements broken down by capability
- Detailed business rules and edge cases
- Acceptance criteria in EARS (WHEN/IF/THEN) format
- Non-functional requirements (performance, security, accessibility)
- Traceability: map requirements back to user stories
`;
  }
}
```

## 8. Feature Creation Command (src/commands/spec-create.js)

```javascript
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

  // Optional: seed AGENTS.md for this feature scope
  const agents = promptBuilder.buildAgentsFile(featureName, description);
  await fs.writeFile(path.join(baseDir, 'AGENTS.md'), agents);

  console.log(chalk.green('✅ Specification created'));
  console.log(chalk.cyan('📁 Saved to:'), path.join(baseDir, 'specification.md'));
}
```

## 9. Requirements Generation (src/commands/spec-requirements.js)

```javascript
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
```

## 10. Status and Plan Summary (src/commands/spec-status.js)

```javascript
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
```

## 11. Commands Index Aggregator (src/commands/index.js)

```javascript
export { contextSetup } from './spec-context-setup.js';
export { contextUpdate } from './spec-context-update.js';
export { contextRefresh } from './spec-context-refresh.js';
export { createSpec } from './spec-create.js';
export { generateRequirements } from './spec-requirements.js';
export { createPlan } from './spec-plan.js';
export { executeTask, executePhase } from './spec-execute.js';
export { checkStatus, planSummary } from './spec-status.js';
```

## 12. File Manager Utility (src/utils/file-manager.js)

```javascript
import fs from 'fs-extra';
import path from 'path';

export async function ensureDirSafe(dirPath) {
  await fs.ensureDir(dirPath);
}

export async function writeJsonAtomic(filePath, data, spaces = 2) {
  const tmpPath = `${filePath}.tmp`;
  await fs.writeJson(tmpPath, data, { spaces });
  await fs.move(tmpPath, filePath, { overwrite: true });
}

export async function backupFile(filePath) {
  if (!await fs.pathExists(filePath)) return null;
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const backupDir = path.join(dir, 'backups');
  await fs.ensureDir(backupDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${base}.${timestamp}.bak`);
  await fs.copy(filePath, backupPath);
  return backupPath;
}
```

## 13. Context Update and Refresh

### 13.1 Context Update (src/commands/spec-context-update.js)

```javascript
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

  // For simplicity, regenerate only the targeted component or all when none specified
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
```

### 13.2 Context Refresh (src/commands/spec-context-refresh.js)

```javascript
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
```

## 14. Configuration, Logging, and Error Handling

### 14.1 package.json (excerpt)

```json
{
  "name": "codex-spec",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "codex-spec": "src/cli.js"
  },
  "scripts": {
    "start": "node src/cli.js",
    "lint": "eslint .",
    "type-check": "tsc --noEmit",
    "test": "vitest"
  },
  "dependencies": {
    "commander": "^11.1.0",
    "fs-extra": "^11.2.0",
    "openai": "^4.20.1",
    "chalk": "^5.3.0",
    "inquirer": "^9.2.12",
    "ora": "^7.0.1",
    "boxen": "^7.1.1"
  }
}
```

### 14.2 Logging & Error Handling Guidelines

- Use simple console output with `chalk` for user-facing messages.
- Fail fast on unrecoverable errors; print actionable guidance.
- When calling external tools/APIs, wrap with try/catch and include exit codes.
- For write operations, prefer atomic writes (see `writeJsonAtomic`).

## 15. Testing Strategy and Packaging

- Author commands to be pure where possible; move side-effects behind utilities.
- Provide unit tests for prompt builders and task extraction validation.
- Add smoke tests for CLI commands using a temp directory.
- Publish to npm with an executable `bin` and ESM `type: module`.