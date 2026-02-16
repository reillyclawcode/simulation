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

const narrativeSections = [
  { title: "Food & biosystems", explainer: "Agrifood innovation, nutrition security, and ecosystem resilience signals pulled from each snapshot." },
  { title: "Medicine & healthspan", explainer: "Longevity, therapeutics, diagnostics, and access trends reshaping population structure." },
  { title: "Materials & infrastructure", explainer: "Advanced materials, storage, and urban systems that drive emissions and resilience." },
  { title: "Quantum & compute", explainer: "Compute policy, edge AI, and quantum labs that stress governance and economic planning." },
  { title: "Civic life & culture", explainer: "Social cohesion, participatory tooling, and cultural reactions to change." },
];

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
          <h1 className="text-3xl font-semibold text-white">Worldbuilding from civic levers to frontier tech</h1>
          <p className="text-slate-300">
            Every branch mixes policy levers (civic dividend, AI charter, climate capex) and runs 50 years forward to see how inequality, trust,
            emissions, resilience, and AI influence evolve. The summaries now pull in medicine, food systems, materials, quantum breakthroughs,
            and civic culture so you can read the state of the world—not just its charts. Scrub the timeline to drop into any year.
          </p>
        </header>

        <section className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">How to read this</h2>
          <ul className="list-disc space-y-2 pl-6 text-slate-300">
            <li><strong>Structural metrics</strong> (GINI, civic trust, emissions, resilience, AI influence) anchor every chart and narrative.</li>
            <li><strong>AI report cards</strong> unpack the same snapshot across Actions, Impact, Food & Biosystems, Medicine, Materials, Quantum, and Civic Life.</li>
            <li><strong>Scrub + compare</strong>: pick a branch, move the slider, and each section rewrites itself for that exact year.</li>
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


        <section className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">What the AI report covers</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {narrativeSections.map((section) => (
              <article key={section.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-sky-300">{section.title}</p>
                <p className="mt-2 text-sm text-slate-300">{section.explainer}</p>
              </article>
            ))}
          </div>
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
  const lines = text.split("\n");

  type SectionKey =
    | "summary"
    | "baseline"
    | "actions"
    | "impact"
    | "ai"
    | "food"
    | "health"
    | "materials"
    | "quantum"
    | "civic"
    | "next"
    | null;

  const summaryParagraphs: string[] = [];
  const bullets: Record<Exclude<SectionKey, "summary" | null>, string[]> = {
    baseline: [],
    actions: [],
    impact: [],
    ai: [],
    food: [],
    health: [],
    materials: [],
    quantum: [],
    civic: [],
    next: [],
  };

  const headingMap: Record<string, SectionKey> = {
    summary: "summary",
    "baseline comparison": "baseline",
    actions: "actions",
    impact: "impact",
    "ai influence": "ai",
    "food & biosystems": "food",
    "medicine & healthspan": "health",
    "materials & infrastructure": "materials",
    "quantum & compute": "quantum",
    "civic life & culture": "civic",
    "next steps": "next",
  };

  let section: SectionKey = null;
  let summaryBuffer: string[] = [];

  const flushSummary = () => {
    if (summaryBuffer.length > 0) {
      summaryParagraphs.push(summaryBuffer.join(" ").trim());
      summaryBuffer = [];
    }
  };

  const appendBullet = (key: Exclude<SectionKey, "summary" | null>) => (line: string) => {
    const target = bullets[key];
    if (line.startsWith("- ")) {
      target.push(line.replace(/^\-\s*/, ""));
    } else if (target.length > 0) {
      target[target.length - 1] = `${target[target.length - 1]} ${line}`;
    }
  };

  const bulletAppenders = {
    actions: appendBullet("actions"),
    impact: appendBullet("impact"),
    ai: appendBullet("ai"),
    food: appendBullet("food"),
    health: appendBullet("health"),
    materials: appendBullet("materials"),
    quantum: appendBullet("quantum"),
    civic: appendBullet("civic"),
    next: appendBullet("next"),
  } as const;

  for (const raw of lines) {
    const trimmed = raw.trim();
    const headingMatch = trimmed.match(/^##\s+(.+)/i);
    if (headingMatch) {
      const normalized = headingMatch[1].trim().toLowerCase();
      const mapped = headingMap[normalized];
      if (mapped) {
        flushSummary();
        section = mapped;
        continue;
      }
    }

    if (!trimmed) {
      if (section === "summary") {
        flushSummary();
      }
      continue;
    }

    if (section === "summary") {
      summaryBuffer.push(trimmed);
      continue;
    }

    if (section && section !== "summary") {
      bulletAppenders[section](trimmed);
    }
  }

  flushSummary();

  const renderBullets = (items: string[]) => (
    <ul className="list-disc pl-5 text-sm text-slate-200 space-y-2">
      {items.map((line, idx) => (
        <li key={idx}>{line}</li>
      ))}
    </ul>
  );

  const sectionOrder: { key: Exclude<SectionKey, "summary" | null>; label: string; accent?: string }[] = [
    { key: "baseline", label: "Baseline comparison", accent: "border-white/5" },
    { key: "actions", label: "Actions taken" },
    { key: "impact", label: "Impact", accent: "border-white/5" },
    { key: "ai", label: "AI influence", accent: "border-emerald-400/30" },
    { key: "food", label: "Food & biosystems", accent: "border-lime-400/30" },
    { key: "health", label: "Medicine & healthspan", accent: "border-rose-300/30" },
    { key: "materials", label: "Materials & infrastructure", accent: "border-cyan-300/30" },
    { key: "quantum", label: "Quantum & compute", accent: "border-violet-300/30" },
    { key: "civic", label: "Civic life & culture", accent: "border-amber-300/30" },
    { key: "next", label: "Next steps", accent: "border-sky-500/30" },
  ];

  return (
    <div className="space-y-5">
      {summaryParagraphs.length > 0 && (
        <div className="space-y-3">
          {summaryParagraphs.map((para, idx) => (
            <p key={idx} className="text-sm text-slate-200">{para}</p>
          ))}
        </div>
      )}
      {sectionOrder.map(({ key, label, accent }) => {
        const items = bullets[key];
        if (!items || items.length === 0) return null;
        const containerClass = accent
          ? `rounded-lg border ${accent} bg-slate-900/60 p-3`
          : undefined;
        return (
          <div key={key} className={containerClass}>
            <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
            {renderBullets(items)}
          </div>
        );
      })}
    </div>
  );
}
