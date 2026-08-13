import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function chatCompletion(params: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
}): Promise<string> {
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: params.maxTokens ?? 1024,
    system: params.system,
    messages: params.messages,
  });
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}

// Forces a single tool call so we get back validated JSON matching `schema`,
// used for generating seed-time recommendations/alerts as structured data.
export async function generateStructured<T>(params: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  toolName?: string;
  maxTokens?: number;
}): Promise<T> {
  const anthropic = getAnthropicClient();
  const toolName = params.toolName ?? "emit_result";

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: params.maxTokens ?? 4096,
    system: params.system,
    messages: [{ role: "user", content: params.prompt }],
    tools: [
      {
        name: toolName,
        description: "Emit the structured result for this task.",
        input_schema: params.schema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: toolName },
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a tool_use block");
  }
  return toolUse.input as T;
}
