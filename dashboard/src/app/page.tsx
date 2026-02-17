"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SnapshotState {
  year: number;
  economy: { gini: number; civic_trust: number; ai_influence: number };
  climate: { annual_emissions: number; resilience_score: number };
}

interface RunData {
  branch: Record<string, any>;
  trajectory: SnapshotState[];
  final_metrics: Record<string, number>;
}

interface LabNote {
  id: string;
  title: string;
  annotation: string;
  timestamp: string;
  branchIndex: number;
  branchLabel: string;
  yearIndex: number;
  year: number;
  metrics: {
    gini: number;
    civic_trust: number;
    annual_emissions: number;
    resilience_score: number;
    ai_influence: number;
  };
  compositeScore: number;
  rating: string;
  summary: string;
}

/* ------------------------------------------------------------------ */
/*  Constants — blog content & metric config                           */
/* ------------------------------------------------------------------ */

const BLOG_URL =
  "https://reillyclawcode.github.io/clawcodeblog/posts/2026-02-15-future-simulation/";

const BLOG_INSIGHTS = [
  {
    title: "Agency beats prediction",
    body: "Perfect foresight doesn\u2019t help if we don\u2019t act on it. The sim becomes a mirror reminding us the present is the only place we can exert force.",
    icon: "\u2693",
  },
  {
    title: "Small civic wins ripple",
    body: "Adding participatory audits, open ledgers, or shared compute co-ops slightly tweaks millions of branches, often tipping them toward shared benefit.",
    icon: "\u2728",
  },
  {
    title: "Stubborn problems reappear",
    body: "No matter how far we roll the dice, unresolved energy, housing, and labor transitions resurface. Fix root causes or keep reliving variants of the same bottleneck.",
    icon: "\u267B",
  },
  {
    title: "Early constraints dominate",
    body: "The first inputs we set\u2009\u2014\u2009resource distribution, governance norms, who has veto power\u2009\u2014\u2009show up in nearly every outcome, even as the trees fan outward.",
    icon: "\u{1F331}",
  },
  {
    title: "Values before arithmetic",
    body: "If we don\u2019t specify what \u201cseeking\u201d means\u2009\u2014\u2009justice? abundance? stability?\u2009\u2014\u2009we just drown in branching arithmetic.",
    icon: "\u{1F9ED}",
  },
];

