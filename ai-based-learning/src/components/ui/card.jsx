import React from "react";

export const Card = ({ children, className = "" }) => {
  return (
    <div
      className={`bg-white shadow-md rounded-xl border border-gray-200 p-4 ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = "" }) => {
  return <div className={`mb-2 font-semibold text-gray-800 ${className}`}>{children}</div>;
};

export const CardContent = ({ children, className = "" }) => {
  return <div className={`text-gray-600 ${className}`}>{children}</div>;
};

export const CardFooter = ({ children, className = "" }) => {
  return <div className={`mt-3 border-t pt-2 ${className}`}>{children}</div>;
};

export default Card;
