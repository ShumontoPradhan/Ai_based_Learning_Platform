import React from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, TrendingUp, Target, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BiBorderOuter, BiBorderRadius } from "react-icons/bi";

export default function PerformancePrediction({ shrink }) {
  const weeklyData = [
    { week: "W1", score: 65 },
    { week: "W2", score: 72 },
    { week: "W3", score: 78 },
    { week: "W4", score: 84 },
    { week: "W5", score: 90 },
  ];

  const skillRadar = [
    { skill: "Coding", level: 85 },
    { skill: "Design", level: 70 },
    { skill: "Strategy", level: 65 },
    { skill: "Teamwork", level: 80 },
    { skill: "Analysis", level: 75 },
  ];

  const consistency = 88;

  const aiInsights = [
    {
      title: "Next Week Improvement",
      value: "+14%",
      desc: "AI predicts steady upward trend",
      color: "text-green-500",
      icon: <TrendingUp className="text-green-500" size={22} />,
    },
    {
      title: "Focus Skill Area",
      value: "Strategy",
      desc: "Potential 18% gain if practiced",
      color: "text-indigo-500",
      icon: <Target className="text-indigo-500" size={22} />,
    },
    {
      title: "Consistency",
      value: `${consistency}%`,
      desc: "Maintain above 80% for optimal growth",
      color: "text-blue-500",
      icon: <Activity className="text-blue-500" size={22} />,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8 text-gray-800"
    style={{paddingLeft: shrink ? "100px" : "260px",
      transition: "padding-left 0.3s ease",
      marginTop: "40px",
      
    }}>
      <header className="header">
          <span className="title"> <Brain className="text-indigo-500" />Performance Prediction</span>
          <div className="subtitle">
            Monitor your performance through ai visualization!!
          </div>
          </header>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between mb-8"
      >
        
        
      </motion.div>

      {/* Overview Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        {aiInsights.map((insight, i) => (
          <Card
            key={i}
            className="shadow-md border border-slate-200 hover:shadow-lg transition-all bg-white/80 backdrop-blur-sm"
          >
            <CardContent className="p-5 flex items-start gap-3">
              {insight.icon}
              <div>
                <h3 className="font-semibold">{insight.title}</h3>
                <p className={`text-2xl font-bold ${insight.color}`}>
                  {insight.value}
                </p>
                <p className="text-sm text-gray-500">{insight.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <Card className="shadow-md border-slate-200">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Weekly Progress</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
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

        {/* Radar Chart */}
        <Card className="shadow-md border-slate-200">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Skill Development Radar</h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillRadar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="skill" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar
                  name="Skill Level"
                  dataKey="level"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.5}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Consistency & AI Insight Section */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consistency Tracker */}
        <Card className="lg:col-span-1 shadow-md border-slate-200">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-3">Consistency Tracker</h2>
            <p className="text-gray-600 mb-4">
              You’ve been consistent for{" "}
              <span className="font-semibold text-indigo-600">{consistency}%</span>{" "}
              of the time this month. Keep this up to unlock predictive accuracy gains.
            </p>
            <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden">
              <motion.div
                className="bg-indigo-500 h-4"
                initial={{ width: 0 }}
                animate={{ width: `${consistency}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="lg:col-span-2 shadow-md border-slate-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-slate-50">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <Brain className="text-indigo-500" /> AI Predicted Analysis
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Based on your recent learning velocity and engagement trends, 
              our AI model forecasts a{" "}
              <span className="font-semibold text-green-600">+14% performance increase</span>{" "}
              next cycle. Strategic thinking and consistency remain your key accelerators.
            </p>
            <div className="flex items-center gap-4">
              <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
                View Deep Analysis
              </Button>
              <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
                Export Report
              </Button>
              <Button variant="outline">Compare with Peers</Button>         
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
