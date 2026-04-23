import React from "react";
import AppPage from "../components/shell/AppPage.jsx";
import PageHeader from "../components/shell/PageHeader.jsx";
import { Link } from "react-router-dom";
import { Trophy, Flame, Target, Sparkles, ArrowRight, Lock } from "lucide-react";

const MILESTONES = [
  {
    title: "First document",
    desc: "Upload a PDF to your library.",
    done: true,
    icon: "📄",
  },
  {
    title: "Flashcard streak",
    desc: "Review 3 flashcard sessions.",
    done: true,
    icon: "🃏",
  },
  {
    title: "Quiz excellence",
    desc: "Score 90%+ on a quiz from your material.",
    done: false,
    icon: "🎯",
  },
];

const CHALLENGES = [
  { label: "Complete 1 quiz this week", pts: 100 },
  { label: "Open the AI assistant 5 times", pts: 80 },
  { label: "Revisit a document 3 days in a row", pts: 120 },
];

const AchievementPage = () => {
  return (
    <AppPage>
      <PageHeader
        title="Achievements"
        description="Milestones and challenges for your own progress — not a public leaderboard."
        action={
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            See activity
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="card-elevated p-5 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Points (demo)
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-900">1,250</p>
        </div>
        <div className="card-elevated p-5 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Streak
          </p>
          <p className="mt-1 flex items-center justify-center gap-1 text-3xl font-bold text-orange-500 sm:justify-start">
            <Flame className="h-7 w-7" />
            4 days
          </p>
        </div>
        <div className="card-elevated p-5 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Goals
          </p>
          <p className="mt-1 text-3xl font-bold text-indigo-600">2 / 3</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-elevated p-6 sm:p-8">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Trophy className="h-5 w-5 text-amber-500" />
            Milestones
          </h2>
          <p className="text-sm text-slate-500">Unlock these as you use LearnLab.</p>
          <ul className="mt-6 space-y-3">
            {MILESTONES.map((m) => (
              <li
                key={m.title}
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  m.done
                    ? "border-emerald-200/80 bg-emerald-50/40"
                    : "border-slate-100 bg-slate-50/50"
                }`}
              >
                <span className="text-2xl" aria-hidden>
                  {m.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-slate-900">{m.title}</h3>
                    {m.done ? (
                      <Sparkles className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Lock className="h-4 w-4 shrink-0 text-slate-300" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{m.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card-elevated p-6 sm:p-8">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Target className="h-5 w-5 text-rose-500" />
            Weekly challenges
          </h2>
          <p className="text-sm text-slate-500">Small wins that keep you moving.</p>
          <ul className="mt-6 space-y-2">
            {CHALLENGES.map((c) => (
              <li
                key={c.label}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm"
              >
                <span className="text-slate-700">{c.label}</span>
                <span className="shrink-0 font-semibold text-indigo-600">+{c.pts} pts</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppPage>
  );
};

export default AchievementPage;