const THREE_THROUGH_LINES = [
  { title: "Cultural + ecological care", body: "Art, meaning, biodiversity restoration. Without them, even technically \u201csuccessful\u201d simulations feel hollow, and social cohesion collapses.", accent: "from-emerald-500/20 to-emerald-500/0", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  { title: "Shared upside", body: "Dividends, co-ops, portable benefits. When people feel the gains, they participate more, lowering tail risks.", accent: "from-sky-500/20 to-sky-500/0", border: "border-sky-500/30", dot: "bg-sky-400" },
  { title: "Transparent governance", body: "Open weights, audit trails, and citizens with real override powers over powerful systems.", accent: "from-violet-500/20 to-violet-500/0", border: "border-violet-500/30", dot: "bg-violet-400" },
];

const THREE_DARK_LINES = [
  { title: "Unchecked concentration", body: "Wealth, compute, and decision-making power consolidate into fewer hands. When no one has override capability, the system optimizes for the wrong objective function.", accent: "from-red-500/20 to-red-500/0", border: "border-red-500/30", dot: "bg-red-400" },
  { title: "Erosion of shared truth", body: "Misinformation, deep fakes, and tribal epistemology fracture public consensus. Without shared facts, cooperation becomes impossible and trust free-falls.", accent: "from-orange-500/20 to-orange-500/0", border: "border-orange-500/30", dot: "bg-orange-400" },
  { title: "Ecological neglect", body: "Biodiversity loss, soil depletion, and resource extraction continue unchecked. The biosphere\u2019s buffering capacity shrinks until small shocks cascade into systemic failures.", accent: "from-amber-500/20 to-amber-500/0", border: "border-amber-500/30", dot: "bg-amber-400" },
];

const NOTABLE_RUNS = [
  { run: "Run 218", desc: "Civic dividends + participatory AI charters + \u201cpublic luxuries\u201d baseline", result: "After two decades, inequality curves flatten and cultural investments explode." },
  { run: "Run 103", desc: "Climate VPPs scale but governance lags", result: "Grid stability improves, yet trust erodes, limiting adoption." },
  { run: "Run 47", desc: "Open standards + Transition OS funding", result: "Slower short-term growth, but resilience metrics outpace every other branch after year five." },
  { run: "Run 12", desc: "Frontier AI is proprietary, dividends aren\u2019t shared", result: "Polarization spikes." },
];


const METRIC_COLORS: Record<string, string> = { gini: "#f59e0b", civic_trust: "#10b981", annual_emissions: "#f43f5e", resilience_score: "#06b6d4", ai_influence: "#8b5cf6" };
const METRIC_LABELS: Record<string, string> = { gini: "GINI Index", civic_trust: "Civic Trust", annual_emissions: "Emissions (Gt)", resilience_score: "Resilience", ai_influence: "AI Influence" };
const METRIC_DESCRIPTIONS: Record<string, string> = { gini: "Lower values mean income is more evenly distributed.", civic_trust: "Proxy for willingness to collaborate and accept shared rules.", annual_emissions: "Gigatons of CO\u2082-equivalent released this year.", resilience_score: "System robustness against shocks and disruptions.", ai_influence: "How deeply automation and AI copilots shape daily life." };
const METRIC_GOOD_DIR: Record<string, "up" | "down" | "stable"> = { gini: "down", civic_trust: "up", annual_emissions: "down", resilience_score: "up", ai_influence: "stable" };

/* ------------------------------------------------------------------ */
/*  Utility functions                                                  */
/* ------------------------------------------------------------------ */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

interface ScoreBreakdown {
  total: number;
  components: { label: string; score: number; explanation: string; color: string }[];
  rating: string;
  ratingColor: string;
}

function computeCompositeScore(current?: SnapshotState, baseline?: SnapshotState | null): ScoreBreakdown | null {
  if (!current || !baseline) return null;
  const g = clamp01(1 - current.economy.gini);
  const t = clamp01(current.economy.civic_trust);
  const r = clamp01(current.climate.resilience_score);
  const e = clamp01(1 - current.climate.annual_emissions / Math.max(1, baseline.climate.annual_emissions));

  // AI governance: two factors blended together:
  //   1. Readiness — how strong are governance institutions? (trust / 0.65)
  //      Even with no AI gap, low trust means fragile governance.
  //   2. Gap penalty — when AI influence outpaces trust, penalize heavily.
  // This prevents early years from scoring 100 just because AI hasn't grown yet.
  const govReadiness = clamp01(current.economy.civic_trust / 0.65);
  const govGap = Math.max(0, current.economy.ai_influence - current.economy.civic_trust - 0.1);
  const a = clamp01(govReadiness - govGap * 2.5);

  const total = Math.round(((g + t + r + e + a) / 5) * 100);
  const rating = total >= 80 ? "Thriving" : total >= 65 ? "Promising" : total >= 50 ? "Mixed signals" : total >= 35 ? "Under stress" : "Critical";
  const ratingColor = total >= 80 ? "text-emerald-400" : total >= 65 ? "text-sky-400" : total >= 50 ? "text-amber-400" : total >= 35 ? "text-orange-400" : "text-red-400";
  return {
    total, rating, ratingColor,
    components: [
      { label: "Equality", score: Math.round(g * 100), explanation: `GINI is ${current.economy.gini.toFixed(3)} \u2014 ${g > 0.7 ? "income is well distributed" : g > 0.5 ? "moderate inequality remains" : "significant inequality persists"}`, color: METRIC_COLORS.gini },
      { label: "Civic trust", score: Math.round(t * 100), explanation: `Trust at ${current.economy.civic_trust.toFixed(3)} \u2014 ${t > 0.7 ? "strong social cohesion" : t > 0.4 ? "cooperation is possible but fragile" : "low willingness to collaborate"}`, color: METRIC_COLORS.civic_trust },
      { label: "Resilience", score: Math.round(r * 100), explanation: `Score ${current.climate.resilience_score.toFixed(3)} \u2014 ${r > 0.7 ? "systems absorb shocks well" : r > 0.4 ? "some buffering capacity" : "vulnerable to disruption"}`, color: METRIC_COLORS.resilience_score },
      { label: "Decarbonization", score: Math.round(e * 100), explanation: `Emissions ${current.climate.annual_emissions.toFixed(2)} Gt vs ${baseline.climate.annual_emissions.toFixed(2)} Gt baseline \u2014 ${e > 0.7 ? "major progress" : e > 0.4 ? "some reduction" : "still tracking high"}`, color: METRIC_COLORS.annual_emissions },
      { label: "AI governance", score: Math.round(a * 100), explanation: `AI at ${current.economy.ai_influence.toFixed(3)}, trust at ${current.economy.civic_trust.toFixed(3)} \u2014 ${a > 0.7 ? "governance institutions are strong and keeping pace" : a > 0.4 ? "governance readiness is building but gaps are emerging" : "institutional trust lags dangerously behind AI adoption"}`, color: METRIC_COLORS.ai_influence },
    ],
  };
}

function getMetricValue(snap: SnapshotState, key: string): number {
  if (key === "gini") return snap.economy.gini;
  if (key === "civic_trust") return snap.economy.civic_trust;
  if (key === "annual_emissions") return snap.climate.annual_emissions;
  if (key === "resilience_score") return snap.climate.resilience_score;
  if (key === "ai_influence") return snap.economy.ai_influence;
  return 0;
}

function branchLabel(run: RunData) {
  const b = run.branch;
  return `Dividend ${(b.civic_dividend_rate * 100).toFixed(0)}% \u00b7 Charter ${b.ai_charter ? "ON" : "OFF"} \u00b7 Climate ${(b.climate_capex_share * 100).toFixed(0)}%`;
}

/** Compute a 0–1 intervention intensity for a branch based on its lever settings. */
function interventionIntensity(run: RunData, allRuns: RunData[]): number {
  if (allRuns.length === 0) return 0;
  const divs = allRuns.map((r) => r.branch.civic_dividend_rate);
  const caps = allRuns.map((r) => r.branch.climate_capex_share);
  const minDiv = Math.min(...divs), maxDiv = Math.max(...divs);
  const minCap = Math.min(...caps), maxCap = Math.max(...caps);
  const b = run.branch;
  const divNorm = maxDiv > minDiv ? (b.civic_dividend_rate - minDiv) / (maxDiv - minDiv) : 0;
  const capNorm = maxCap > minCap ? (b.climate_capex_share - minCap) / (maxCap - minCap) : 0;
  const charterNorm = b.ai_charter ? 1 : 0;
  return (divNorm + capNorm + charterNorm) / 3;
}

function intensityLabel(intensity: number): { label: string; color: string; bg: string; ring: string } {
  if (intensity >= 0.8) return { label: "Bold action", color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" };
  if (intensity >= 0.55) return { label: "Strong action", color: "text-sky-400", bg: "bg-sky-500/10", ring: "ring-sky-500/20" };
  if (intensity >= 0.35) return { label: "Moderate action", color: "text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/20" };
  if (intensity >= 0.15) return { label: "Minimal action", color: "text-orange-400", bg: "bg-orange-500/10", ring: "ring-orange-500/20" };
  return { label: "Status quo", color: "text-red-400", bg: "bg-red-500/10", ring: "ring-red-500/20" };
}

function findInactionBranch(runs: RunData[]): RunData | null {
  if (runs.length === 0) return null;
  const minDiv = Math.min(...runs.map((r) => r.branch.civic_dividend_rate));
  const minCap = Math.min(...runs.map((r) => r.branch.climate_capex_share));
  return runs.find((r) => r.branch.civic_dividend_rate === minDiv && r.branch.ai_charter === false && r.branch.climate_capex_share === minCap) ?? runs[0];
}

function findMaxActionBranch(runs: RunData[]): RunData | null {
  if (runs.length === 0) return null;
  const maxDiv = Math.max(...runs.map((r) => r.branch.civic_dividend_rate));
  const maxCap = Math.max(...runs.map((r) => r.branch.climate_capex_share));
  return runs.find((r) => r.branch.civic_dividend_rate === maxDiv && r.branch.ai_charter === true && r.branch.climate_capex_share === maxCap) ?? runs[runs.length - 1];
}

/* ---- Lab notes localStorage helpers ---- */
const LAB_NOTES_KEY = "simulation-lab-notes";

function loadLabNotes(): LabNote[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LAB_NOTES_KEY) || "[]"); } catch { return []; }
}

function saveLabNotes(notes: LabNote[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAB_NOTES_KEY, JSON.stringify(notes));
}

/* ---- Export helpers ---- */
function exportSnapshotMarkdown(note: LabNote): string {
  return `# Lab Note: ${note.title}

> ${note.annotation || "No annotation."}

**Date saved:** ${new Date(note.timestamp).toLocaleString()}
**Branch:** ${note.branchLabel}
**Year:** ${note.year}
**Trajectory score:** ${note.compositeScore}/100 (${note.rating})

## Metrics

| Metric | Value |
|--------|-------|
| GINI Index | ${note.metrics.gini.toFixed(3)} |
| Civic Trust | ${note.metrics.civic_trust.toFixed(3)} |
| Annual Emissions | ${note.metrics.annual_emissions.toFixed(2)} Gt |
| Resilience | ${note.metrics.resilience_score.toFixed(3)} |
| AI Influence | ${note.metrics.ai_influence.toFixed(3)} |

## AI Summary

${note.summary || "*No AI summary was generated for this snapshot.*"}
`;
}

