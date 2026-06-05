# anonymizer

Privacy exposure audit tool for Reddit — the ethical mirror of the deanonymizer research.
Built with Lakebed.

See what your public Reddit history reveals about you and get actionable steps to edit or delete identifying posts.

## How it works

1. Enter your Reddit username
2. Paste your LLM API key (OpenAI, Anthropic, or OpenRouter)
3. Confirm it's your account
4. Click **Scan My History**

The server fetches your public Reddit comments/posts via the Arctic Shift API (same as the original deanonymizer), runs the same LLM-based analysis prompt to identify personal details, and returns a report with evidence links and remediation steps.

No accounts, no OAuth, no data stored server-side beyond your session. You bring your own API key.

## Run

```sh
cd anonymizer
npx lakebed dev
```

Open http://localhost:3000

## Providers

| Provider | API key format | Model (default / example) |
|----------|---------------|---------------------------|
| OpenAI | `sk-...` | `gpt-4o-mini` (default) |
| Anthropic | `sk-ant-...` | `claude-haiku-4-5` (default) |
| OpenRouter | `sk-or-...` | Required — e.g. `openai/gpt-4o`, `anthropic/claude-sonnet-4` |

## Architecture

Reuses the same methods from the parent `deanonymizer` project:

- **Data fetching**: Arctic Shift API (`src/sources/reddit.ts`)
- **Analysis prompt**: Same system prompt as `src/analyze.ts`
- **Regex extraction**: Same email/handle detection as `src/extract.ts`
- **LLM client**: Fetch-based (no SDKs), supports OpenAI / Anthropic / OpenRouter

## Files

```
server/
  index.ts    — capsule: schema, mutation (runAnalysis)
  reddit.ts   — Reddit data fetcher via Arctic Shift API
  analyze.ts  — LLM analysis orchestrator (same prompt as deanonymizer)
  llm.ts      — Fetch-based LLM client
client/
  index.tsx   — Preact UI: input form + results dashboard
shared/
  types.ts    — Types from deanonymizer
  extract.ts  — Regex identifier extraction
```

## Deploy

```sh
npx lakebed deploy
```
