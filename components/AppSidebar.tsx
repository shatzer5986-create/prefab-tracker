"use client";

import Link from "next/link";

export type SidebarTab =
  | "dashboard"
  | "jobs"
  | "requests"
  | "pickTickets"
  | "transferTickets"
  | "tools"
  | "employees"
  | "assets"
  | "trailers"
  | "vehicles"
  | "equipment";

export default function AppSidebar({
  active,
}: {
  active: SidebarTab;
}) {
  return (
    <aside style={sidebarStyle}>
      <div>
        <div style={brandStyle}>SITEOPS</div>
        <div style={brandSubStyle}>Construction Operations & Tracking</div>
      </div>

      <nav style={sidebarNavStyle}>
        <SidebarLink href="/" label="Main Dashboard" active={active === "dashboard"} />
        <SidebarLink href="/jobs" label="Job Dashboard" active={active === "jobs"} />
        <SidebarLink href="/requests" label="Requests" active={active === "requests"} />
        <SidebarLink
          href="/pick-tickets"
          label="Pick Tickets"
          active={active === "pickTickets"}
        />
        <SidebarLink
          href="/transfer-tickets"
          label="Transfer Tickets"
          active={active === "transferTickets"}
        />
        <SidebarLink href="/tools" label="Tools" active={active === "tools"} />
        <SidebarLink href="/employees" label="Employees" active={active === "employees"} />
        <SidebarLink href="/assets" label="Assets" active={active === "assets"} />
        <SidebarLink
          href="/assets/trailers"
          label="Trailers"
          active={active === "trailers"}
        />
        <SidebarLink
          href="/assets/vehicles"
          label="Vehicles"
          active={active === "vehicles"}
        />
        <SidebarLink
          href="/assets/equipment"
          label="Equipment"
          active={active === "equipment"}
        />
      </nav>
    </aside>
  );
}

function SidebarLink({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        padding: "12px 14px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 700,
        background: active ? "#c2410c" : "#1f1f1f",
        color: "white",
        border: active ? "1px solid #ea580c" : "1px solid #2f2f2f",
        transition: "all 0.2s ease",
      }}
    >
      {label}
    </Link>
  );
}

const sidebarStyle: React.CSSProperties = {
  background: "#0b0b0b",
  color: "white",
  padding: 20,
  display: "grid",
  gap: 20,
  alignContent: "start",
  borderRight: "3px solid #2a2a2a",
};

const brandStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: 1,
  color: "#f97316",
};

const brandSubStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#a3a3a3",
  marginTop: 4,
};

const sidebarNavStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};