function downloadFile(filename: string, content: string, type = "text/markdown") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [runs, setRuns] = useState<RunData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState(0);
  const [yearIndex, setYearIndex] = useState(0);
  const [summary, setSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const sliderRef = useRef<HTMLInputElement>(null);
  const summaryControllerRef = useRef<AbortController | null>(null);

  /* Lab notes state */
  const [labNotes, setLabNotes] = useState<LabNote[]>([]);
  const [labNotesOpen, setLabNotesOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteAnnotation, setNoteAnnotation] = useState("");

  /* Branch comparison overlay */
  const [compareBranch, setCompareBranch] = useState<number | null>(null);

  /* Load lab notes from localStorage on mount */
  useEffect(() => { setLabNotes(loadLabNotes()); }, []);

  /* Fetch runs on mount */
  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((data) => setRuns(data.runs || []))
      .catch(() => setError("Failed to load simulation runs."))
      .finally(() => setLoading(false));
  }, []);

  /* Block scroll-wheel on the range slider */
  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    const block = (e: WheelEvent) => { e.preventDefault(); el.blur(); };
    el.addEventListener("wheel", block, { passive: false });
    return () => el.removeEventListener("wheel", block);
  }, []);

  /* Clamp year index to new trajectory length when branch changes; clear summary */
  useEffect(() => {
    const newTraj = runs[selectedBranch]?.trajectory ?? [];
    setYearIndex((prev) => Math.min(prev, Math.max(0, newTraj.length - 1)));
    if (summaryControllerRef.current) { summaryControllerRef.current.abort(); summaryControllerRef.current = null; }
    setSummary("");
    setSummaryLoading(false);
  }, [selectedBranch, runs]);

  /* Derived data */
  const selectedRun = runs[selectedBranch] ?? null;
  const trajectory = selectedRun?.trajectory ?? [];
  const selectedState = trajectory[yearIndex] as SnapshotState | undefined;
  const baselineState = useMemo(() => runs[0]?.trajectory?.[0] ?? null, [runs]);
  const inactionRun = useMemo(() => findInactionBranch(runs), [runs]);
  const maxActionRun = useMemo(() => findMaxActionBranch(runs), [runs]);

  const contrastRun = useMemo(() => {
    if (!selectedRun || !inactionRun) return null;
    const onInaction = selectedRun.branch.civic_dividend_rate === inactionRun.branch.civic_dividend_rate && selectedRun.branch.ai_charter === inactionRun.branch.ai_charter && selectedRun.branch.climate_capex_share === inactionRun.branch.climate_capex_share;
    return onInaction ? maxActionRun : inactionRun;
  }, [selectedRun, inactionRun, maxActionRun]);

  const isOnInactionBranch = useMemo(() => {
    if (!selectedRun || !inactionRun) return false;
    return selectedRun.branch.civic_dividend_rate === inactionRun.branch.civic_dividend_rate && selectedRun.branch.ai_charter === inactionRun.branch.ai_charter && selectedRun.branch.climate_capex_share === inactionRun.branch.climate_capex_share;
  }, [selectedRun, inactionRun]);

  const compositeScore = useMemo(() => computeCompositeScore(selectedState, baselineState), [selectedState, baselineState]);

  const timelineData = useMemo(() => {
    return trajectory.map((snap: SnapshotState) => ({
      year: snap.year, gini: snap.economy.gini, civic_trust: snap.economy.civic_trust,
      annual_emissions: snap.climate.annual_emissions, resilience_score: snap.climate.resilience_score,
      ai_influence: snap.economy.ai_influence,
    }));
  }, [trajectory]);

  const comparisonData = useMemo(() => {
    if (!selectedRun || !contrastRun) return [];
    const maxLen = Math.max(selectedRun.trajectory.length, contrastRun.trajectory.length);
    const result = [];
    for (let i = 0; i < maxLen; i++) {
      const a = selectedRun.trajectory[i];
      const b = contrastRun.trajectory[i];
      result.push({
        year: a?.year ?? b?.year ?? 2026 + i,
        action_gini: a?.economy.gini, inaction_gini: b?.economy.gini,
        action_trust: a?.economy.civic_trust, inaction_trust: b?.economy.civic_trust,
        action_emissions: a?.climate.annual_emissions, inaction_emissions: b?.climate.annual_emissions,
        action_resilience: a?.climate.resilience_score, inaction_resilience: b?.climate.resilience_score,
        action_ai: a?.economy.ai_influence, inaction_ai: b?.economy.ai_influence,
      });
    }
    return result;
  }, [selectedRun, contrastRun]);

  /* Branch overlay comparison data */
  const overlayData = useMemo(() => {
    if (compareBranch === null || !selectedRun || !runs[compareBranch]) return null;
    const runB = runs[compareBranch];
    const maxLen = Math.max(selectedRun.trajectory.length, runB.trajectory.length);
    const result = [];
    for (let i = 0; i < maxLen; i++) {
      const a = selectedRun.trajectory[i];
      const b = runB.trajectory[i];
      result.push({
        year: a?.year ?? b?.year ?? 2026 + i,
        a_gini: a?.economy.gini, b_gini: b?.economy.gini,
        a_trust: a?.economy.civic_trust, b_trust: b?.economy.civic_trust,
        a_emissions: a?.climate.annual_emissions, b_emissions: b?.climate.annual_emissions,
        a_resilience: a?.climate.resilience_score, b_resilience: b?.climate.resilience_score,
        a_ai: a?.economy.ai_influence, b_ai: b?.economy.ai_influence,
      });
    }
    return result;
  }, [compareBranch, selectedRun, runs]);

  const deltaCards = useMemo(() => {
    if (!selectedState || !baselineState) return [];
    const metrics = ["gini", "civic_trust", "annual_emissions", "resilience_score", "ai_influence"] as const;
    return metrics.map((key) => {
      const current = getMetricValue(selectedState, key);
      const baseline = getMetricValue(baselineState as SnapshotState, key);
      const delta = current - baseline;
      const dir = METRIC_GOOD_DIR[key];
      const good = dir === "up" ? delta >= 0 : dir === "down" ? delta <= 0 : Math.abs(delta) < 0.05;
      return { key, label: METRIC_LABELS[key], current, baseline, delta, good, color: METRIC_COLORS[key] };
    });
  }, [selectedState, baselineState]);

  /* Generate summary */
  const currentIntensity = selectedRun ? interventionIntensity(selectedRun, runs) : 0;
  const currentTier = intensityLabel(currentIntensity);

  const generateSummary = useCallback(() => {
    if (!selectedState || !selectedRun) return;
    if (summaryControllerRef.current) summaryControllerRef.current.abort();
    const controller = new AbortController();
    summaryControllerRef.current = controller;
    setSummaryLoading(true);
    const inactionSnap = inactionRun?.trajectory[yearIndex] as SnapshotState | undefined;
    const intensity = interventionIntensity(selectedRun, runs);
    const tier = intensityLabel(intensity);
    fetch("/api/summarize", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: selectedState.year, gini: selectedState.economy.gini, civic_trust: selectedState.economy.civic_trust,
        emissions: selectedState.climate.annual_emissions, resilience: selectedState.climate.resilience_score,
        ai_influence: selectedState.economy.ai_influence,
        inaction_gini: inactionSnap?.economy.gini, inaction_civic_trust: inactionSnap?.economy.civic_trust,
        inaction_emissions: inactionSnap?.climate.annual_emissions, inaction_resilience: inactionSnap?.climate.resilience_score,
        inaction_ai_influence: inactionSnap?.economy.ai_influence,
        branch_number: selectedBranch + 1,
        branch_label: branchLabel(selectedRun),
        branch_tier: tier.label,
        branch_intensity: Math.round(intensity * 100),
      }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setSummary(data.summary || ""))
      .catch((err) => { if (err.name !== "AbortError") setSummary("Summary unavailable."); })
      .finally(() => setSummaryLoading(false));
  }, [selectedState, selectedRun, inactionRun, yearIndex, selectedBranch, runs]);

  const handleYearChange = (value: number) => {
    const max = Math.max(0, trajectory.length - 1);
    setYearIndex(Math.max(0, Math.min(max, value)));
  };

  /* Save lab note */
  const handleSaveNote = useCallback(() => {
    if (!selectedState || !compositeScore || !selectedRun) return;
    const note: LabNote = {
      id: crypto.randomUUID(),
      title: noteTitle || `Branch ${selectedBranch + 1} \u2014 Year ${selectedState.year}`,
      annotation: noteAnnotation,
      timestamp: new Date().toISOString(),
      branchIndex: selectedBranch,
      branchLabel: branchLabel(selectedRun),
      yearIndex,
      year: selectedState.year,
      metrics: {
        gini: selectedState.economy.gini, civic_trust: selectedState.economy.civic_trust,
        annual_emissions: selectedState.climate.annual_emissions, resilience_score: selectedState.climate.resilience_score,
        ai_influence: selectedState.economy.ai_influence,
      },
      compositeScore: compositeScore.total,
      rating: compositeScore.rating,
      summary,
    };
    const updated = [note, ...labNotes];
    setLabNotes(updated);
    saveLabNotes(updated);
    setSaveDialogOpen(false);
    setNoteTitle("");
    setNoteAnnotation("");
  }, [selectedState, compositeScore, selectedRun, selectedBranch, yearIndex, summary, noteTitle, noteAnnotation, labNotes]);

  /* Delete lab note */
  const handleDeleteNote = useCallback((id: string) => {
    const updated = labNotes.filter((n) => n.id !== id);
    setLabNotes(updated);
    saveLabNotes(updated);
  }, [labNotes]);

  /* Restore lab note */
  const handleRestoreNote = useCallback((note: LabNote) => {
    if (note.branchIndex < runs.length) {
      setSelectedBranch(note.branchIndex);
      setTimeout(() => setYearIndex(note.yearIndex), 50);
    }
    setLabNotesOpen(false);
  }, [runs]);

  /* Export snapshot */
  const handleExport = useCallback(() => {
    if (!selectedState || !compositeScore || !selectedRun) return;
    const note: LabNote = {
      id: "", title: `Branch ${selectedBranch + 1} \u2014 Year ${selectedState.year}`,
      annotation: "", timestamp: new Date().toISOString(), branchIndex: selectedBranch,
      branchLabel: branchLabel(selectedRun), yearIndex, year: selectedState.year,
      metrics: { gini: selectedState.economy.gini, civic_trust: selectedState.economy.civic_trust, annual_emissions: selectedState.climate.annual_emissions, resilience_score: selectedState.climate.resilience_score, ai_influence: selectedState.economy.ai_influence },
      compositeScore: compositeScore.total, rating: compositeScore.rating, summary,
    };
    const md = exportSnapshotMarkdown(note);
    downloadFile(`snapshot-branch${selectedBranch + 1}-year${selectedState.year}.md`, md);
  }, [selectedState, compositeScore, selectedRun, selectedBranch, yearIndex, summary]);

  const comparisonHeading = useMemo(() => {
    if (isOnInactionBranch && maxActionRun) {
      return { title: "What if we take bold action?", subtitle: `You\u2019re viewing the status quo branch. Here\u2019s how it compares to the highest-intervention branch (Dividend ${(maxActionRun.branch.civic_dividend_rate * 100).toFixed(0)}%, Charter ON, Climate ${(maxActionRun.branch.climate_capex_share * 100).toFixed(0)}%) to see what deliberate action could achieve.`, selectedLabel: "Status quo", contrastLabel: "With bold action" };
    }
    if (inactionRun) {
      return { title: "What if we don\u2019t act?", subtitle: `Comparing your selected branch against the minimum-intervention baseline (Dividend ${(inactionRun.branch.civic_dividend_rate * 100).toFixed(0)}%, Charter OFF, Climate ${(inactionRun.branch.climate_capex_share * 100).toFixed(0)}%) to see where deliberate action diverges from status quo.`, selectedLabel: "With action", contrastLabel: "Status quo" };
    }
    return null;
  }, [isOnInactionBranch, maxActionRun, inactionRun]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-sky-500/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[40%] left-1/2 h-[80vw] w-[80vw] -translate-x-1/2 rounded-full bg-sky-500/[0.04] blur-[120px]" />
        <div className="absolute -bottom-[30%] right-0 h-[60vw] w-[60vw] rounded-full bg-violet-500/[0.03] blur-[100px]" />
      </div>

      {/* ---- Lab notes slide-over panel ---- */}
      {labNotesOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setLabNotesOpen(false)} />
          <div className="relative w-full max-w-md overflow-y-auto bg-slate-900 border-l border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Saved Lab Notes</h2>
              <button onClick={() => setLabNotesOpen(false)} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>
            {labNotes.length === 0 && <p className="text-sm text-slate-500">No saved notes yet. Use &ldquo;Save to lab notes&rdquo; from the timeline scrubber.</p>}
            <div className="space-y-3">
              {labNotes.map((note) => (
                <div key={note.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{note.title}</p>
                      <p className="text-xs text-slate-500">{note.branchLabel} &middot; {note.year}</p>
                      <p className="text-xs text-slate-500">{new Date(note.timestamp).toLocaleDateString()}</p>
                      {note.annotation && <p className="mt-1 text-xs text-slate-400 italic">{note.annotation}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-white">{note.compositeScore}</p>
                      <p className="text-[10px] text-slate-500">{note.rating}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleRestoreNote(note)} className="rounded-lg bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/20">Restore</button>
                    <button onClick={() => { const md = exportSnapshotMarkdown(note); downloadFile(`note-${note.id.slice(0, 8)}.md`, md); }} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10">Export .md</button>
                    <button onClick={() => handleDeleteNote(note.id)} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- Save note dialog ---- */}
      {saveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSaveDialogOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h3 className="text-base font-bold text-white">Save Lab Note</h3>
            <p className="mt-1 text-xs text-slate-500">Branch {selectedBranch + 1} &middot; Year {selectedState?.year}</p>
            <input
              type="text" placeholder="Title (optional)" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)}
              className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500/50 focus:outline-none"
            />
            <textarea
              placeholder="Annotation / observations (optional)" value={noteAnnotation} onChange={(e) => setNoteAnnotation(e.target.value)}
              rows={3} className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500/50 focus:outline-none resize-none"
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setSaveDialogOpen(false)} className="rounded-lg bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10">Cancel</button>
              <button onClick={handleSaveNote} className="rounded-lg bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 ring-1 ring-sky-500/20 hover:bg-sky-500/20">Save</button>
            </div>
          </div>
        </div>
      )}

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">

        {/* ============================================================ */}
        {/*  HERO                                                         */}
        {/* ============================================================ */}
        <header className="space-y-6 border-b border-white/10 pb-8">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.5em] text-sky-400">Future Simulation Toolkit</p>
            <button onClick={() => setLabNotesOpen(true)} className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 ring-1 ring-white/10 hover:bg-white/10 transition">
              Lab Notes {labNotes.length > 0 && <span className="rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[10px] text-sky-300">{labNotes.length}</span>}
            </button>
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">Running every future sim until the answer shows up</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-400">
            Imagine we spin up an infinite stack of simulations beginning right now. Each sim branches on every plausible decision we could make from this moment forward. What emerges if we keep iterating until{" "}
            <span className="text-white">&ldquo;all that we&rsquo;ve been seeking&rdquo;</span> finally shows itself?
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a href={BLOG_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-5 py-2.5 text-sm font-semibold text-sky-300 ring-1 ring-sky-500/20 transition hover:bg-sky-500/20">Read the blog post &rarr;</a>
            <a href="https://github.com/reillyclawcode/simulation" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10">GitHub repo</a>
            <a href="https://github.com/reillyclawcode/transitionOS" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/20 transition hover:bg-emerald-500/20">{"\u{1F6E0}\uFE0F"} TransitionOS Dashboard</a>
            <a href="https://reillyclawcode.github.io/clawcodeblog/research/ai-civilization/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-5 py-2.5 text-sm font-semibold text-violet-300 ring-1 ring-violet-500/20 transition hover:bg-violet-500/20">{"\u{1F4DC}"} Research Paper</a>
          </div>
          <div className="flex flex-wrap gap-8 pt-2 text-sm">
            <Stat value="12" label="branches" /><Stat value="50" label="year horizon" /><Stat value="5" label="structural metrics" /><Stat value="2026" label="start year" />
          </div>
        </header>

        {/* INSIGHTS */}
        <section className="mt-16">
          <SectionHeading badge="Insights" title="What the simulations teach immediately" subtitle="Five patterns that emerge across every run, no matter how the dice land." />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BLOG_INSIGHTS.map((insight) => (
              <article key={insight.title} className="glass-card group rounded-2xl p-5 transition-all hover:border-white/20 hover:bg-white/[0.07]">
                <span className="text-2xl">{insight.icon}</span>
                <h3 className="mt-3 text-sm font-semibold text-white">{insight.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{insight.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* THREE THROUGH-LINES */}
        <section className="mt-16">
          <SectionHeading badge="Through-lines" title="Three things that never leave the best futures" subtitle="After looping through enough runs, these ingredients consistently show up in every future we'd actually want to inhabit." />
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {THREE_THROUGH_LINES.map((line) => (
              <article key={line.title} className={`relative overflow-hidden rounded-2xl border ${line.border} bg-gradient-to-b ${line.accent} p-6`}>
                <div className={`mb-4 h-2 w-2 rounded-full ${line.dot}`} />
                <h3 className="text-base font-semibold text-white">{line.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{line.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* THREE DARK LINES — worst futures */}
        <section className="mt-10">
          <SectionHeading badge="Warnings" title="Three things that never leave the worst futures" subtitle="The same runs that reveal the best ingredients also expose what poisons every timeline they touch." />
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {THREE_DARK_LINES.map((line) => (
              <article key={line.title} className={`relative overflow-hidden rounded-2xl border ${line.border} bg-gradient-to-b ${line.accent} p-6`}>
                <div className={`mb-4 h-2 w-2 rounded-full ${line.dot}`} />
                <h3 className="text-base font-semibold text-white">{line.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{line.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* NOTABLE RUNS */}
        <section className="mt-16">
          <SectionHeading badge="Lab notes" title="Running it again (and again)" subtitle="Each replay becomes a lab note. The point isn't to pick the 'best' sim \u2014 it's to observe which ingredients consistently show up." />
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {NOTABLE_RUNS.map((run) => (
              <article key={run.run} className="glass-card rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-sky-400">{run.run}</p>
                <p className="mt-2 text-sm text-slate-300">{run.desc}</p>
                <p className="mt-2 text-sm font-medium text-white">{run.result}</p>
              </article>
            ))}
          </div>
        </section>

        {/* LOADING / ERROR */}
        {loading && <div className="mt-16 flex items-center gap-3 text-slate-400"><div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />Loading simulation data&hellip;</div>}
        {error && <p className="mt-16 text-red-400">{error}</p>}
        {!loading && !error && runs.length === 0 && <div className="mt-16 glass-card rounded-2xl p-8 text-center"><p className="text-slate-400">No runs found. Run <code className="rounded bg-white/10 px-2 py-0.5 text-xs text-sky-300">python simulate.py scenario.yaml</code> to generate trajectories.</p></div>}

        {/* ============================================================ */}
        {/*  BRANCH EXPLORER                                              */}
        {/* ============================================================ */}
        {!loading && runs.length > 0 && (
          <>
            <section className="mt-16">
              <SectionHeading badge="Explorer" title="Interactive branch timeline" subtitle="Each branch represents a different policy mix. They're ordered from least intervention (Branch 1 — status quo) to most intervention (Branch 12 — bold action across all levers). Pick one to explore its 50-year trajectory." />

              {/* Branch picker — visual grid */}
              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-slate-400">Select a branch to explore</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-400" />Status quo</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-orange-400" />Minimal</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" />Moderate</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-sky-400" />Strong</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />Bold</span>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {runs.map((run, idx) => {
                    const intensity = interventionIntensity(run, runs);
                    const tier = intensityLabel(intensity);
                    const isSelected = idx === selectedBranch;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedBranch(idx)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          isSelected
                            ? `border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/30`
                            : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300">Branch {idx + 1}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${tier.color} ${tier.bg} ${tier.ring}`}>
                            {tier.label}
                          </span>
                        </div>
                        {/* Intervention intensity bar */}
                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.round(intensity * 100)}%`,
                              background: intensity >= 0.8 ? "#10b981" : intensity >= 0.55 ? "#0ea5e9" : intensity >= 0.35 ? "#f59e0b" : intensity >= 0.15 ? "#f97316" : "#ef4444",
                            }}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                          <span>Div {(run.branch.civic_dividend_rate * 100).toFixed(0)}%</span>
                          <span>Charter {run.branch.ai_charter ? "ON" : "OFF"}</span>
                          <span>Climate {(run.branch.climate_capex_share * 100).toFixed(0)}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Timeline charts */}
              {timelineData.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">Metric trajectories over 50 years</h3>
                    <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                      <span className="inline-block h-2 w-2 rounded-full bg-sky-400 animate-pulse" />Year {selectedState?.year ?? ""}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {([
                      { key: "gini", label: "GINI Index", desc: "Lower is more equal" },
                      { key: "civic_trust", label: "Civic Trust", desc: "Higher is better" },
                      { key: "annual_emissions", label: "Emissions (Gt CO\u2082)", desc: "Lower is better" },
                      { key: "resilience_score", label: "Resilience", desc: "Higher is better" },
                      { key: "ai_influence", label: "AI Influence", desc: "Stability matters" },
                    ] as const).map((metric) => (
                      <TimelineMiniChart key={metric.key} data={timelineData} dataKey={metric.key} label={metric.label} description={metric.desc} color={METRIC_COLORS[metric.key]} currentYear={selectedState?.year} />
                    ))}
                  </div>
                </div>
              )}

              {/* Year scrubber + buttons */}
              <div className="mt-6 glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Scrub timeline</span>
                  <span className="font-mono text-lg font-semibold text-white">{selectedState?.year ?? "\u2014"}</span>
                </div>
                <input ref={sliderRef} type="range" min={0} max={Math.max(0, trajectory.length - 1)} value={yearIndex} onChange={(e) => handleYearChange(Number(e.target.value))} className="timeline-slider mt-3 w-full" />
                <div className="mt-1 flex justify-between text-xs text-slate-500">
                  <span>{trajectory[0]?.year ?? ""}</span>
                  <span>{trajectory[trajectory.length - 1]?.year ?? ""}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/5 pt-4">
                  <button onClick={generateSummary} disabled={summaryLoading || !selectedState} className="rounded-full bg-sky-500/10 px-5 py-2.5 text-sm font-semibold text-sky-300 ring-1 ring-sky-500/20 transition hover:bg-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                    {summaryLoading ? <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />Generating&hellip;</span> : `Generate report for ${selectedState?.year ?? "..."}`}
                  </button>
                  <button onClick={() => setSaveDialogOpen(true)} disabled={!selectedState || !compositeScore} className="rounded-full bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/20 transition hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                    Save to lab notes
                  </button>
                  <button onClick={handleExport} disabled={!selectedState || !compositeScore} className="rounded-full bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed">
                    Export .md
                  </button>
                  <p className="text-xs text-slate-500">Report uses one API call.</p>
                </div>
                {(summaryLoading || summary) && (
                  <div className="mt-4 border-t border-white/5 pt-4">
                    {/* Branch context header */}
                    {selectedRun && (
                      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                        <span className="text-xs font-bold text-white">Branch {selectedBranch + 1}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${currentTier.color} ${currentTier.bg} ${currentTier.ring}`}>{currentTier.label}</span>
                        <span className="text-[10px] text-slate-500">{branchLabel(selectedRun)}</span>
                        <span className="text-[10px] text-slate-500 ml-auto">Year {selectedState?.year ?? "\u2014"}</span>
                      </div>
                    )}
                    {summaryLoading && !summary && <div className="flex items-center gap-3 text-sm text-slate-400"><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />Generating AI report for Branch {selectedBranch + 1} ({currentTier.label})&hellip; this may take 20&ndash;30 seconds.</div>}
                    {summary && <SummaryBlock text={summary} />}
                  </div>
                )}

              </div>

              {/* Metric snapshot cards */}
              {selectedState && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {deltaCards.map((d) => <MetricCard key={d.key} label={d.label} value={d.key === "annual_emissions" ? d.current.toFixed(2) : d.current.toFixed(3)} delta={d.delta} good={d.good} color={d.color} description={METRIC_DESCRIPTIONS[d.key]} />)}
                </div>
              )}

              {/* Composite score */}
              {compositeScore !== null && selectedState && baselineState && (
                <div className="mt-6 glass-card rounded-2xl p-6">
                  <div className="flex flex-wrap items-center justify-between gap-6">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.4em] text-sky-400">Trajectory score</p>
                      <p className={`mt-1 text-lg font-semibold ${compositeScore.ratingColor}`}>{compositeScore.rating}</p>
                      <p className="mt-1 text-sm text-slate-400">Weighted average of 5 dimensions vs. {(baselineState as SnapshotState).year} baseline. Each metric is normalized to 0&ndash;100 and averaged equally.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-5xl font-bold text-white">{compositeScore.total}</p>
                      <p className="text-xs uppercase tracking-widest text-slate-500">out of 100</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${compositeScore.total}%`, background: `linear-gradient(90deg, ${compositeScore.total > 60 ? "#10b981" : compositeScore.total > 40 ? "#f59e0b" : "#f43f5e"}, ${compositeScore.total > 60 ? "#06b6d4" : compositeScore.total > 40 ? "#f59e0b" : "#f43f5e"})` }} />
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {compositeScore.components.map((c) => (
                      <div key={c.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{c.label}</p>
                          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                        </div>
                        <p className="mt-1 text-xl font-bold text-white">{c.score}</p>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.score}%`, backgroundColor: c.color, opacity: 0.7 }} /></div>
                        <p className="mt-2 text-[11px] leading-snug text-slate-500">{c.explanation}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-500">
                    <span><span className="text-red-400">0&ndash;34</span> Critical</span>
                    <span><span className="text-orange-400">35&ndash;49</span> Under stress</span>
                    <span><span className="text-amber-400">50&ndash;64</span> Mixed signals</span>
                    <span><span className="text-sky-400">65&ndash;79</span> Promising</span>
                    <span><span className="text-emerald-400">80&ndash;100</span> Thriving</span>
                  </div>
                </div>
              )}
            </section>

            {/* ============================================================ */}
            {/*  BRANCH COMPARISON OVERLAY                                    */}
            {/* ============================================================ */}
            <section className="mt-16">
              <SectionHeading badge="Overlay" title="Compare any two branches" subtitle="Select a second branch to overlay its trajectories against the current branch." />
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <label className="text-sm text-slate-400">Compare against:</label>
                <select className="rounded-xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-white transition focus:border-sky-500/50 focus:outline-none" value={compareBranch ?? ""} onChange={(e) => setCompareBranch(e.target.value === "" ? null : Number(e.target.value))}>
                  <option value="" className="bg-slate-900">None</option>
                  {runs.map((run, idx) => idx !== selectedBranch ? <option key={idx} value={idx} className="bg-slate-900">Branch {idx + 1}: {branchLabel(run)}</option> : null)}
                </select>
                {compareBranch !== null && <button onClick={() => setCompareBranch(null)} className="text-xs text-slate-500 hover:text-slate-300">Clear</button>}
              </div>
              {overlayData && compareBranch !== null && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {([
                    { a: "a_gini", b: "b_gini", label: "GINI Index", color: METRIC_COLORS.gini },
                    { a: "a_trust", b: "b_trust", label: "Civic Trust", color: METRIC_COLORS.civic_trust },
                    { a: "a_emissions", b: "b_emissions", label: "Emissions", color: METRIC_COLORS.annual_emissions },
                    { a: "a_resilience", b: "b_resilience", label: "Resilience", color: METRIC_COLORS.resilience_score },
                    { a: "a_ai", b: "b_ai", label: "AI Influence", color: METRIC_COLORS.ai_influence },
                  ] as const).map((cfg) => (
                    <ComparisonMiniChart key={cfg.label} data={overlayData} actionKey={cfg.a} inactionKey={cfg.b} label={cfg.label} color={cfg.color} currentYear={selectedState?.year} selectedLabel={`Branch ${selectedBranch + 1}`} contrastLabel={`Branch ${compareBranch + 1}`} />
                  ))}
                </div>
              )}
            </section>

            {/* ============================================================ */}
            {/*  ACTION VS INACTION COMPARISON                                */}
            {/* ============================================================ */}
            {contrastRun && comparisonData.length > 0 && comparisonHeading && (
              <section className="mt-16">
                <SectionHeading badge="Comparison" title={comparisonHeading.title} subtitle={comparisonHeading.subtitle} />
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {([
                    { action: "action_gini", inaction: "inaction_gini", label: "GINI Index", color: METRIC_COLORS.gini },
                    { action: "action_trust", inaction: "inaction_trust", label: "Civic Trust", color: METRIC_COLORS.civic_trust },
                    { action: "action_emissions", inaction: "inaction_emissions", label: "Emissions", color: METRIC_COLORS.annual_emissions },
                    { action: "action_resilience", inaction: "inaction_resilience", label: "Resilience", color: METRIC_COLORS.resilience_score },
                    { action: "action_ai", inaction: "inaction_ai", label: "AI Influence", color: METRIC_COLORS.ai_influence },
                  ] as const).map((cfg) => (
                    <ComparisonMiniChart key={cfg.label} data={comparisonData} actionKey={cfg.action} inactionKey={cfg.inaction} label={cfg.label} color={cfg.color} currentYear={selectedState?.year} selectedLabel={comparisonHeading.selectedLabel} contrastLabel={comparisonHeading.contrastLabel} />
                  ))}
                  {selectedState && contrastRun && <DivergenceSummary selectedState={selectedState} inactionState={contrastRun.trajectory[yearIndex] as SnapshotState | undefined} year={selectedState.year} contrastLabel={comparisonHeading.contrastLabel} />}
                </div>
              </section>
            )}

            {/* CLOSING CONTEXT */}
            <section className="mt-16 glass-card rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white">Bringing it back to now</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">The simulation is just a story unless we translate it into the present. Treat every real-world deployment as another iteration, with better logging and shorter feedback loops. Build the tooling that keeps branching paths legible&mdash;Transition OS, civic ledgers, public VPP dashboards. Document the playbooks so others can fork them.</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">We don&rsquo;t need infinite compute to reveal the future. We just need to notice the patterns that survive across every simulation, then act on them before the next branch begins.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <a href="https://github.com/reillyclawcode/transitionOS" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 transition hover:bg-emerald-500/10">
                  <span className="text-2xl">{"\u{1F6E0}\uFE0F"}</span>
                  <div><p className="text-sm font-semibold text-emerald-300">TransitionOS Dashboard</p><p className="text-xs text-slate-400">Workforce transitions, reskilling paths, and income bridge calculator</p></div>
                </a>
                <a href="https://reillyclawcode.github.io/clawcodeblog/research/ai-civilization/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 transition hover:bg-violet-500/10">
                  <span className="text-2xl">{"\u{1F4DC}"}</span>
                  <div><p className="text-sm font-semibold text-violet-300">AI Civilization Research Paper</p><p className="text-xs text-slate-400">The full theory, implementation roadmap, and policy framework</p></div>
                </a>
              </div>
            </section>
          </>
        )}

        <footer className="mt-16 border-t border-white/5 pt-8 text-center text-xs text-slate-600">
          &copy; 2026 Simulation Toolkit &middot; <a href={BLOG_URL} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300">Blog post</a> &middot; <a href="https://github.com/reillyclawcode/simulation" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300">GitHub</a> &middot; <a href="https://github.com/reillyclawcode/transitionOS" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300">TransitionOS</a> &middot; <a href="https://reillyclawcode.github.io/clawcodeblog/research/ai-civilization/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300">Research Paper</a> &middot; <a href="https://reillyclawcode.github.io/clawcodeblog/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300">Blog</a>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Stat({ value, label }: { value: string; label: string }) {
  return <div><span className="text-xl font-bold text-white">{value}</span>{" "}<span className="text-slate-500">{label}</span></div>;
}

