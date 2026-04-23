import React, { useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import AppPage from "../components/shell/AppPage.jsx";
import PageHeader from "../components/shell/PageHeader.jsx";
import { Brain, Sparkles, Download } from "lucide-react";

const DOMAINS = [
  { id: "py", name: "Python" },
  { id: "data", name: "Data & logic" },
  { id: "web", name: "Web concepts" },
];

const radarMock = [
  { skill: "Concepts", a: 78 },
  { skill: "Practice", a: 62 },
  { skill: "Speed", a: 55 },
  { skill: "Accuracy", a: 71 },
  { skill: "Explanations", a: 64 },
];

const Skill = () => {
  const [domain, setDomain] = useState("py");
  const [answer, setAnswer] = useState("");

  return (
    <AppPage>
      <PageHeader
        title="Skill gap"
        description="Assess a topic, answer a prompt, and review where to focus next. (Demo UI — connect your model when ready.)"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800">
            <Sparkles className="h-3.5 w-3.5" />
            Self-review
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card-elevated p-6 sm:p-8">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Brain className="h-5 w-5 text-indigo-500" />
            Start assessment
          </h2>

          <div className="mb-6 flex flex-wrap gap-3">
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="input-brand max-w-xs py-2.5 text-sm"
            >
              {DOMAINS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select className="input-brand max-w-xs py-2.5 text-sm" defaultValue="quick">
              <option value="quick">Quick (5 items)</option>
              <option value="deep">Deep (more prompts)</option>
            </select>
            <button type="button" className="btn-brand py-2.5 text-sm">
              Start
            </button>
          </div>

          <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full w-2/5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
            />
          </div>
          <p className="mb-6 text-right text-xs text-slate-400">Step 1 of 3 (sample)</p>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:p-5">
            <p className="text-sm font-medium text-slate-900">
              Q1: In one or two sentences, how would you explain a list comprehension
              in {DOMAINS.find((d) => d.id === domain)?.name}?
            </p>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              className="input-brand mt-3 resize-y text-sm"
              placeholder="Type your answer here…"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-brand py-2 text-sm">
                Submit
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Skip
              </button>
            </div>
          </div>

          <p className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 text-sm text-amber-950/90">
            <span className="font-semibold">AI hint:</span> try comparing a comprehension to
            a small explicit loop in your own words.
          </p>
        </section>

        <aside className="space-y-4">
          <div className="card-elevated p-5">
            <h3 className="text-sm font-semibold text-slate-900">Your snapshot</h3>
            <p className="mt-1 text-xs text-slate-500">Illustrative levels by dimension</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center justify-between text-slate-600">
                <span>Core concepts</span>
                <span className="font-semibold text-indigo-600">78%</span>
              </li>
              <li className="flex items-center justify-between text-slate-600">
                <span>Drills & speed</span>
                <span className="font-semibold text-violet-600">55%</span>
              </li>
              <li className="flex items-center justify-between text-slate-600">
                <span>Explanations</span>
                <span className="font-semibold text-fuchsia-600">64%</span>
              </li>
            </ul>
          </div>

          <div className="card-elevated p-2">
            <div className="h-[220px] w-full p-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarMock} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar
                    name="You"
                    dataKey="a"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="px-3 pb-3">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Export summary (demo)
              </button>
            </div>
          </div>
        </aside>
      </div>
    </AppPage>
  );
};

export default Skill;
