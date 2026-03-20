import React from "react";

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #3a3a3a",
  background: "#121212",
  color: "#f5f5f5",
  fontSize: "16px",
  boxSizing: "border-box",
  outline: "none",
};

export default function InputBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "6px",
          fontSize: "14px",
          color: "#d1d5db",
          fontWeight: 700,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}