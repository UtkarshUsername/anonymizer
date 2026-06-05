import { Route, Router, Routes, useMutation } from "lakebed/client";
import { useState } from "preact/hooks";
import type { AuditResult } from "../shared/types";

const RISK_COLORS: Record<string, string> = {
  low: "text-green-400 border-green-700 bg-green-950/30",
  medium: "text-yellow-400 border-yellow-700 bg-yellow-950/30",
  high: "text-red-400 border-red-700 bg-red-950/30",
};

const RISK_BG: Record<string, string> = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
};

const CONF_CLASSES: Record<string, { badge: string; label: string }> = {
  high: { badge: "bg-red-600 text-white", label: "HIGH" },
  medium: { badge: "bg-yellow-600 text-black", label: "MED" },
  low: { badge: "bg-neutral-600 text-white", label: "LOW" },
};

const CATEGORY_LABELS: Record<string, string> = {
  location: "Location",
  employer_or_school: "Employer / School",
  real_name: "Real Name",
  age_or_dob: "Age / DOB",
  gender: "Gender",
  relationships_or_family: "Relationships / Family",
  financial: "Financial",
  health: "Health",
  schedule_or_routine: "Schedule / Routine",
  cross_platform_handle: "Cross-Platform Handle",
  external_link: "External Link",
  writing_fingerprint: "Writing Fingerprint",
  other: "Other",
};

function RiskMeter({ risk }: { risk: string }) {
  const levels = ["low", "medium", "high"];
  const idx = levels.indexOf(risk);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {levels.map((level, i) => (
          <div key={level} className={`h-3 w-8 rounded-sm ${i <= idx ? RISK_BG[risk] : "bg-neutral-700"}`} />
        ))}
      </div>
      <span className={`text-lg font-bold uppercase ${risk === "high" ? "text-red-400" : risk === "medium" ? "text-yellow-400" : "text-green-400"}`}>
        {risk}
      </span>
    </div>
  );
}

