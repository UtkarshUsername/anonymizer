import { Link, Route, Router, Routes, SignInWithGoogle, signOut, useAuth, useMutation, useQuery } from "lakebed/client";
import { useState, useEffect } from "preact/hooks";
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
          <div
            key={level}
            className={`h-3 w-8 rounded-sm ${i <= idx ? RISK_BG[risk] : "bg-neutral-700"}`}
          />
        ))}
      </div>
      <span className={`text-lg font-bold uppercase ${risk === "high" ? "text-red-400" : risk === "medium" ? "text-yellow-400" : "text-green-400"}`}>
        {risk}
      </span>
    </div>
  );
}

function AuthSection() {
  const auth = useAuth();
  const label = auth.displayName || "Guest";
  const status = auth.isLoading
    ? "Checking session..."
    : auth.isGuest
      ? "Not signed in"
      : `Signed in as ${label}`;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-800 px-6 py-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          {!auth.isLoading && !auth.isGuest && auth.picture ? (
            <img src={auth.picture} alt="" className="h-7 w-7 rounded-full border border-neutral-700 object-cover" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-xs font-medium text-neutral-400">
              {auth.isGuest ? "?" : label.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="text-sm text-neutral-500">{status}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {!auth.isLoading && auth.isGuest ? (
          <SignInWithGoogle className="rounded border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:border-white hover:text-white" />
        ) : !auth.isLoading ? (
          <button onClick={() => signOut()} className="text-sm text-neutral-500 hover:text-white">
            Sign out
          </button>
        ) : null}
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 inline-block rounded-full border border-neutral-700 px-4 py-1.5 text-xs font-medium tracking-wider text-neutral-400 uppercase">
        Ethical Privacy Tool
      </div>
      <h1 className="mb-4 text-5xl font-bold tracking-tight">
        <span className="text-white">anony</span><span className="text-neutral-500">mizer</span>
      </h1>
      <p className="mb-8 max-w-lg text-lg leading-relaxed text-neutral-400">
        See what your Reddit history reveals about you — and learn exactly what to edit or delete to protect your privacy.
        Built for journalists, activists, and anyone who values their anonymity.
      </p>
      <ConnectSection />
      <div className="mt-16 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-5">
          <div className="mb-2 text-2xl">🔍</div>
          <h3 className="mb-1 font-semibold text-white">Scan</h3>
          <p className="text-sm text-neutral-400">Analyzes your public Reddit history using the same methods as the deanonymizer research.</p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-5">
          <div className="mb-2 text-2xl">⚠️</div>
          <h3 className="mb-1 font-semibold text-white">Identify</h3>
          <p className="text-sm text-neutral-400">Flags personal details, location, employer, and other revealing signals in your posts.</p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-5">
          <div className="mb-2 text-2xl">🛡️</div>
          <h3 className="mb-1 font-semibold text-white">Remediate</h3>
          <p className="text-sm text-neutral-400">Get concrete, actionable steps to scrub your identifying footprint.</p>
        </div>
      </div>
      <div className="mt-12 rounded-lg border border-neutral-800 bg-neutral-950/50 p-6 text-left">
        <p className="text-sm leading-relaxed text-neutral-500">
          <span className="font-semibold text-neutral-300">How it works:</span> This tool is the ethical mirror of the
          deanonymization research in{" "}
          <a href="https://arxiv.org/abs/2602.16800" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
            arXiv:2602.16800
          </a>.
          It only ever analyzes accounts you authorize via Reddit login. No data is stored server-side beyond your
          analysis report. You are in control.
        </p>
      </div>
    </div>
  );
}

function ConnectSection() {
  const auth = useAuth();

  async function handleConnect() {
    const res = await fetch("/api/reddit/oauth-url");
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      alert("Failed to start Reddit connection: " + (err.error || res.statusText));
      return;
    }
    const data = (await res.json()) as { url: string };
    window.location.href = data.url;
  }

  if (auth.isLoading) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-center">
        <p className="text-neutral-400">Loading...</p>
      </div>
    );
  }

  if (auth.isGuest) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
        <p className="mb-4 text-center text-neutral-400">
          Sign in with Google to get started.
        </p>
        <div className="flex justify-center">
          <SignInWithGoogle className="rounded border border-white px-6 py-2.5 font-medium text-white hover:bg-neutral-900" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
      <p className="mb-4 text-center text-sm text-neutral-400">
        Signed in. Connect your Reddit account to scan your public history.
      </p>
      <div className="flex justify-center">
        <button
          onClick={() => void handleConnect()}
          className="rounded bg-orange-600 px-6 py-2.5 font-medium text-white hover:bg-orange-500"
        >
          Connect with Reddit
        </button>
      </div>
    </div>
  );
}

