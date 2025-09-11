import { spawn } from 'child_process';
import OpenAI from 'openai';

export class CodexClient {
  constructor() {
    // Lazy-init OpenAI client only when API generation is requested
    this.openai = null;
  }

  async executeCodexCLI(prompt, options = {}) {
    return new Promise((resolve, reject) => {
      // Use non-interactive exec mode by default: `codex exec "<prompt>"`
      const args = [];
      if (options.model) {
        args.push('--model', options.model);
      }
      if (options.image) {
        args.push('-i', options.image);
      }
      if (options.exec === false) {
        // Direct prompt form: `codex "<prompt>"`
        args.push(String(prompt));
      } else {
        // Exec form
        args.push('exec', String(prompt));
      }

      // Sandbox permissions
      if (options.sandbox) {
        args.push('-s', options.sandbox);
      }

      const codex = spawn('codex', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
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
    });
  }

  async generateWithAPI(prompt, systemMessage, options = {}) {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: options.apiKey || process.env.OPENAI_API_KEY
      });
    }
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


