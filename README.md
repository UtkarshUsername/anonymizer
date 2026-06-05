# anonymizer

Privacy exposure audit tool for Reddit — the ethical mirror of the deanonymizer research (arXiv:2602.16800).
Built with [Lakebed](https://docs.lakebed.dev).

See what your public Reddit history reveals about you and get actionable steps to edit or delete identifying posts.

## How it works

1. Enter your Reddit username
2. Paste your LLM API key (OpenAI, Anthropic, or OpenRouter)
3. Confirm it's your account
4. Click **Scan My History**

Your public Reddit comments/posts are fetched via the [Arctic Shift API](https://arctic-shift.photon-reddit.com), analyzed by an LLM using the same prompt as the original deanonymizer, and you get a report with evidence links and remediation steps.

Nothing is stored server-side. Your API key is sent once to the LLM provider and discarded. The report is returned directly to your browser.

## Run

```sh
npx lakebed dev
```

Open http://localhost:3000

## Providers

| Provider | API key format | Model (default / example) |
|----------|---------------|---------------------------|
| OpenAI | `sk-...` | `gpt-4o-mini` (default) |
| Anthropic | `sk-ant-...` | `claude-haiku-4-5` (default) |
| OpenRouter | `sk-or-...` | Required — e.g. `openai/gpt-4o` |

## Files

```
server/
  index.ts   — Lakebed capsule
  reddit.ts  — Reddit data fetcher
  analyze.ts — LLM analysis orchestrator
  llm.ts     — Fetch-based LLM client
client/
  index.tsx  — Preact UI
shared/
  types.ts   — Types
  extract.ts — Regex identifier extraction
```

## Research basis

The analysis method follows the inference setting discussed in:

- [arXiv:2602.16800](https://arxiv.org/abs/2602.16800)

## Limitations

- Findings are probabilistic, not definitive identity proof
- Only Reddit is supported
- Confidence depends on evidence density
