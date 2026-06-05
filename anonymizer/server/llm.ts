// Fetch-based LLM client — same API format as the deanonymizer's OpenAIClient
// No SDKs needed, just raw HTTP calls

export interface LLMCompleteParams {
  system?: string;
  user: string;
  maxTokens: number;
  json?: boolean;
}

export async function completeWithOpenAI(
  params: LLMCompleteParams,
  env: Record<string, string | undefined>,
): Promise<string> {
  const apiKey = env.OPENAI_API_KEY;
  const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  const messages: Array<{ role: string; content: string }> = [];
  if (params.system) {
    messages.push({ role: "system", content: params.system });
  }
  messages.push({ role: "user", content: params.user });

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: params.maxTokens,
  };
  if (params.json) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

export async function completeWithAnthropic(
  params: LLMCompleteParams,
  env: Record<string, string | undefined>,
): Promise<string> {
  const apiKey = env.ANTHROPIC_API_KEY;
  const model = env.ANTHROPIC_MODEL || "claude-haiku-4-5";

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
  }

  const messages: Array<{ role: string; content: string }> = [];
  messages.push({ role: "user", content: params.user });

  const body: Record<string, unknown> = {
    model,
    max_tokens: params.maxTokens,
    messages,
  };
  if (params.system) {
    body.system = params.system;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    content: Array<{ text: string }>;
  };
  return data.content[0]?.text ?? "";
}