function ConnectCallbackPage() {
  const connectReddit = useMutation<[dataJson: string], void>("connectReddit");
  const [status, setStatus] = useState("Connecting...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dataEncoded = params.get("data");
    if (!dataEncoded) {
      setError("No connection data received from Reddit.");
      return;
    }

    try {
      const dataRaw = decodeURIComponent(dataEncoded);
      connectReddit(dataRaw);
      setStatus("Connected! Redirecting to dashboard...");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (e) {
      setError("Failed to store Reddit connection. Please try again.");
    }
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h2 className="mb-4 text-2xl font-bold text-red-400">Connection Failed</h2>
        <p className="mb-6 text-neutral-400">{error}</p>
        <Link to="/" className="text-blue-400 underline hover:text-blue-300">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16 text-center">
      <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
      <p className="text-neutral-400">{status}</p>
    </div>
  );
}

function DashboardPage() {
  const connection = useQuery<{
    redditUsername: string;
  } | null>("myConnection");
  const analysisQuery = useQuery<{
    resultJson: string;
    itemCount: string;
    overallRisk: string;
    createdAt: string;
  } | null>("myLatestAnalysis");
  const runAnalysis = useMutation<[], AuditResult>("runAnalysis");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (analysisQuery && analysisQuery.resultJson) {
      try {
        setResult(JSON.parse(analysisQuery.resultJson));
      } catch { /* ignore parse errors */ }
    }
  }, [analysisQuery]);

  async function handleRunAnalysis() {
    setRunning(true);
    setError(null);
    try {
      const res = await runAnalysis();
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setError(msg);
    } finally {
      setRunning(false);
    }
  }

  if (!connection) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h2 className="mb-4 text-2xl font-bold text-white">No Reddit Account Connected</h2>
        <p className="mb-6 text-neutral-400">Connect your Reddit account first to run a privacy scan.</p>
        <ConnectSection />
      </div>
    );
  }

  const findings = result?.findings ?? [];
  const sorted = [...findings].sort(
    (a, b) => ({ high: 0, medium: 1, low: 2 })[a.confidence] - ({ high: 0, medium: 1, low: 2 })[b.confidence],
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-neutral-500">
            Reddit: <span className="font-mono text-neutral-300">{connection.redditUsername}</span>
          </p>
        </div>
        <button
          onClick={() => void handleRunAnalysis()}
          disabled={running}
          className="rounded bg-orange-600 px-5 py-2 font-medium text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? "Scanning..." : result ? "Re-scan" : "Scan My History"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {running && (
        <div className="mb-8 rounded-lg border border-neutral-800 bg-neutral-950 p-8 text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
          <p className="text-neutral-400">
            Scanning your public Reddit history...<br />
            <span className="text-sm text-neutral-600">This may take a minute while the AI analyzes your posts.</span>
          </p>
        </div>
      )}

      {result && !running && (
        <>
          {/* Risk + Summary */}
          <div className={`mb-6 rounded-lg border p-5 ${RISK_COLORS[result.overallRisk] || RISK_COLORS.low}`}>
            <div className="mb-3">
              <RiskMeter risk={result.overallRisk} />
            </div>
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
              <h2 className="mb-3 text-sm font-semibold tracking-wider text-red-400 uppercase">
                Direct Identifiers Found — Scrub These First
              </h2>
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
                      <span className="font-mono text-red-300">{h.handle}</span>
                      {" "}
                      <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 underline">{h.url}</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Findings grouped by confidence */}
          {sorted.length === 0 ? (
            <div className="rounded-lg border border-green-800 bg-green-950/30 p-5 text-center text-green-400">
              No identifying signals found in your analyzed history.
            </div>
          ) : (
            <div>
              <h2 className="mb-4 text-sm font-semibold tracking-wider text-neutral-500 uppercase">
                Findings ({sorted.length})
              </h2>
              {["high", "medium", "low"].map((confidence) => {
                const group = sorted.filter((f) => f.confidence === confidence);
                if (group.length === 0) return null;
                return (
                  <div key={confidence} className="mb-6">
                    <h3 className="mb-3 text-xs font-semibold tracking-wider text-neutral-600 uppercase">
                      {confidence === "high" ? "High Confidence" : confidence === "medium" ? "Medium Confidence" : "Low Confidence"}
                    </h3>
                    <div className="space-y-4">
                      {group.map((f, i) => (
                        <FindingCard key={i} finding={f} index={i} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer note */}
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
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 p-4 text-left hover:bg-neutral-900/50"
      >
        <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${conf.badge}`}>
          {conf.label}
        </span>
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
                  <a href={e.permalink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 underline hover:text-blue-300">
                    {e.permalink}
                  </a>
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
  const auth = useAuth();

  return (
    <Router>
      <div className="min-h-screen bg-black text-white">
        <AuthSection />
        <div className="mx-auto max-w-5xl">
          <nav className="flex items-center gap-6 border-b border-neutral-800 px-6 py-3 text-sm">
            <Link to="/" className="font-medium tracking-tight text-white">
              <span className="text-orange-500">anony</span>mizer
            </Link>
            {!auth.isLoading && !auth.isGuest && (
              <>
                <Link to="/dashboard" className="text-neutral-500 hover:text-white">Dashboard</Link>
              </>
            )}
          </nav>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/connect" element={<ConnectCallbackPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={
              <div className="px-6 py-16 text-center">
                <h1 className="mb-4 text-4xl font-bold">Not Found</h1>
                <Link to="/" className="text-blue-400 underline hover:text-blue-300">Go home</Link>
              </div>
            } />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