function HomePage() {
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<"openai" | "anthropic" | "openrouter">("openai");
  const [model, setModel] = useState("");
  const [consented, setConsented] = useState(false);
  const runAnalysis = useMutation<[username: string, apiKey: string, provider: string, model: string], AuditResult>("runAnalysis");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    if (!username.trim()) { setError("Enter your Reddit username."); return; }
    if (!apiKey.trim()) { setError("Paste your API key."); return; }
    if (!consented) { setError("Confirm this is your account."); return; }
    setRunning(true);
    setError(null);
    try {
      const res = await runAnalysis(username.trim(), apiKey.trim(), provider, model.trim());
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setRunning(false);
    }
  }

  const findings = result?.findings ?? [];
  const sorted = [...findings].sort(
    (a, b) => ({ high: 0, medium: 1, low: 2 })[a.confidence] - ({ high: 0, medium: 1, low: 2 })[b.confidence],
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-5xl font-bold tracking-tight">
          <span className="text-white">anony</span><span className="text-neutral-500">mizer</span>
        </h1>
        <p className="mx-auto max-w-lg text-neutral-400">
          See what your Reddit history reveals and learn how to edit or delete identifying posts.
          You bring your own LLM API key — nothing is stored server-side.
        </p>
      </div>

      {/* Input form */}
      <div className="mb-8 rounded-lg border border-neutral-800 bg-neutral-950 p-6">
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-neutral-400">Reddit username</label>
          <input
            value={username}
            onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
            placeholder="u/your_username"
            className="w-full border border-neutral-700 bg-black px-3 py-2 text-white outline-none focus:border-white"
          />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-neutral-400">API key</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onInput={(e) => setApiKey((e.target as HTMLInputElement).value)}
              placeholder="sk-... or sk-ant-..."
              className="min-w-0 flex-1 border border-neutral-700 bg-black px-3 py-2 text-white outline-none focus:border-white"
            />
            <select
              value={provider}
              onChange={(e) => {
                const p = (e.target as HTMLSelectElement).value as "openai" | "anthropic" | "openrouter";
                setProvider(p);
                if (p === "openai") setModel("gpt-4o-mini");
                else if (p === "anthropic") setModel("claude-haiku-4-5");
                else setModel("");
              }}
              className="border border-neutral-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>
          <div className="mt-2">
            <label className="mb-1 block text-sm font-medium text-neutral-400">Model</label>
            <input
              value={model}
              onInput={(e) => setModel((e.target as HTMLInputElement).value)}
              placeholder={
                provider === "openai" ? "gpt-4o-mini (default), gpt-4o, gpt-4.1, ..."
                : provider === "anthropic" ? "claude-haiku-4-5 (default), claude-sonnet-4, claude-3-opus, ..."
                : "openai/gpt-4o, anthropic/claude-sonnet-4, google/gemini-2.0-flash-001, ..."
              }
              className="w-full border border-neutral-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
            />
          </div>
        </div>
        <label className="mb-4 flex items-start gap-2 text-sm text-neutral-400">
          <input
            type="checkbox"
            checked={consented}
            onChange={() => setConsented(!consented)}
            className="mt-0.5 shrink-0"
          />
          <span>I confirm this is my Reddit account. I am only scanning my own public history.</span>
        </label>
        <button
          onClick={() => void handleScan()}
          disabled={running}
          className="w-full rounded bg-orange-600 py-2.5 font-medium text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? "Scanning..." : "Scan My History"}
        </button>
        {error && (
          <div className="mt-3 text-sm text-red-400">{error}</div>
        )}
      </div>

      {/* Loading */}
      {running && (
        <div className="mb-8 rounded-lg border border-neutral-800 bg-neutral-950 p-8 text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
          <p className="text-neutral-400">
            Scanning your public Reddit history...<br />
            <span className="text-sm text-neutral-600">This may take a minute while the AI analyzes your posts.</span>
          </p>
        </div>
      )}

      {/* Results */}
      {result && !running && (
        <>
          {/* Risk + Summary */}
          <div className={`mb-6 rounded-lg border p-5 ${RISK_COLORS[result.overallRisk] || RISK_COLORS.low}`}>
            <div className="mb-3"><RiskMeter risk={result.overallRisk} /></div>
            <p className="text-sm leading-relaxed opacity-90">{result.summary}</p>
            <div className="mt-3 flex gap-4 text-xs text-neutral-500">
              <span>{result.itemCount} items analyzed</span>
              {result.span && (
                <span>{new Date(result.span.firstUtc * 1000).toLocaleDateString()} – {new Date(result.span.lastUtc * 1000).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          {/* Identity */}
          <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-950 p-5">
            <h2 className="mb-3 text-sm font-semibold tracking-wider text-neutral-500 uppercase">Identified As</h2>
            <p className="text-lg font-bold text-white">{result.identity.exactUser}</p>
            <p className="mt-1 text-sm text-neutral-400">{result.identity.rationale}</p>
            {result.identity.publicProofUrls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {result.identity.publicProofUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 underline hover:text-blue-300">{url}</a>
                ))}
              </div>
            )}
          </div>

          {/* Direct Identifiers */}
          {result.directIdentifiers && (result.directIdentifiers.emails.length > 0 || result.directIdentifiers.socialHandles.length > 0) && (
            <div className="mb-6 rounded-lg border border-red-800 bg-red-950/30 p-5">
              <h2 className="mb-3 text-sm font-semibold tracking-wider text-red-400 uppercase">Direct Identifiers — Scrub These First</h2>
              {result.directIdentifiers.emails.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-xs font-medium text-neutral-400 uppercase">Emails</p>
                  {result.directIdentifiers.emails.map((email) => (
                    <div key={email} className="font-mono text-sm text-red-300">{email}</div>
                  ))}
                </div>
              )}
              {result.directIdentifiers.socialHandles.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-neutral-400 uppercase">Cross-Platform Accounts</p>
                  {result.directIdentifiers.socialHandles.map((h) => (
                    <div key={h.url} className="mb-1 text-sm">
                      <span className="text-neutral-400">{h.platform}:</span>{" "}
                      <span className="font-mono text-red-300">{h.handle}</span>{" "}
                      <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 underline">{h.url}</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Findings */}
          {sorted.length === 0 ? (
            <div className="rounded-lg border border-green-800 bg-green-950/30 p-5 text-center text-green-400">
              No identifying signals found in your analyzed history.
            </div>
          ) : (
            <div>
              <h2 className="mb-4 text-sm font-semibold tracking-wider text-neutral-500 uppercase">Findings ({sorted.length})</h2>
              {["high", "medium", "low"].map((confidence) => {
                const group = sorted.filter((f) => f.confidence === confidence);
                if (group.length === 0) return null;
                return (
                  <div key={confidence} className="mb-6">
                    <h3 className="mb-3 text-xs font-semibold tracking-wider text-neutral-600 uppercase">
                      {confidence === "high" ? "High Confidence" : confidence === "medium" ? "Medium Confidence" : "Low Confidence"}
                    </h3>
                    <div className="space-y-4">
                      {group.map((f, i) => <FindingCard key={i} finding={f} index={i} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 rounded-lg border border-neutral-800 bg-neutral-950/50 p-4 text-sm text-neutral-500">
            Prioritize <span className="font-semibold text-red-400">HIGH</span> confidence findings.
            Edit or delete the cited comments, remove leaked emails, and avoid reusing flagged handles
            or external links across platforms.
          </div>
        </>
      )}
    </div>
  );
}

function FindingCard({ finding, index }: { finding: AuditResult["findings"][0]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const conf = CONF_CLASSES[finding.confidence];

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-start gap-3 p-4 text-left hover:bg-neutral-900/50">
        <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${conf.badge}`}>{conf.label}</span>
        <div className="min-w-0 flex-1">
          <span className="mr-2 text-xs text-neutral-600">#{index + 1}</span>
          <span className="text-xs font-medium text-neutral-400">{CATEGORY_LABELS[finding.category] || finding.category}</span>
          <p className="mt-1 text-sm font-medium text-white">{finding.claim}</p>
        </div>
        <span className="mt-1 shrink-0 text-neutral-600">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t border-neutral-800 px-4 pb-4 pt-3">
          <div className="mb-3">
            <span className="text-xs font-medium text-neutral-500 uppercase">Why</span>
            <p className="mt-0.5 text-sm text-neutral-300">{finding.rationale}</p>
          </div>
          {finding.evidence.length > 0 && (
            <div className="mb-3">
              <span className="text-xs font-medium text-neutral-500 uppercase">Evidence</span>
              {finding.evidence.map((e, i) => (
                <div key={i} className="mt-1.5 rounded border border-neutral-800 bg-neutral-900/50 p-2.5">
                  <p className="mb-1 text-sm italic text-neutral-300">"{e.quote}"</p>
                  <a href={e.permalink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 underline hover:text-blue-300">{e.permalink}</a>
                </div>
              ))}
            </div>
          )}
          <div>
            <span className="text-xs font-medium text-green-500 uppercase">Remediation</span>
            <p className="mt-0.5 text-sm text-neutral-300">{finding.remediation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-5xl">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="*" element={
              <div className="px-6 py-16 text-center">
                <h1 className="mb-4 text-4xl font-bold">Not Found</h1>
                <a href="/" className="text-blue-400 underline hover:text-blue-300">Go home</a>
              </div>
            } />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
