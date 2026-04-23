import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../store/authContext.jsx";
import {
  Search,
  Sparkles,
  LayoutDashboard,
  FileText,
  MessageSquare,
  BookOpen,
  ArrowRight,
  Clock,
  BrainCircuit,
  Settings,
  TrendingUp,
} from "lucide-react";
import Spinner from "../components/common/spinner";
import progressService from "../services/progress_services";
import toast from "react-hot-toast";

const QUICK_ACTIONS = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    description: "Progress and activity",
  },
  {
    label: "Documents",
    to: "/documents",
    icon: FileText,
    description: "Study materials",
  },
  {
    label: "AI Assistant",
    to: "/ai-assistant",
    icon: MessageSquare,
    description: "Ask questions",
  },
  {
    label: "Flashcards",
    to: "/flashcards",
    icon: BookOpen,
    description: "Review decks",
  },
];

function displayNameFromUser(user) {
  if (!user) return "there";
  const u = user.username?.trim();
  if (u) return u;
  const email = user.email?.trim();
  if (email) return email.split("@")[0] || "there";
  return "there";
}

export default function Home() {
  const { user } = useAuth();
  const displayName = displayNameFromUser(user);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await progressService.getDashboardData();
        if (!cancelled) setDashboardData(res.data);
      } catch {
        if (!cancelled) {
          toast.error("Could not load your overview");
          setDashboardData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activities = useMemo(() => {
    if (!dashboardData?.recentActivity) return [];
    const docs = (dashboardData.recentActivity.documents || []).map((doc) => ({
      id: doc._id,
      description: doc.title,
      timestamp: doc.lastAccessed,
      link: `/documents/${doc._id}`,
      type: "document",
    }));
    const quizzes = (dashboardData.recentActivity.quizzes || []).map(
      (quiz) => ({
        id: quiz._id,
        description: quiz.title,
        timestamp: quiz.lastAttempted,
        link: `/quizzes/${quiz._id}`,
        type: "quiz",
      })
    );
    return [...docs, ...quizzes].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [dashboardData]);

  const overview = dashboardData?.overview;

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="home-root min-h-[calc(100vh-70px)] w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 px-4 pb-12 pt-2 sm:px-6 lg:px-8">
      <div
        className="home-page mx-auto grid max-w-[1200px] grid-cols-1 gap-6 lg:grid-cols-[1fr_280px] lg:items-start lg:gap-8"
        role="main"
      >
        <div className="home-main flex min-w-0 flex-col gap-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Home
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Continue learning with your documents, quizzes, and AI help.
              </p>
            </div>
            <Link
              to="/documents"
              className="inline-flex w-full max-w-md items-center gap-2 rounded-2xl border border-slate-200/80 bg-white py-2.5 pl-4 pr-4 text-sm text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-slate-900"
            >
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span>Browse and search your documents</span>
              <ArrowRight className="ml-auto h-4 w-4 text-slate-400" aria-hidden />
            </Link>
          </header>

          <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-violet-400/10 blur-3xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
              <div className="min-w-0 flex-1 space-y-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Welcome back
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Hello, {displayName}
                </h2>
                <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                  Upload study materials, generate flashcards and quizzes, and
                  use the AI assistant when you get stuck.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to="/documents"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-700"
                  >
                    Go to documents
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <Link
                    to="/ai-assistant"
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    AI assistant
                  </Link>
                </div>
              </div>
              <div className="relative mx-auto w-full max-w-[320px] shrink-0 overflow-hidden rounded-2xl border border-slate-100 shadow-md lg:mx-0 lg:max-w-[260px]">
                <img
                  src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop"
                  alt="Study and collaboration"
                  className="h-[150px] w-full object-cover sm:h-[170px]"
                />
              </div>
            </div>
          </section>

          <section aria-label="Quick actions">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Quick actions
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {QUICK_ACTIONS.map(({ label, to, icon: Icon, description }) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <span className="font-semibold text-slate-900">{label}</span>
                  <span className="text-xs text-slate-500">{description}</span>
                </Link>
              ))}
            </div>
          </section>

          {overview ? (
            <section aria-label="Your overview">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Your numbers
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      Documents
                    </span>
                    <FileText className="h-5 w-5 text-indigo-500" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {overview.totalDocuments ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      Flashcards
                    </span>
                    <BookOpen className="h-5 w-5 text-violet-500" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {overview.totalFlashcards ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      Quizzes
                    </span>
                    <BrainCircuit className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {overview.totalQuizes ?? 0}
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <section
              className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center"
              aria-label="Overview unavailable"
            >
              <p className="text-sm text-slate-600">
                Overview could not be loaded. You can still use all features
                from the sidebar.
              </p>
              <Link
                to="/dashboard"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600"
              >
                Open dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          )}

          <section
            className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
            aria-label="Recent activity"
          >
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                <Clock className="h-4 w-4 text-amber-700" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Recent activity
              </h3>
            </div>
            {activities.length > 0 ? (
              <ul className="space-y-2">
                {activities.slice(0, 6).map((a) => (
                  <li
                    key={`${a.type}-${a.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-slate-800">
                        {a.type === "document" ? "Document" : "Quiz"}:{" "}
                      </span>
                      <span className="text-slate-600">{a.description}</span>
                      <p className="text-xs text-slate-500">
                        {a.timestamp
                          ? new Date(a.timestamp).toLocaleString()
                          : ""}
                      </p>
                    </div>
                    {a.link && (
                      <Link
                        to={a.link}
                        className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Open
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                No recent activity yet. Open a document or take a quiz to see
                it here.
              </p>
            )}
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Shortcuts</h3>
            <p className="mt-1 text-xs text-slate-500">
              Frequent pages in this app
            </p>
            <ul className="mt-4 space-y-1 text-sm">
              <li>
                <Link
                  to="/assignment"
                  className="block rounded-lg px-2 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Assignments
                </Link>
              </li>
              <li>
                <Link
                  to="/performance"
                  className="block rounded-lg px-2 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Performance
                </Link>
              </li>
              <li>
                <Link
                  to="/skill-gap"
                  className="block rounded-lg px-2 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Skill gap
                </Link>
              </li>
              <li>
                <Link
                  to="/focus-mode"
                  className="block rounded-lg px-2 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Focus mode
                </Link>
              </li>
              <li>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-slate-700 hover:bg-slate-50"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
            <div className="mb-1 flex items-center gap-2 text-indigo-900">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-semibold">Track progress</span>
            </div>
            <p className="text-xs leading-relaxed text-indigo-900/80">
              Charts and activity history are on the dashboard and performance
              pages.
            </p>
            <Link
              to="/dashboard"
              className="mt-3 inline-flex text-xs font-semibold text-indigo-700 hover:underline"
            >
              View dashboard →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
