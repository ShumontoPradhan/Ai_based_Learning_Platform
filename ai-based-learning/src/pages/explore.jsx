import React from "react";
import { Link } from "react-router-dom";
import AppPage from "../components/shell/AppPage.jsx";
import PageHeader from "../components/shell/PageHeader.jsx";
import {
  FileText,
  MessageSquare,
  BookOpen,
  BrainCircuit,
  BarChart3,
  Layers,
  ArrowUpRight,
} from "lucide-react";

const FEATURES = [
  {
    title: "Documents",
    desc: "Upload PDFs, read, summarize, and generate flashcards or quizzes from your material.",
    to: "/documents",
    icon: FileText,
  },
  {
    title: "AI assistant",
    desc: "Ask questions about your studies and get explanations in plain language.",
    to: "/ai-assistant",
    icon: MessageSquare,
  },
  {
    title: "Flashcards",
    desc: "Review decks built from your documents to lock in key ideas.",
    to: "/flashcards",
    icon: BookOpen,
  },
  {
    title: "Quizzes",
    desc: "Practice with quizzes from your uploads and track progress.",
    to: "/documents",
    icon: BrainCircuit,
  },
  {
    title: "Performance",
    desc: "Visualize trends and balance across skills (demo charts).",
    to: "/performance",
    icon: BarChart3,
  },
  {
    title: "Skill gap",
    desc: "Reflect on strengths and focus areas in a dedicated workspace.",
    to: "/skill-gap",
    icon: Layers,
  },
];

const Explore = () => {
  return (
    <AppPage>
      <PageHeader
        title="Explore"
        description="Every tile opens a real feature in LearnLab. Your material and progress stay yours."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ title, desc, to, icon: Icon }) => (
          <Link
            key={title}
            to={to}
            className="group card-elevated flex flex-col p-5 transition hover:border-indigo-200/80 hover:shadow-2xl hover:shadow-indigo-200/20"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-indigo-500" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-500">{desc}</p>
            <span className="mt-4 text-xs font-bold uppercase tracking-wide text-indigo-600">
              Open
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="card-elevated p-6">
          <h3 className="text-sm font-semibold text-slate-900">Get started</h3>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-slate-600">
            <li>
              <Link to="/documents" className="font-medium text-indigo-600 hover:underline">
                Upload a document
              </Link>{" "}
              (PDF).
            </li>
            <li>
              Open the{" "}
              <Link to="/ai-assistant" className="font-medium text-indigo-600 hover:underline">
                AI assistant
              </Link>{" "}
              when you need a hint.
            </li>
            <li>
              Check the{" "}
              <Link to="/dashboard" className="font-medium text-indigo-600 hover:underline">
                Dashboard
              </Link>{" "}
              for live stats and activity.
            </li>
          </ol>
        </div>
        <div className="rounded-2xl border border-dashed border-indigo-200/80 bg-indigo-50/40 p-6">
          <h3 className="text-sm font-semibold text-indigo-950">Tips</h3>
          <ul className="mt-2 space-y-2 text-sm text-indigo-900/80">
            <li>· Smaller PDFs run faster for AI features.</li>
            <li>· Revisit flashcards after a quiz to fix weak spots.</li>
            <li>· Use Focus mode when you need zero distractions.</li>
          </ul>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        <Link to="/settings" className="text-indigo-500 hover:underline">
          Account settings
        </Link>
      </p>
    </AppPage>
  );
};

export default Explore;
