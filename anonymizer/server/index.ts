import { capsule, endpoint, json, mutation, query, string, table, text } from "lakebed/server";
import { fetchRedditProfile, getRedditAuthUrl, exchangeRedditCode, verifyRedditIdentity } from "./reddit";
import { analyzeProfile } from "./analyze";
import type { AuditResult } from "../shared/types";

export default capsule({
  name: "anonymizer",

  schema: {
    analyses: table({
      redditUsername: string(),
      resultJson: text(),
      itemCount: string(),
      overallRisk: string(),
    }),
  },

  queries: {
    myAnalyses: query((ctx) => {
      return ctx.db.analyses.orderBy("createdAt", "desc").all();
    }),
  },

  mutations: {
    runAnalysis: mutation(async (ctx, username: string, apiKey: string, provider: string) => {
      if (!username?.trim()) throw new Error("Enter your Reddit username.");
      if (!apiKey?.trim()) throw new Error("Paste your OpenAI or Anthropic API key.");

      const profile = await fetchRedditProfile(username.trim(), 300);

      const result: AuditResult = await analyzeProfile(
        profile.username,
        profile.items,
        profile.profileUrl,
        {
          provider: provider === "anthropic" ? "anthropic" : "openai",
          apiKey: apiKey.trim(),
        },
      );

      ctx.db.analyses.insert({
        redditUsername: profile.username,
        resultJson: JSON.stringify(result),
        itemCount: String(result.itemCount),
        overallRisk: result.overallRisk,
      });

      return result;
    }),
  },

  endpoints: {
    redditOAuthUrl: endpoint(
      { method: "GET", path: "/api/reddit/oauth-url" },
      (ctx, req) => {
        const clientId = ctx.env.REDDIT_CLIENT_ID;
        if (!clientId) {
          return json({ error: "Reddit OAuth not configured" }, { status: 500 });
        }

        const parsedUrl = new URL(req.url);
        const redirectUri = `${parsedUrl.origin}/api/reddit/callback`;
        const state = Math.random().toString(36).slice(2);
        const authUrl = getRedditAuthUrl(state, redirectUri, clientId);

        return json({ url: authUrl });
      },
    ),

    redditCallback: endpoint(
      { method: "GET", path: "/api/reddit/callback" },
      async (ctx, req) => {
        const parsedUrl = new URL(req.url);
        const code = parsedUrl.searchParams.get("code");
        const state = parsedUrl.searchParams.get("state");

        if (!code || !state) {
          return json({ error: "Missing code or state" }, { status: 400 });
        }

        const clientId = ctx.env.REDDIT_CLIENT_ID;
        const clientSecret = ctx.env.REDDIT_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          return json({ error: "Reddit OAuth not configured" }, { status: 500 });
        }

        try {
          const tokenData = await exchangeRedditCode(
            code, `${parsedUrl.origin}/api/reddit/callback`, clientId, clientSecret,
          );
          const identity = await verifyRedditIdentity(tokenData.accessToken);

          return Response.redirect(
            `${parsedUrl.origin}/dashboard?user=${encodeURIComponent(identity.name)}`,
            302,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "OAuth failed";
          return json({ error: msg }, { status: 500 });
        }
      },
    ),
  },
});
