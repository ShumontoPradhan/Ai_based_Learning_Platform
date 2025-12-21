import React from "react";

export const Button = ({
  children,
  className = "",
  variant = "default",
  ...props
}) => {
  const base =
    "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none";

  const variants = {
    default: "bg-blue-600 hover:bg-blue-700 text-white",
    outline: "border border-blue-600 text-blue-600 hover:bg-blue-50",
    ghost: "text-gray-700 hover:bg-gray-100",
  };

  return (
    <button
      className={`${base} ${variants[variant] || variants.default} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
