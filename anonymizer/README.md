# anonymizer

Privacy exposure audit tool — ethical mirror of the deanonymizer research.
A web app built with Lakebed.

## Setup

Copy `.env.lakebed.server` and fill in your credentials:

```
# Required: LLM API key (OpenAI or Anthropic)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Required: Reddit OAuth app
# Create at https://www.reddit.com/prefs/apps (script type)
# Redirect URI: http://localhost:3000/api/reddit/callback
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
```

## Run

```sh
npx lakebed dev
```

Open http://localhost:3000

## Flow

1. Sign in with Google (app identity)
2. Connect your Reddit account (Reddit OAuth)
3. Click "Scan My History" to analyze your public Reddit footprint
4. Review findings with remediation steps

## Architecture

Reuses the same analysis methods as the parent `deanonymizer` project:
- Arctic Shift API for Reddit data (same as `src/sources/reddit.ts`)
- Same LLM analysis prompts (same as `src/analyze.ts`)
- Same regex extraction logic (same as `src/extract.ts`)
