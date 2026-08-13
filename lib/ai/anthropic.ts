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
  return normalizeStructuredInput(toolUse.input) as T;
}

// Claude occasionally emits a nested array/object field as a JSON-encoded
// string instead of native JSON, even when tool_choice forces the schema.
// Defensively parse any top-level string value that looks like JSON.
function normalizeStructuredInput(input: unknown): unknown {
  if (input === null || typeof input !== "object") return input;
  const out: Record<string, unknown> = { ...(input as Record<string, unknown>) };
  for (const [key, value] of Object.entries(out)) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) continue;
    try {
      out[key] = JSON.parse(trimmed);
    } catch {
      // not actually JSON — leave as-is
    }
  }
  return out;
}
