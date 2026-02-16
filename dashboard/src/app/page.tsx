"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from "recharts";

const metricDescriptions = {
  gini: { title: "GINI index", explainer: "Lower values mean income is more evenly distributed." },
  civic_trust: { title: "Civic trust", explainer: "Proxy for willingness to collaborate and accept shared rules." },
  annual_emissions: { title: "Annual emissions", explainer: "Gigatons of CO₂-equivalent released this year." },
  ai_influence: { title: "AI influence", explainer: "How deeply automation and AI copilots shape daily life." },
};

interface RunData {
  branch: Record<string, any>;
  trajectory: any[];
  final_metrics: Record<string, number>;
}

export default function Home() {
  const [runs, setRuns] = useState<RunData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState(0);
  const [yearIndex, setYearIndex] = useState(0);
  const [summary, setSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [timelinePosition, setTimelinePosition] = useState(1);
  const scrubTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/runs")
      .then((res) => res.json())
      .then((data) => {
        setRuns(data.runs || []);
      })
      .catch(() => setError("Failed to load runs"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const trajectory = runs[selectedBranch]?.trajectory ?? [];
    if (trajectory.length === 0) return;
    const idx = Math.round((trajectory.length - 1) * timelinePosition);
    setYearIndex(Math.min(trajectory.length - 1, Math.max(0, idx)));
  }, [runs, selectedBranch, timelinePosition]);

  useEffect(() => {
    if (!runs[selectedBranch] || isScrubbing) return;
    const state = runs[selectedBranch].trajectory?.[yearIndex];
    if (!state) return;
    const controller = new AbortController();
    let cancelled = false;
    setSummaryLoading(true);

    fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: state.year,
        gini: state.economy.gini,
        civic_trust: state.economy.civic_trust,
        emissions: state.climate.annual_emissions,
        resilience: state.climate.resilience_score,
        ai_influence: state.economy.ai_influence
      }),
      signal: controller.signal
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setSummary(data.summary || "");
        }
      })
      .catch((err) => {
        if (!cancelled && err.name !== "AbortError") {
          setSummary("Summary unavailable");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [runs, selectedBranch, yearIndex, isScrubbing]);

  const selectedRun = runs[selectedBranch];
  const selectedState = selectedRun?.trajectory?.[yearIndex];
  const timelineYears = selectedRun?.trajectory?.map((state: any) => state.year) ?? [];

  const handleYearChange = (value: number) => {
    const trajectory = runs[selectedBranch]?.trajectory ?? [];
    const maxIndex = Math.max(0, trajectory.length - 1);
    const clamped = Math.max(0, Math.min(maxIndex, value));
    setYearIndex(clamped);
    setTimelinePosition(maxIndex > 0 ? clamped / maxIndex : 0);
    setIsScrubbing(true);
    if (scrubTimeoutRef.current) {
      clearTimeout(scrubTimeoutRef.current);
    }
    scrubTimeoutRef.current = setTimeout(() => {
      setIsScrubbing(false);
    }, 600);
  };

  const branchLabel = useMemo(() => {
    if (!selectedRun) return "";
    const { branch } = selectedRun;
    return `Branch ${selectedBranch + 1}: dividend ${branch.civic_dividend_rate}, charter ${branch.ai_charter ? "on" : "off"}, climate capex ${Math.round(branch.climate_capex_share * 100)}%`;
  }, [selectedRun, selectedBranch]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <header className="space-y-4 border-b border-white/10 pb-6">
          <p className="text-sm uppercase tracking-[0.4em] text-sky-300">Future Sim Dashboard</p>
          <h1 className="text-3xl font-semibold text-white">What the simulation is doing</h1>
          <p className="text-slate-300">
            Each run represents a different policy recipe (civic dividend size, AI charter on/off, climate investment mix).
            The simulator advances society 10 years, tracks inequality (GINI), civic trust, emissions, and resilience, then stores the results.
            Scroll below to see how the outcomes shift and scrub through the timeline of a single branch.
          </p>
        </header>

        <section className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">How to read this</h2>
          <ul className="list-disc space-y-2 pl-6 text-slate-300">
            <li><strong>GINI</strong> tells us how concentrated income is (lower = more equitable).</li>
            <li><strong>Civic trust</strong> is a proxy for social stability and willingness to cooperate.</li>
            <li><strong>Annual emissions</strong> shows whether we stayed on track for climate goals.</li>
            <li>The timeline scrubber lets you inspect any year of a selected branch to see what the world looks like inside that simulation.</li>
          </ul>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {Object.entries(metricDescriptions).map(([key, info]) => (
            <article key={key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-sky-300">{info.title}</p>
              <p className="mt-2 text-sm text-slate-300">{info.explainer}</p>
            </article>
          ))}
        </section>

        {loading && <p className="mt-6 text-slate-400">Loading…</p>}
        {error && <p className="mt-6 text-red-300">{error}</p>}

        {!loading && !error && runs.length === 0 && (
          <p className="mt-6 text-slate-400">No runs found. Run `python simulate.py scenario.yaml` first.</p>
        )}

        {!loading && runs.length > 0 && (
          <div className="mt-10 grid gap-8">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Interactive branch timeline</h2>
                  <p className="text-sm text-slate-400">Choose a branch, then scrub through the years to see how metrics evolve.</p>
                </div>
                <select
                  className="rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(Number(e.target.value))}
                >
                  {runs.map((_, idx) => (
                    <option key={idx} value={idx}>Branch {idx + 1}</option>
                  ))}
                </select>
              </div>

              {selectedRun && (
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-slate-300">{branchLabel}</p>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <span>Year:</span>
                    <strong className="text-white">{selectedState?.year ?? ""}</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, (selectedRun.trajectory?.length ?? 1) - 1)}
                    value={yearIndex}
                    onChange={(e) => handleYearChange(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{timelineYears[0]}</span>
                    <span>{timelineYears[timelineYears.length - 1]}</span>
                  </div>
                  {selectedState && (
                    <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <MetricCard label="GINI" value={selectedState.economy.gini.toFixed(3)} explanation="Inequality level" />
                        <MetricCard label="Civic trust" value={selectedState.economy.civic_trust.toFixed(3)} explanation="Social cohesion" />
                        <MetricCard label="Annual emissions" value={`${selectedState.climate.annual_emissions.toFixed(2)} Gt`} explanation="Climate progress" />
                        <MetricCard label="Resilience" value={selectedState.climate.resilience_score.toFixed(3)} explanation="System robustness" />
                        <MetricCard label="AI influence" value={selectedState.economy.ai_influence.toFixed(3)} explanation="AI presence in daily systems" />
                      </div>
                      <div className="rounded-lg border border-white/10 bg-slate-800/70 p-3">
                        <p className="text-xs uppercase tracking-widest text-slate-400">AI summary</p>
                        {summaryLoading && <p className="text-sm text-slate-400">Generating summary…</p>}
                        {!summaryLoading && summary && (
                          <SummaryBlock text={summary} />
                        )}
                        {!summaryLoading && !summary && (
                          <p className="text-sm text-slate-400">No summary available.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, explanation }: { label: string; value: string | number; explanation: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-xs text-slate-400">{explanation}</p>
    </div>
  );
}






function SummaryBlock({ text }: { text: string }) {
  const parts = text.split("\n");
  const summaryLines: string[] = [];
  const actionLines: string[] = [];
  const impactLines: string[] = [];
  const aiLines: string[] = [];
  const nextStepLines: string[] = [];
  let section: "summary" | "actions" | "impact" | "ai" | "next" = "summary";

  for (const raw of parts) {
    const line = raw.trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower.startsWith("summary:")) {
      section = "summary";
      continue;
    }
    if (lower.startsWith("actions:")) {
      section = "actions";
      continue;
    }
    if (lower.startsWith("impact:")) {
      section = "impact";
      continue;
    }
    if (lower.startsWith("ai influence:")) {
      section = "ai";
      continue;
    }
    if (lower.startsWith("next steps:")) {
      section = "next";
      continue;
    }

    const normalized = line.replace(/^[*-]\s*/, "");
    if (section === "actions") {
      actionLines.push(normalized);
    } else if (section === "impact") {
      impactLines.push(normalized);
    } else if (section === "ai") {
      aiLines.push(normalized);
    } else if (section === "next") {
      nextStepLines.push(normalized);
    } else {
      summaryLines.push(normalized);
    }
  }

  return (
    <div className="space-y-3">
      {summaryLines.length > 0 && (
        <p className="text-sm text-slate-200">{summaryLines.join(" ")}</p>
      )}
      {actionLines.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Actions taken</p>
          <ul className="list-disc pl-5 text-sm text-slate-200">
            {actionLines.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {impactLines.length > 0 && (
        <div className="rounded-lg border border-white/5 bg-slate-900/60 p-3">
          <p className="text-xs uppercase tracking-widest text-slate-400">Impact</p>
          <ul className="list-disc pl-5 text-sm text-slate-200">
            {impactLines.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {aiLines.length > 0 && (
        <div className="rounded-lg border border-emerald-400/30 bg-slate-900/60 p-3">
          <p className="text-xs uppercase tracking-widest text-slate-400">AI influence</p>
          <ul className="list-disc pl-5 text-sm text-slate-200">
            {aiLines.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {nextStepLines.length > 0 && (
        <div className="rounded-lg border border-sky-500/30 bg-slate-900/60 p-3">
          <p className="text-xs uppercase tracking-widest text-slate-400">Next steps</p>
          <ul className="list-disc pl-5 text-sm text-slate-200">
            {nextStepLines.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
