import React from "react";

/**
 * Full-screen loading state (auth bootstrap, protected routes).
 */
export default function BrandLoader({ message = "Loading" }) {
  return (
    <div className="fixed inset-0 z-[10000] flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">
      <div
        className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-2xl shadow-indigo-500/40"
        style={{
          animation: "brand-breathe 1.4s ease-in-out infinite",
        }}
      />
      <p
        className="mt-6 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400"
        style={{ fontFamily: "var(--app-font, inherit)" }}
      >
        LearnLab
      </p>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <style>{`
        @keyframes brand-breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.92); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
