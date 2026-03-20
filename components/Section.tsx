"use client";

import React, { useState } from "react";

export default function Section({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section style={{ marginBottom: "24px" }}>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            background: "transparent",
            border: "none",
            padding: 0,
            marginBottom: "12px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <h2 style={{ fontSize: "24px", margin: 0, color: "#f5f5f5" }}>{title}</h2>
          <span
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#f97316",
              minWidth: "24px",
              textAlign: "center",
            }}
          >
            {isOpen ? "−" : "+"}
          </span>
        </button>
      ) : (
        <h2 style={{ fontSize: "24px", marginBottom: "12px", color: "#f5f5f5" }}>
          {title}
        </h2>
      )}

      {(!collapsible || isOpen) && (
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #2f2f2f",
            borderRadius: "12px",
            padding: "16px",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
          }}
        >
          {children}
        </div>
      )}
    </section>
  );
}