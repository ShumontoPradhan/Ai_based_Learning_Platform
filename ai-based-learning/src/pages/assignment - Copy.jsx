import React, { useState } from "react";
import { useAuth } from "../store/authContext.jsx";
import AppPage from "../components/shell/AppPage.jsx";
import PageHeader from "../components/shell/PageHeader.jsx";
import {
  ClipboardList,
  Calendar,
  CheckCircle2,
  Clock,
  FileUp,
  Send,
} from "lucide-react";

const INITIAL = [
  {
    id: 1,
    title: "Problem set — algorithms",
    due: "Due in 5 days",
    status: "pending",
  },
  {
    id: 2,
    title: "Short essay — AI in education",
    due: "Submitted",
    status: "submitted",
  },
  {
    id: 3,
    title: "Lab reflection",
    due: "Due in 12 days",
    status: "pending",
  },
];

const AssignmentSubmission = () => {
  const { user } = useAuth();
  const [assignments] = useState(INITIAL);
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");

  const name =
    user?.username?.trim() || user?.email?.split("@")[0] || "Learner";

  return (
    <AppPage>
      <PageHeader
        title="Assignments"
        description="Track deadlines and submit your work. Connect a backend to replace sample tasks."
        action={
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <span className="text-slate-400">Learner</span>
            <span className="font-semibold text-slate-800">{name}</span>
          </span>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {assignments.map((a) => (
          <div
            key={a.id}
            className={`card-elevated flex flex-col gap-2 p-5 ${
              a.status === "submitted" ? "border-emerald-200/80" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
              </div>
              {a.status === "submitted" ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <Clock className="h-4 w-4 shrink-0 text-amber-500" />
              )}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              {a.due}
            </p>
            <span
              className={`mt-1 inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${
                a.status === "submitted"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-amber-50 text-amber-900"
              }`}
            >
              {a.status === "submitted" ? "Submitted" : "Pending"}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-elevated p-6 sm:p-8">
          <h2 className="text-base font-semibold text-slate-900">Submit work</h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload a file or paste your answer. Wire this to your storage API when ready.
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Active task</span>
              <span className="font-medium text-slate-900">Problem set — algorithms</span>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 transition hover:border-indigo-300 hover:bg-indigo-50/30">
              <FileUp className="h-8 w-8 text-indigo-400" />
              <span className="mt-2 text-sm font-medium text-slate-700">
                {file ? file.name : "Drop a PDF or document"}
              </span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>

            <p className="text-center text-xs text-slate-400">or</p>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="input-brand resize-y text-sm"
              placeholder="Type your answer here…"
            />

            <button type="button" className="btn-brand w-full sm:w-auto">
              <Send className="h-4 w-4" />
              Submit
            </button>
          </div>
        </section>

        <section className="card-elevated p-6 sm:p-8">
          <h2 className="text-base font-semibold text-slate-900">AI feedback (sample)</h2>
          <p className="mt-1 text-sm text-slate-500">
            After you connect grading, this panel can show scores and comments.
          </p>
          <div className="mt-6 rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-5">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Readiness score:</span> — / 10
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Strengthen: add one concrete example for each main idea, and double-check
              notation for big-O where relevant.
            </p>
          </div>
        </section>
      </div>
    </AppPage>
  );
};

export default AssignmentSubmission;