function SectionHeading({ badge, title, subtitle }: { badge: string; title: string; subtitle: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-[0.4em] text-sky-400">{badge}</p>
      <h2 className="mt-2 text-2xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{subtitle}</p>
    </div>
  );
}

function MetricCard({ label, value, delta, good, color, description }: { label: string; value: string; delta: number; good: boolean; color: string; description: string }) {
  const arrow = delta === 0 ? "\u2192" : delta > 0 ? "\u2191" : "\u2193";
  return (
    <div className="glass-card rounded-xl p-4 transition-all hover:border-white/20">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <div className="mt-1 flex items-center gap-2"><span className={`text-xs font-medium ${good ? "text-emerald-400" : "text-amber-400"}`}>{arrow} {Math.abs(delta).toFixed(3)} vs baseline</span></div>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function TimelineMiniChart({ data, dataKey, label, description, color, currentYear }: { data: any[]; dataKey: string; label: string; description: string; color: string; currentYear?: number }) {
  const values = data.map((d) => d[dataKey] as number).filter((v) => v != null);
  const min = Math.min(...values); const max = Math.max(...values);
  const padding = (max - min) * 0.1 || 0.05;
  const startVal = values[0]; const endVal = values[values.length - 1]; const delta = endVal - startVal;
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p><p className="mt-0.5 text-[10px] text-slate-500">{description}</p></div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">{dataKey === "annual_emissions" ? endVal?.toFixed(1) : endVal?.toFixed(3)}</p>
          <p className="text-[10px] font-medium text-slate-400">{delta > 0 ? "\u2191" : delta < 0 ? "\u2193" : "\u2192"} {Math.abs(delta).toFixed(3)} over 50y</p>
        </div>
      </div>
      <div className="mt-3 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs><linearGradient id={`tl-grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.25} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis domain={[min - padding, max + padding]} tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#e2e8f0", fontSize: "11px" }} formatter={(value: number) => [dataKey === "annual_emissions" ? value.toFixed(2) + " Gt" : value.toFixed(4), label]} />
            {currentYear && <ReferenceLine x={currentYear} stroke="#38bdf8" strokeDasharray="3 3" strokeWidth={1} />}
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#tl-grad-${dataKey})`} strokeWidth={2} dot={false} name={label} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ComparisonMiniChart({ data, actionKey, inactionKey, label, color, currentYear, selectedLabel = "With action", contrastLabel = "Status quo" }: { data: any[]; actionKey: string; inactionKey: string; label: string; color: string; currentYear?: number; selectedLabel?: string; contrastLabel?: string }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs><linearGradient id={`grad-${label}-${selectedLabel}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.2} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#e2e8f0", fontSize: "11px" }} />
            {currentYear && <ReferenceLine x={currentYear} stroke="#38bdf8" strokeDasharray="3 3" strokeWidth={1} />}
            <Area type="monotone" dataKey={actionKey} stroke={color} fill={`url(#grad-${label}-${selectedLabel})`} strokeWidth={2} dot={false} name={selectedLabel} />
            <Area type="monotone" dataKey={inactionKey} stroke="#475569" fill="none" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name={contrastLabel} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-4 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-3 rounded-full" style={{ backgroundColor: color }} />{selectedLabel}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0 w-3 border-t border-dashed border-slate-500" />{contrastLabel}</span>
      </div>
    </div>
  );
}

