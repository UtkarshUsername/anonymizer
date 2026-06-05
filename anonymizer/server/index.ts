import { capsule, endpoint, json, mutation, query, string, table, text } from "lakebed/server";
import { fetchRedditProfile, getRedditAuthUrl, exchangeRedditCode, verifyRedditIdentity } from "./reddit";
import { analyzeProfile } from "./analyze";
import type { AuditResult } from "../shared/types";

export default capsule({
  name: "anonymizer",

  schema: {
    connections: table({
      redditUsername: string(),
      accessToken: text(),
      refreshToken: text(),
      tokenExpiresAt: string(),
    }),
    analyses: table({
      redditUsername: string(),
      resultJson: text(),
      itemCount: string(),
      overallRisk: string(),
    }),
  },

  queries: {
    myConnection: query((ctx) => {
      return ctx.db.connections
        .where("ownerId", ctx.auth.userId)
        .orderBy("createdAt", "desc")
        .first();
    }),

    myLatestAnalysis: query((ctx) => {
      return ctx.db.analyses
        .where("ownerId", ctx.auth.userId)
        .orderBy("createdAt", "desc")
        .first();
    }),
  },

  mutations: {
    connectReddit: mutation((ctx, dataJson: string) => {
      const data = JSON.parse(dataJson) as {
        redditUsername: string;
        accessToken: string;
        refreshToken: string;
        tokenExpiresAt: number;
      };

      ctx.db.connections.insert({
        redditUsername: data.redditUsername,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: String(data.tokenExpiresAt),
        ownerId: ctx.auth.userId,
      });
    }),

    runAnalysis: mutation(async (ctx, apiKey: string, provider: string) => {
      const connection = ctx.db.connections
        .where("ownerId", ctx.auth.userId)
        .orderBy("createdAt", "desc")
        .first();

      if (!connection) {
        throw new Error("No Reddit account connected. Connect your Reddit account first.");
      }
      if (!apiKey) {
        throw new Error("API key is required. Paste your OpenAI or Anthropic key.");
      }

      const profile = await fetchRedditProfile(connection.redditUsername, 300);

      const result: AuditResult = await analyzeProfile(
        profile.username,
        profile.items,
        profile.profileUrl,
        {
          provider: provider === "anthropic" ? "anthropic" : "openai",
          apiKey,
        },
      );

      ctx.db.analyses.insert({
        redditUsername: connection.redditUsername,
        resultJson: JSON.stringify(result),
        itemCount: String(result.itemCount),
        overallRisk: result.overallRisk,
        ownerId: ctx.auth.userId,
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
          return json({ error: "Reddit OAuth is not configured. Set REDDIT_CLIENT_ID in .env.lakebed.server" }, { status: 500 });
        }

        const parsedUrl = new URL(req.url);
        const redirectUri = `${parsedUrl.origin}/api/reddit/callback`;
        const state = `${Math.random().toString(36).slice(2)}:${Date.now()}`;
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
          return json({ error: "Missing code or state parameter" }, { status: 400 });
        }

        const clientId = ctx.env.REDDIT_CLIENT_ID;
        const clientSecret = ctx.env.REDDIT_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          return json({ error: "Reddit OAuth not configured" }, { status: 500 });
        }

        const redirectUri = `${parsedUrl.origin}/api/reddit/callback`;

        try {
          const tokenData = await exchangeRedditCode(code, redirectUri, clientId, clientSecret);
          const identity = await verifyRedditIdentity(tokenData.accessToken);

          const now = Math.floor(Date.now() / 1000);
          const expiresAt = now + tokenData.expiresIn;

          const resultData = JSON.stringify({
            redditUsername: identity.name,
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            tokenExpiresAt: expiresAt,
          });

          const encoded = encodeURIComponent(resultData);
          return new Response(null, {
            status: 302,
            headers: { Location: `${parsedUrl.origin}/connect?data=${encoded}` },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "OAuth failed";
          return json({ error: msg }, { status: 500 });
        }
      },
    ),

    redditProfile: endpoint(
      { method: "GET", path: "/api/reddit/profile" },
      async (ctx, req) => {
        const url = new URL(req.url);
        const username = url.searchParams.get("username");
        if (!username) {
          return json({ error: "Missing username parameter" }, { status: 400 });
        }

        try {
          const profile = await fetchRedditProfile(username, 300);
          return json(profile);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Fetch failed";
          return json({ error: msg }, { status: 500 });
        }
      },
    ),
  },
});
