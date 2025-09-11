import { spawn } from 'child_process';
import OpenAI from 'openai';

export class CodexClient {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async executeCodexCLI(prompt, options = {}) {
    return new Promise((resolve, reject) => {
      const args = ['--mode', options.mode || 'suggest'];
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
        if (options.onProgress) options.onProgress(data.toString());
      });

      codex.stderr.on('data', (data) => {
        error += data.toString();
      });

      codex.on('close', (code) => {
        if (code === 0) resolve(output);
        else reject(new Error(`Codex CLI failed (exit code ${code}): ${error}`));
      });

      codex.stdin.write(prompt);
      codex.stdin.end();
    });
  }

  async generateWithAPI(prompt, systemMessage, options = {}) {
    const model = options.model || 'gpt-4';
    const temperature = options.temperature || 0.3;
    const maxTokens = options.maxTokens || 4000;
    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: maxTokens
    });
    return response.choices[0].message.content;
  }
}


