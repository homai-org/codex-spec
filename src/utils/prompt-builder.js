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


