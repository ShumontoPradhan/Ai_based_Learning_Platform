import React, { useEffect, useState } from "react";
import Spinner from "../components/common/spinner";
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
      } catch (error) {
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

  // ✅ FIXED CONDITION
  if (!dashboardData || !dashboardData.overview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
            <TrendingUp className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-sm text-slate-600">No Dashboard Data Available</p>
        </div>
      </div>
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

  const activities = [
    ...(dashboardData.recentActivity?.documents || []).map((doc) => ({
      id: doc._id,
      description: doc.title,
      timestamp: doc.lastAccessed,
      link: `/documents/${doc._id}`,
      type: "document",
    })),
    ...(dashboardData.recentActivity?.quizzes || []).map((quiz) => ({
      id: quiz._id,
      description: quiz.title,
      timestamp: quiz.lastAttempted,
      link: `/quizzes/${quiz._id}`,
      type: "quiz",
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-500">Track your learning progress and activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="p-4 rounded-xl shadow bg-white flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.gradient} ${stat.shadowColor} flex items-center justify-center`}>
              <stat.icon className="text-white" strokeWidth={2} />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock />
          <h3 className="text-lg font-semibold">Recent Activity</h3>
        </div>

        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div key={activity.id || index} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="text-sm">
                    {activity.type === "document" ? "Document Accessed: " : "Quiz Attempted: "}
                    <span className="font-medium">{activity.description}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>

                {activity.link && (
                  <a href={activity.link} className="text-sm text-blue-500 hover:underline">
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-400">
            <p>No recent activity yet.</p>
            <p className="text-sm">Start learning to see your activity here.</p>
          </div>
        )}
      </div>

    </div>
  );
}