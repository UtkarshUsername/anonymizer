import { capsule, mutation } from "lakebed/server";
import { fetchRedditProfile } from "./reddit";
import { analyzeProfile } from "./analyze";
import type { AuditResult } from "../shared/types";

export default capsule({
  name: "anonymizer",

  schema: {},

  mutations: {
    runAnalysis: mutation(async (ctx, username: string, apiKey: string, provider: string, model: string) => {
      if (!username?.trim()) throw new Error("Enter your Reddit username.");
      if (!apiKey?.trim()) throw new Error("Paste an API key.");

      const profile = await fetchRedditProfile(username.trim(), 300);

      const isAnthropic = provider === "anthropic";
      const isOpenRouter = provider === "openrouter";

      return await analyzeProfile(
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
    }),
  },
});
