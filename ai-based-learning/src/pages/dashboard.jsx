import React from "react";
import {
  Sparkles,
  ArrowUpRight,
  Brain,
  TrendingUp,
  Clock,
  BookOpen,
} from "lucide-react";

export default function DashboardPage() {
  const stats = [
    {
      label: "Documents",
      value: 12,
      icon: BookOpen,
      trend: "+3 this week",
    },
    {
      label: "AI Chats",
      value: 84,
      icon: Brain,
      trend: "+12 today",
    },
    {
      label: "Quizzes Taken",
      value: 19,
      icon: TrendingUp,
      trend: "+4 this week",
    },
  ];

  const skills = [
    { name: "Web Development", score: 42 },
    { name: "Data Structures", score: 78 },
    { name: "Algorithms", score: 66 },
    { name: "Machine Learning", score: 51 },
  ];

  const schedule = [
    { title: "AI Revision", time: "09:30 – 10:15" },
    { title: "DSA Practice", time: "11:00 – 12:00" },
    { title: "Project Work", time: "15:00 – 16:30" },
  ];

  return (
    <div className="space-y-10 pt-6">
      {/* Page Title */}
      <section>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Your AI-powered learning overview
        </p>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map(({ label, value, icon: Icon, trend }) => (
          <div
            key={label}
            className="
              rounded-2xl p-6
              bg-white dark:bg-zinc-900
              border border-zinc-200 dark:border-white/10
              shadow-sm
            "
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {label}
                </p>
                <p className="text-2xl font-semibold text-zinc-900 dark:text-white mt-1">
                  {value}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
                <Icon size={20} />
              </div>
            </div>
            <p className="text-xs text-emerald-600 mt-3">{trend}</p>
          </div>
        ))}
      </section>

      {/* Main Grid */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left */}
        <div className="xl:col-span-2 space-y-8">
          {/* AI Insight */}
          <div className="
            rounded-2xl p-6
            bg-gradient-to-br from-indigo-600 to-violet-600
            text-white
          ">
            <div className="flex items-center gap-2">
              <Sparkles size={18} />
              <h2 className="font-semibold">AI Insight</h2>
            </div>

            <p className="mt-3 text-sm leading-relaxed max-w-xl text-indigo-100">
              Your performance in Web Development is lagging behind your overall
              progress. Strengthen fundamentals before moving to frameworks.
            </p>

            <button
              className="
                mt-5 inline-flex items-center gap-2
                bg-white/20 hover:bg-white/30
                px-4 py-2 rounded-xl text-sm font-medium
                transition
              "
            >
              Start Revision
              <ArrowUpRight size={14} />
            </button>
          </div>

          {/* Skill Progress */}
          <div className="
            rounded-2xl p-6
            bg-white dark:bg-zinc-900
            border border-zinc-200 dark:border-white/10
          ">
            <h2 className="font-semibold text-zinc-900 dark:text-white mb-6">
              Skill Progress
            </h2>

            <div className="space-y-4">
              {skills.map((skill) => (
                <div key={skill.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {skill.name}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {skill.score}%
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className="h-2 rounded-full bg-indigo-500"
                      style={{ width: `${skill.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-8">
          {/* Schedule */}
          <div className="
            rounded-2xl p-6
            bg-white dark:bg-zinc-900
            border border-zinc-200 dark:border-white/10
          ">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} />
              <h2 className="font-semibold text-zinc-900 dark:text-white">
                Today’s Plan
              </h2>
            </div>

            <ul className="space-y-4">
              {schedule.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {item.title}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {item.time}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Continue Learning */}
          <div className="
            rounded-2xl p-6
            bg-zinc-900 text-white
          ">
            <h3 className="font-semibold">Continue Learning</h3>
            <p className="text-sm text-zinc-300 mt-1">
              Resume your last AI-assisted session.
            </p>
            <button
              className="
                mt-4 w-full
                bg-indigo-500 hover:bg-indigo-600
                py-2 rounded-xl text-sm font-medium
                transition
              "
            >
              Open AI Assistant
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
