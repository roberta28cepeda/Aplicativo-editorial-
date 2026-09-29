import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY não configurada. Adicione a chave nas variáveis de ambiente do projeto.",
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const IDEAS_MODEL = "claude-sonnet-5-5";
