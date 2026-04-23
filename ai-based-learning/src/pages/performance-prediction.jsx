import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, TrendingUp, Target, Activity, BarChart3 } from "lucide-react";
import AppPage from "../components/shell/AppPage.jsx";
import PageHeader from "../components/shell/PageHeader.jsx";
import { Link } from "react-router-dom";

export default function PerformancePrediction() {
  const weeklyData = [
    { week: "W1", score: 65 },
    { week: "W2", score: 72 },
    { week: "W3", score: 78 },
    { week: "W4", score: 84 },
    { week: "W5", score: 90 },
  ];

  const skillRadar = [
    { skill: "Theory", level: 85 },
    { skill: "Practice", level: 70 },
    { skill: "Focus", level: 65 },
    { skill: "Retrieval", level: 80 },
    { skill: "Explanations", level: 75 },
  ];

  const consistency = 88;

  const aiInsights = [
    {
      title: "Projected lift",
      value: "+14%",
      desc: "Illustrative trend if study rhythm continues",
      color: "text-emerald-600",
      icon: <TrendingUp className="text-emerald-500" size={22} />,
    },
    {
      title: "Focus area",
      value: "Strategy",
      desc: "Where an extra block of practice helps most (demo data)",
      color: "text-indigo-600",
      icon: <Target className="text-indigo-500" size={22} />,
    },
    {
      title: "Session consistency",
      value: `${consistency}%`,
      desc: "Time-on-task this month (sample metric)",
      color: "text-sky-600",
      icon: <Activity className="text-sky-500" size={22} />,
    },
  ];

  return (
    <AppPage>
      <PageHeader
        title="Performance"
        description="Visualize study momentum and balance across skills. Data below is a polished demo — connect your analytics API for live numbers."
        action={
          <span className="inline-flex items-center gap-1.5 text-indigo-600">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-medium">Demo insights</span>
          </span>
        }
      />

      <div className="mb-2 flex items-center gap-2 text-amber-800">
        <Brain className="h-5 w-5 text-indigo-500" />
        <p className="text-sm text-slate-600">
          Pair this view with <Link to="/dashboard" className="font-semibold text-indigo-600 hover:underline">Dashboard</Link> for
          your real document and quiz activity.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3"
      >
        {aiInsights.map((insight, i) => (
          <Card
            key={i}
            className="card-elevated border-0 bg-white/90 shadow-xl shadow-slate-200/40 transition hover:shadow-2xl"
          >
            <CardContent className="flex items-start gap-3 p-5">
              {insight.icon}
              <div>
                <h3 className="text-sm font-medium text-slate-500">{insight.title}</h3>
                <p className={`text-2xl font-bold ${insight.color}`}>{insight.value}</p>
                <p className="text-sm text-slate-500">{insight.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="card-elevated border-slate-200/80">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Weekly trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#6366f1" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-elevated border-slate-200/80">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Skill balance</h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillRadar}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: "#64748b" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="Level"
                  dataKey="level"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.4}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="card-elevated lg:col-span-1">
          <CardContent className="p-6">
            <h2 className="mb-2 text-lg font-semibold text-slate-900">Consistency</h2>
            <p className="mb-4 text-sm text-slate-600">
              You have been in-session for about{" "}
              <span className="font-semibold text-indigo-600">{consistency}%</span> of
              scheduled study windows (sample).
            </p>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                initial={{ width: 0 }}
                animate={{ width: `${consistency}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated border-indigo-100/80 bg-gradient-to-br from-indigo-50/90 via-violet-50/50 to-white lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Brain className="h-5 w-5 text-indigo-500" />
              Narrative summary
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-slate-700">
              This panel is a template for a future model: combine quiz scores, time on
              documents, and AI chat usage to surface one clear story per week.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/skill-gap"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                Open skill gap
              </Link>
              <Link
                to="/documents"
                className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
              >
                Study materials
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppPage>
  );
}
