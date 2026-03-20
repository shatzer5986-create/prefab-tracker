"use client";

import type { ReactNode } from "react";
import AppSidebar from "@/components/AppSidebar";

type SidebarTab =
  | "dashboard"
  | "jobs"
  | "pickTickets"
  | "transferTickets"
  | "tools"
  | "assets"
  | "trailers"
  | "vehicles"
  | "equipment";

export default function AppShell({
  title,
  subtitle,
  active,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  active: SidebarTab;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <main style={pageStyle}>
      <div style={layoutStyle}>
        <AppSidebar active={active} />

        <div style={mainStyle}>
          <div style={topBarStyle}>
            <div>
              <h1 style={{ fontSize: 30, margin: 0, color: "#f5f5f5" }}>{title}</h1>
              {subtitle ? (
                <p style={{ color: "#d1d5db", margin: "6px 0 0 0" }}>{subtitle}</p>
              ) : null}
            </div>

            {actions ? (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {actions}
              </div>
            ) : null}
          </div>

          {children}
        </div>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#111111",
  fontFamily: "Arial, sans-serif",
  color: "#f5f5f5",
};

const layoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "280px 1fr",
  minHeight: "100vh",
};

const mainStyle: React.CSSProperties = {
  padding: 24,
  display: "grid",
  gap: 24,
  background: "#111111",
};

const topBarStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 16,
  padding: 20,
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  alignItems: "flex-start",
};