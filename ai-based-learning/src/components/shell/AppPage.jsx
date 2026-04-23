import React from "react";

/**
 * Standard page wrapper: mesh background + horizontal padding + max width.
 */
export default function AppPage({ children, className = "" }) {
  return (
    <div
      className={`app-page relative min-h-[calc(100vh-4.5rem)] w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 ${className}`}
    >
      <div className="mx-auto max-w-7xl">{children}</div>
    </div>
  );
}
