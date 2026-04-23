import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Spinner from "../components/common/spinner";
import AppPage from "../components/shell/AppPage.jsx";
import PageHeader from "../components/shell/PageHeader.jsx";
import progressService from "../services/progress_services";
import toast from "react-hot-toast";
import { FileText, BookOpen, BrainCircuit, TrendingUp, Clock } from "lucide-react";

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await progressService.getDashboardData();
        setDashboardData(data.data);
      } catch {
        toast.error("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return <Spinner />;
  }

  if (!dashboardData || !dashboardData.overview) {
    return (
      <AppPage>
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <TrendingUp className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">No dashboard data yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Upload a document or take a quiz to populate stats.
          </p>
          <Link to="/documents" className="btn-brand mt-6">
            Go to documents
          </Link>
        </div>
      </AppPage>
    );
  }

  const stats = [
    {
      label: "Total Documents",
      value: dashboardData.overview.totalDocuments,
      icon: FileText,
      gradient: "from-blue-400 to-cyan-600",
      shadowColor: "shadow-blue-500/25",
    },
    {
      label: "Total Flashcards",
      value: dashboardData.overview.totalFlashcards,
      icon: BookOpen,
      gradient: "from-purple-400 to-pink-600",
      shadowColor: "shadow-purple-500/25",
    },
    {
      label: "Total Quizzes",
      value: dashboardData.overview.totalQuizes,
      icon: BrainCircuit,
      gradient: "from-green-400 to-emerald-600",
      shadowColor: "shadow-green-500/25",
    },
  ];

  return (
    <AppPage>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-[length:16px_16px] opacity-30" />
      <PageHeader
        title="Dashboard"
        description="Track documents, flashcards, quizzes, and what you have opened recently."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="group relative rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-slate-300/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {stat.label}
              </span>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} ${stat.shadowColor} transition-transform duration-300 group-hover:scale-110`}
              >
                <stat.icon className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
            </div>
            <div className="text-3xl font-semibold tracking-tight text-slate-900">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200/60 bg-white/80 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-orange-600">
            <Clock className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <h3 className="text-xl font-medium tracking-tight text-slate-900">Recent activity</h3>
        </div>

        {dashboardData.recentActivity &&
        (dashboardData.recentActivity.documents.length > 0 ||
          dashboardData.recentActivity.quizzes.length > 0) ? (
          <div className="space-y-3">
            {[
              ...(dashboardData.recentActivity.documents || []).map((doc) => ({
                id: doc._id,
                description: doc.title,
                timestamp: doc.lastAccessed,
                link: `/documents/${doc._id}`,
                type: "document",
              })),
              ...(dashboardData.recentActivity.quizzes || []).map((quiz) => ({
                id: quiz._id,
                description: quiz.title,
                timestamp: quiz.lastAttempted,
                link: `/quizzes/${quiz._id}`,
                type: "quiz",
              })),
            ]
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .map((activity, index) => (
                <div
                  key={activity.id || index}
                  className="group flex items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 transition-all duration-200 hover:border-slate-300/60 hover:bg-white hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          activity.type === "document"
                            ? "bg-gradient-to-r from-blue-400 to-cyan-500"
                            : "bg-gradient-to-r from-emerald-400 to-teal-500"
                        }`}
                      />
                      <p className="truncate text-sm font-medium text-slate-900">
                        {activity.type === "document" ? "Document" : "Quiz"}:{" "}
                        <span className="text-slate-700">{activity.description}</span>
                      </p>
                    </div>
                    <p className="pl-4 text-xs text-slate-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {activity.link && (
                    <Link
                      to={activity.link}
                      className="ml-4 flex items-center gap-1 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-800"
                    >
                      Open
                    </Link>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Clock className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600">No recent activity yet.</p>
            <p className="mt-1 text-xs text-slate-500">Start learning to see your activity here.</p>
          </div>
        )}
      </div>
    </AppPage>
  );
}
