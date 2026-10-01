import {
  CreateWebWorkerMLCEngine,
  type MLCEngineInterface,
  type ChatCompletionMessageParam,
  type CompletionUsage,
} from "@mlc-ai/web-llm";

const MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

export const CONTEXT_LIMIT = 4096;

export const SYSTEM_PROMPT = `
You are an English-only assistant.

IMPORTANT RULES:
1. Always answer in English.
2. Never answer in Russian or any other language.
3. Keep your answer under 100 words.
`;

let engine: MLCEngineInterface | null = null;
let worker: Worker | null = null;

export type LLMUsage = {
  usage: CompletionUsage | undefined;
};

export async function initLLM(
  onProgress?: (progress: number) => void
) {
  worker = new Worker(
    new URL("./worker.ts", import.meta.url),
    { type: "module" }
  );

  engine = await CreateWebWorkerMLCEngine(
    worker,
    MODEL,
    {
      initProgressCallback: (progress) => {
        onProgress?.(progress.progress);
      },
    }
  );

  return engine;
}

export async function askLLM(
  messages: ChatCompletionMessageParam[],
  onToken: (token: string) => void
): Promise<LLMUsage> {
  if (!engine) {
    throw new Error("LLM is not initialized");
  }

  const chunks = await engine.chat.completions.create({
    messages,
    stream: true,
    stream_options: {
      include_usage: true,
    },
  });

  let usage: CompletionUsage | undefined;

  for await (const chunk of chunks) {
    const token =
      chunk.choices[0]?.delta?.content ?? "";

    if (token) {
      onToken(token);
    }

    if (chunk.usage) {
      usage = chunk.usage;
    }
  }

  return {
    usage,
  };
}

export function disposeLLM() {
  worker?.terminate();
  worker = null;
  engine = null;
}