function DivergenceSummary({ selectedState, inactionState, year, contrastLabel = "status quo" }: { selectedState: SnapshotState; inactionState?: SnapshotState; year: number; contrastLabel?: string }) {
  if (!inactionState) return null;
  const diffs: { label: string; val: number; goodDir: "up" | "down" }[] = [
    { label: "GINI", val: selectedState.economy.gini - inactionState.economy.gini, goodDir: "down" },
    { label: "Trust", val: selectedState.economy.civic_trust - inactionState.economy.civic_trust, goodDir: "up" },
    { label: "Emissions", val: selectedState.climate.annual_emissions - inactionState.climate.annual_emissions, goodDir: "down" },
    { label: "Resilience", val: selectedState.climate.resilience_score - inactionState.climate.resilience_score, goodDir: "up" },
  ];
  return (
    <div className="glass-card rounded-2xl p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Divergence at {year}</p>
      <p className="mt-1 text-xs text-slate-500">Selected branch vs {contrastLabel.toLowerCase()}</p>
      <div className="mt-4 space-y-3">
        {diffs.map((d) => {
          const good = d.goodDir === "up" ? d.val > 0 : d.goodDir === "down" ? d.val < 0 : Math.abs(d.val) < 0.05;
          return <div key={d.label} className="flex items-center justify-between text-sm"><span className="text-slate-400">{d.label}</span><span className={`font-mono font-semibold ${good ? "text-emerald-400" : "text-amber-400"}`}>{d.val > 0 ? "+" : ""}{d.val.toFixed(3)}</span></div>;
        })}
      </div>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  Summary block                                                      */
/* ------------------------------------------------------------------ */

function SummaryBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  type SectionKey = "summary" | "baseline" | "statusquo" | "actions" | "impact" | "ai" | "food" | "health" | "materials" | "quantum" | "civic" | "employment" | "energy" | "political" | "space" | "next" | null;
  const summaryParagraphs: string[] = [];
  const bullets: Record<Exclude<SectionKey, "summary" | null>, string[]> = { baseline: [], statusquo: [], actions: [], impact: [], ai: [], food: [], health: [], materials: [], quantum: [], civic: [], employment: [], energy: [], political: [], space: [], next: [] };
  const headingMap: Record<string, SectionKey> = { summary: "summary", "baseline comparison": "baseline", "status quo projection": "statusquo", "if we don't act": "statusquo", "without action": "statusquo", actions: "actions", impact: "impact", "ai influence": "ai", "food & biosystems": "food", "medicine & healthspan": "health", "materials & infrastructure": "materials", "quantum & compute": "quantum", "civic life & culture": "civic", "employment, economy & the wealth gap": "employment", "employment & economy": "employment", "energy & data infrastructure": "energy", "energy sources & data infrastructure": "energy", "energy & compute": "energy", "the political climate": "political", "political climate": "political", "governance": "political", "space colonies": "space", "space colonies: moon, mars & beyond": "space", "off-world": "space", "next steps": "next" };
  let section: SectionKey = null; let buf: string[] = [];
  const flush = () => { if (buf.length) { summaryParagraphs.push(buf.join(" ").trim()); buf = []; } };
  for (const raw of lines) {
    const trimmed = raw.trim();
    const h = trimmed.match(/^##\s+(.+)/i);
    if (h) { flush(); section = headingMap[h[1].trim().toLowerCase()] ?? null; continue; }
    if (!trimmed) { if (section === "summary") flush(); continue; }
    if (section === "summary") { buf.push(trimmed); continue; }
    if (section) { const arr = bullets[section]; if (trimmed.startsWith("- ")) arr.push(trimmed.replace(/^-\s*/, "")); else if (arr.length) arr[arr.length - 1] += " " + trimmed; }
  }
  flush();
  const sectionMeta: { key: Exclude<SectionKey, "summary" | null>; label: string; accent: string }[] = [
    { key: "baseline", label: "Baseline comparison", accent: "border-white/5" },
    { key: "statusquo", label: "Status quo projection \u2014 if we don\u2019t act", accent: "border-red-500/20" },
    { key: "actions", label: "Actions taken", accent: "border-sky-500/20" },
    { key: "impact", label: "Impact", accent: "border-emerald-500/20" },
    { key: "employment", label: "Employment, economy & the wealth gap", accent: "border-amber-400/20" },
    { key: "energy", label: "Energy sources & data infrastructure", accent: "border-sky-400/20" },
    { key: "political", label: "The political climate", accent: "border-violet-400/20" },
    { key: "space", label: "Space colonies: Moon, Mars & beyond", accent: "border-emerald-400/20" },
    { key: "ai", label: "AI influence", accent: "border-violet-500/20" },
    { key: "food", label: "Food & biosystems", accent: "border-lime-400/20" },
    { key: "health", label: "Medicine & healthspan", accent: "border-rose-400/20" },
    { key: "materials", label: "Materials & infrastructure", accent: "border-cyan-400/20" },
    { key: "quantum", label: "Quantum & compute", accent: "border-indigo-400/20" },
    { key: "civic", label: "Civic life & culture", accent: "border-amber-400/20" },
    { key: "next", label: "Next steps", accent: "border-sky-500/20" },
  ];
  return (
    <div className="space-y-5">
      {summaryParagraphs.length > 0 && <div className="space-y-3">{summaryParagraphs.map((p, i) => <p key={i} className="text-sm leading-relaxed text-slate-200">{p}</p>)}</div>}
      {sectionMeta.map(({ key, label, accent }) => { const items = bullets[key]; if (!items.length) return null; return (
        <div key={key} className={`rounded-xl border ${accent} bg-white/[0.02] p-4`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-300">{items.map((line, i) => <li key={i}>{line}</li>)}</ul>
        </div>
      ); })}
    </div>
  );
}
