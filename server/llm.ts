// Fetch-based LLM client — same API format as the deanonymizer's OpenAIClient
// No SDKs needed, just raw HTTP calls

export interface LLMCompleteParams {
  system?: string;
  user: string;
  maxTokens: number;
  json?: boolean;
}

export async function completeWithOpenAI(
  apiKey: string,
  model?: string,
  baseUrl?: string,
  params?: LLMCompleteParams,
): Promise<string> {
  if (!params) throw new Error("Missing completion params");
  const resolvedModel = model || "gpt-4o-mini";
  const resolvedBase = (baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");

  const messages: Array<{ role: string; content: string }> = [];
  if (params.system) {
    messages.push({ role: "system", content: params.system });
  }
  messages.push({ role: "user", content: params.user });

  const body: Record<string, unknown> = {
    model: resolvedModel,
    messages,
    max_tokens: params.maxTokens,
  };
  if (params.json) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${resolvedBase}/chat/completions`, {
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
  apiKey: string,
  model?: string,
  params?: LLMCompleteParams,
): Promise<string> {
  if (!params) throw new Error("Missing completion params");
  const resolvedModel = model || "claude-haiku-4-5";

  const messages: Array<{ role: string; content: string }> = [];
  messages.push({ role: "user", content: params.user });

  const body: Record<string, unknown> = {
    model: resolvedModel,
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
