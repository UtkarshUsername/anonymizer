import { capsule, mutation, query, string, table, text } from "lakebed/server";
import { fetchRedditProfile } from "./reddit";
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
    runAnalysis: mutation(async (ctx, username: string, apiKey: string, provider: string, model: string) => {
      if (!username?.trim()) throw new Error("Enter your Reddit username.");
      if (!apiKey?.trim()) throw new Error("Paste an API key.");

      const profile = await fetchRedditProfile(username.trim(), 300);

      const isAnthropic = provider === "anthropic";
      const isOpenRouter = provider === "openrouter";

      const result: AuditResult = await analyzeProfile(
        profile.username,
        profile.items,
        profile.profileUrl,
        {
          provider: isAnthropic ? "anthropic" : "openai",
          apiKey: apiKey.trim(),
          model: model?.trim() || undefined,
          baseUrl: isOpenRouter ? "https://openrouter.ai/api/v1" : undefined,
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
});
