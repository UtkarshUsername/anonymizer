// Analysis orchestrator — same prompt/method as the deanonymizer's analyze.ts

import { extractEmails, extractSocialHandles } from "../shared/extract";
import type { AuditResult, Finding, Item } from "../shared/types";
import { completeWithAnthropic, completeWithOpenAI } from "./llm";

const SYSTEM = `You are a privacy auditor performing a CONSENT-BASED self-doxx assessment.
The user is auditing their own (or an explicitly authorized) account. Your job is
to show them how exposed their pseudonymous footprint is, so they can scrub it.

Analyze the supplied PUBLIC posts/comments and identify every piece of personal,
identifying, or linkable information that an attacker could infer. Think like the
deanonymization agent in the literature: aggregate weak signals (a timezone here,
a sports team there, a "my company" aside) into stronger conclusions.

Cover at minimum: real name, location (down to city/neighborhood), employer or
school, age/DOB, gender, family/relationships, financial details, health, daily
routine/timezone, reused usernames or handles on other platforms, external links
(personal sites, GitHub, LinkedIn), and distinctive writing-style fingerprints.

You must point to the exact user identity represented by the provided footprint.
Include public-facing proof URLs when present in the text or directly inferable
from the supplied account profiles (for example LinkedIn, GitHub, personal site,
portfolio, or the platform profile pages themselves).

For each finding give: the inferred claim, a calibrated confidence, the reasoning
chain, the specific quotes + permalinks that leak it, and concrete remediation.

Be rigorous and honest about confidence. Do NOT fabricate a real-world identity,
do NOT guess a specific named person, and do NOT perform outward lookups — only
report what the TEXT ITSELF reveals or makes linkable. Output ONLY the requested
JSON.`;

const SCHEMA_HINT = `Return a JSON object of exactly this shape:
{
  "overallRisk": "low" | "medium" | "high",
  "summary": "2-4 sentence plain-language exposure summary",
  "identity": {
    "exactUser": "single string naming the exact audited user or linked real identity",
    "rationale": "short explanation of why this is the same user",
    "publicProofUrls": ["https://..."]
  },
  "findings": [
    {
      "category": "location" | "employer_or_school" | "real_name" | "age_or_dob" | "gender" | "relationships_or_family" | "financial" | "health" | "schedule_or_routine" | "cross_platform_handle" | "external_link" | "writing_fingerprint" | "other",
      "claim": "what an attacker concludes",
      "confidence": "low" | "medium" | "high",
      "rationale": "the reasoning chain over the evidence",
      "evidence": [ { "quote": "verbatim snippet", "permalink": "https://..." } ],
      "remediation": "concrete action to reduce this exposure"
    }
  ]
}`;

function renderItems(items: Item[], maxChars: number): string {
  const lines: string[] = [];
  let used = 0;
  for (const it of items) {
    const when = new Date(it.createdUtc * 1000).toISOString().slice(0, 10);
    const body = it.body.replace(/\s+/g, " ").slice(0, 420);
    const line = `[${it.platform} ${it.kind} | ${it.context} | ${when}] ${body}\n(${it.permalink})`;
    if (used + line.length > maxChars) break;
    lines.push(line);
    used += line.length;
  }
  return lines.join("\n\n");
}

function safeJsonSlice(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return raw;
  }
  return raw.slice(start, end + 1);
}

interface ParsedResult {
  overallRisk: "low" | "medium" | "high";
  summary: string;
  identity?: {
    exactUser?: string;
    rationale?: string;
    publicProofUrls?: string[];
  };
  findings: Finding[];
}

export async function analyzeProfile(
  profileUsername: string,
  items: Item[],
  profileUrl: string,
  opts: {
    provider: "openai" | "anthropic";
    apiKey: string;
    model?: string;
    baseUrl?: string;
  },
): Promise<AuditResult> {
  const maxChars = 120000;

  const transcript = renderItems(items, maxChars);

  const userMsg = `Subject handle(s): ${profileUsername} on reddit
Items analyzed: ${items.length}

Subject profile URLs:
- reddit: ${profileUrl}

=== PUBLIC FOOTPRINT ===
${transcript}

=== END FOOTPRINT ===

${SCHEMA_HINT}`;

  let rawText: string;
  if (opts.provider === "anthropic") {
    rawText = await completeWithAnthropic(
      opts.apiKey,
      opts.model,
      { system: SYSTEM, user: userMsg, maxTokens: 4000, json: true },
    );
  } else {
    rawText = await completeWithOpenAI(
      opts.apiKey,
      opts.model,
      opts.baseUrl,
      { system: SYSTEM, user: userMsg, maxTokens: 4000, json: true },
    );
  }

  const sliced = safeJsonSlice(rawText);
  let parsed: ParsedResult;
  try {
    parsed = JSON.parse(sliced) as ParsedResult;
  } catch {
    throw new Error("Failed to parse LLM response as JSON. Raw response: " + rawText.slice(0, 500));
  }

  const findings = parsed.findings ?? [];
  const overallRisk = parsed.overallRisk ?? "low";
  const summary = parsed.summary ?? `Analyzed ${items.length} items.`;

  // Deterministic identifier extraction
  const corpusParts: string[] = [];
  for (const it of items) if (it.body) corpusParts.push(it.body);
  for (const f of findings) {
    for (const e of f.evidence ?? []) if (e?.quote) corpusParts.push(e.quote);
  }
  const corpus = corpusParts.join("\n\n");
  const emailList = extractEmails(corpus);
  const handleList = extractSocialHandles(corpus);

  const directIdentifiers =
    emailList.length > 0 || handleList.length > 0
      ? { emails: emailList, socialHandles: handleList }
      : undefined;

  const span =
    items.length > 0
      ? {
          firstUtc: Math.min(...items.map((i) => i.createdUtc)),
          lastUtc: Math.max(...items.map((i) => i.createdUtc)),
        }
      : undefined;

  const knownProofUrls = new Set([profileUrl]);
  if (parsed.identity?.publicProofUrls) {
    for (const url of parsed.identity.publicProofUrls) {
      if (typeof url === "string" && /^https?:\/\//i.test(url)) {
        knownProofUrls.add(url.trim());
      }
    }
  }

  return {
    username: profileUsername,
    platform: "reddit",
    itemCount: items.length,
    span,
    overallRisk,
    summary,
    identity: {
      exactUser: parsed.identity?.exactUser?.trim() || profileUsername,
      rationale:
        parsed.identity?.rationale?.trim() ||
        "Matched from the provided Reddit account and posting footprint.",
      publicProofUrls: [...knownProofUrls],
    },
    findings,
    directIdentifiers,
  };
}
