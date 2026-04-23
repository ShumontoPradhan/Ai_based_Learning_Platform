import React from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

const PageNotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center">
      <div
        className="pointer-events-none absolute inset-0 bg-grid-fine opacity-20"
        style={{ maskImage: "radial-gradient(ellipse 60% 50% at 50% 40%, black, transparent)" }}
      />
      <p className="text-8xl font-black tracking-tighter text-white/10 sm:text-9xl">
        404
      </p>
      <h1 className="-mt-8 text-2xl font-bold text-white sm:text-3xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-sm text-slate-400">
        The link may be broken or the page was removed. Head back to your
        workspace.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/home"
          className="btn-brand inline-flex items-center gap-2 rounded-xl px-6 py-3"
        >
          <Home className="h-4 w-4" />
          Home
        </Link>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back
        </button>
      </div>
    </div>
  );
};

export default PageNotFound;
