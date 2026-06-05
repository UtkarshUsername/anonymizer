# anonymizer

Privacy exposure audit tool for Reddit — the ethical mirror of the deanonymizer research (arXiv:2602.16800).
Built with [Lakebed](https://docs.lakebed.dev).

See what your public Reddit history reveals about you and get actionable steps to edit or delete identifying posts.

## How it works

1. Enter your Reddit username
2. Paste your LLM API key (OpenAI, Anthropic, or OpenRouter)
3. Confirm it's your account
4. Click **Scan My History**

The server fetches your public Reddit comments/posts via the [Arctic Shift API](https://arctic-shift.photon-reddit.com), runs an LLM analysis to identify personal details, and returns a report with evidence links and remediation steps.

No accounts, no OAuth, no data stored server-side beyond your session. You bring your own API key.

## Run

```sh
npx lakebed dev
```

Open http://localhost:3000

## Providers

| Provider | API key format | Model |
|----------|---------------|-------|
| OpenAI | `sk-...` | `gpt-4o-mini` (default) |
| Anthropic | `sk-ant-...` | `claude-haiku-4-5` (default) |
| OpenRouter | `sk-or-...` | Required — e.g. `openai/gpt-4o`, `anthropic/claude-sonnet-4` |

## Architecture

The analysis engine is ported from the original deanonymizer CLI:

- **Data fetching**: Arctic Shift API — same as the original `src/sources/reddit.ts`
- **Analysis prompt**: Same system prompt as the original `src/analyze.ts`
- **Regex extraction**: Same email/handle detection as the original `src/extract.ts`
- **LLM client**: Fetch-based (no SDKs), supports OpenAI / Anthropic / OpenRouter

## Files

```
server/
  index.ts    — Lakebed capsule: schema, mutation (runAnalysis), query (myAnalyses)
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

## Research basis

The analysis method follows the inference setting discussed in:

- [arXiv:2602.16800](https://arxiv.org/abs/2602.16800) — Deanonymization attack paper

Operational premise: low-entropy disclosures that appear non-identifying in isolation may become identifying under cross-post aggregation.

## Limitations

- Findings are probabilistic and should not be interpreted as definitive identity proof
- Recall is upper-bounded by source completeness (Arctic Shift archive coverage)
- Confidence calibration depends on evidence density and artifact quality
- Only Reddit is supported (the original CLI also supports HN, GitHub, Stack Overflow)
