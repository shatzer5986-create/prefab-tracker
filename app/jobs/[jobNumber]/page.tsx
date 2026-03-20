"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Section from "@/components/Section";
import StatCard from "@/components/StatCard";

import type {
  AppData,
  Job,
  Material,
  PrefabItem,
  PurchaseOrder,
  ToolItem,
  EquipmentItem,
  InventoryLog,
} from "@/types";

const STORAGE_KEY = "prefab-tracker-v7";

function loadStoredAppData(): AppData | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

const fallbackData: AppData = {
  jobs: [],
  materials: [],
  prefab: [],
  purchaseOrders: [],
  assemblies: [],
  assemblyBom: [],
  regularInventory: [],
  materialMovements: [],
  toolInventory: [],
  equipmentInventory: [],
  inventoryLogs: [],
  requests: [],
  notifications: [],
  tickets: [],
  employees: [],
};

export default function JobDashboardPage() {
  const params = useParams<{ jobNumber: string }>();
  const jobNumber = decodeURIComponent(params.jobNumber);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [prefab, setPrefab] = useState<PrefabItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [toolInventory, setToolInventory] = useState<ToolItem[]>([]);
  const [equipmentInventory, setEquipmentInventory] = useState<EquipmentItem[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);

  useEffect(() => {
    async function loadJobs() {
      try {
        const response = await fetch("/api/jobs", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load jobs");
        const dbJobs = await response.json();
        setJobs(Array.isArray(dbJobs) ? dbJobs : []);
      } catch (error) {
        console.error("Loading jobs failed:", error);
        const parsed = loadStoredAppData();
        setJobs(parsed?.jobs || fallbackData.jobs);
      }
    }

    async function loadMaterials() {
      try {
        const response = await fetch("/api/materials", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load materials");
        const dbMaterials = await response.json();
        setMaterials(Array.isArray(dbMaterials) ? dbMaterials : []);
      } catch (error) {
        console.error("Loading materials failed:", error);
        const parsed = loadStoredAppData();
        setMaterials(parsed?.materials || fallbackData.materials);
      }
    }

    loadJobs();
    loadMaterials();

    const parsed = loadStoredAppData();
    setPrefab(parsed?.prefab || fallbackData.prefab);
    setPurchaseOrders(parsed?.purchaseOrders || fallbackData.purchaseOrders);
    setToolInventory(parsed?.toolInventory || fallbackData.toolInventory || []);
    setEquipmentInventory(
      parsed?.equipmentInventory || fallbackData.equipmentInventory || []
    );
    setInventoryLogs(parsed?.inventoryLogs || fallbackData.inventoryLogs || []);
  }, [jobNumber]);

  const currentJob = useMemo(
    () => jobs.find((job) => job.jobNumber === jobNumber) || null,
    [jobs, jobNumber]
  );

  const jobMaterials = useMemo(
    () => materials.filter((item) => item.job === jobNumber),
    [materials, jobNumber]
  );

  const jobPrefab = useMemo(
    () => prefab.filter((item) => item.job === jobNumber),
    [prefab, jobNumber]
  );

  const jobPOs = useMemo(
    () => purchaseOrders.filter((item) => item.job === jobNumber),
    [purchaseOrders, jobNumber]
  );

  const jobTools = useMemo(
    () => toolInventory.filter((item) => item.jobNumber === jobNumber),
    [toolInventory, jobNumber]
  );

  const jobEquipment = useMemo(
    () => equipmentInventory.filter((item) => item.jobNumber === jobNumber),
    [equipmentInventory, jobNumber]
  );

  const jobInventoryLogs = useMemo(
    () => inventoryLogs.filter((item) => item.job === jobNumber),
    [inventoryLogs, jobNumber]
  );

  const shortages = useMemo(
    () =>
      jobMaterials.filter(
        (item) => Number(item.receivedQty || 0) < Number(item.allocatedQty || 0)
      ).length,
    [jobMaterials]
  );

  const blockedPrefab = useMemo(
    () =>
      jobPrefab.filter(
        (item) => !item.materialReady && String(item.status || "") !== "Complete"
      ).length,
    [jobPrefab]
  );

  const openPOs = useMemo(
    () => jobPOs.filter((po) => String(po.status || "") !== "Delivered").length,
    [jobPOs]
  );

  const totalPrefabPlanned = useMemo(
    () => jobPrefab.reduce((sum, item) => sum + Number(item.qtyPlanned || 0), 0),
    [jobPrefab]
  );

  const totalPrefabBuilt = useMemo(
    () => jobPrefab.reduce((sum, item) => sum + Number(item.qtyBuilt || 0), 0),
    [jobPrefab]
  );

  const prefabPercent =
    totalPrefabPlanned > 0
      ? Math.round((totalPrefabBuilt / totalPrefabPlanned) * 100)
      : 0;

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <div style={heroStyle}>
          <div>
            <Link href="/jobs" style={backLinkStyle}>
              ← Back to Jobs
            </Link>

            <h1 style={heroTitleStyle}>{jobNumber}</h1>

            <p style={heroSubtitleStyle}>
              {currentJob?.name || "Job Dashboard"}
              {currentJob?.customer ? ` • ${currentJob.customer}` : ""}
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <StatCard title="Materials" value={String(jobMaterials.length)} />
          <StatCard title="Prefab" value={String(jobPrefab.length)} />
          <StatCard title="Tools" value={String(jobTools.length)} />
          <StatCard title="Equipment" value={String(jobEquipment.length)} />
          <StatCard title="Open POs" value={String(openPOs)} />
          <StatCard title="Blocked Prefab" value={String(blockedPrefab)} />
          <StatCard title="Shortages" value={String(shortages)} />
          <StatCard title="Prefab Complete %" value={`${prefabPercent}%`} />
        </div>

        <div style={{ marginTop: 4 }}>
          <JobNavTabs jobNumber={jobNumber} active="dashboard" />
        </div>

        <Section title="Job Health">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            <OverviewCard label="Job Number" value={jobNumber} />
            <OverviewCard label="Job Name" value={currentJob?.name || "-"} />
            <OverviewCard label="Customer" value={currentJob?.customer || "-"} />
            <OverviewCard label="Status" value={currentJob?.status || "-"} />
            <OverviewCard label="Prefab Progress" value={`${prefabPercent}%`} />
            <OverviewCard label="Open POs" value={String(openPOs)} />
            <OverviewCard label="Blocked Prefab" value={String(blockedPrefab)} />
            <OverviewCard label="Material Shortages" value={String(shortages)} />
          </div>
        </Section>

        <Section title="Quick Overview">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            <SummaryCard
              title="Materials"
              value={`${jobMaterials.length} rows`}
              description="View materials assigned to this job and submit material requests."
              href={`/jobs/${encodeURIComponent(jobNumber)}/materials`}
            />
            <SummaryCard
              title="Prefab"
              value={`${jobPrefab.length} rows`}
              description="View prefab assigned to this job and submit prefab requests."
              href={`/jobs/${encodeURIComponent(jobNumber)}/prefab`}
            />
            <SummaryCard
              title="Tools"
              value={`${jobTools.length} rows`}
              description="View tools assigned to this job and submit tool requests."
              href={`/jobs/${encodeURIComponent(jobNumber)}/tools`}
            />
            <SummaryCard
              title="Equipment"
              value={`${jobEquipment.length} rows`}
              description="View equipment assigned to this job and submit equipment requests."
              href={`/jobs/${encodeURIComponent(jobNumber)}/equipment`}
            />
          </div>
        </Section>

        <Section title="Recent Activity">
          <RecentActivityCard
            materials={jobMaterials.length}
            prefab={jobPrefab.length}
            tools={jobTools.length}
            equipment={jobEquipment.length}
            logs={jobInventoryLogs.length}
          />
        </Section>
      </div>
    </main>
  );
}

function JobNavTabs({
  jobNumber,
  active,
}: {
  jobNumber: string;
  active: "dashboard" | "materials" | "prefab" | "tools" | "equipment";
}) {
  const tabs = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: `/jobs/${encodeURIComponent(jobNumber)}`,
    },
    {
      key: "materials",
      label: "Materials",
      href: `/jobs/${encodeURIComponent(jobNumber)}/materials`,
    },
    {
      key: "prefab",
      label: "Prefab",
      href: `/jobs/${encodeURIComponent(jobNumber)}/prefab`,
    },
    {
      key: "tools",
      label: "Tools",
      href: `/jobs/${encodeURIComponent(jobNumber)}/tools`,
    },
    {
      key: "equipment",
      label: "Equipment",
      href: `/jobs/${encodeURIComponent(jobNumber)}/equipment`,
    },
  ] as const;

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;

        return (
          <Link
            key={tab.key}
            href={tab.href}
            style={{
              textDecoration: "none",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              background: isActive ? "#c2410c" : "#1a1a1a",
              color: "white",
              border: isActive ? "1px solid #ea580c" : "1px solid #2f2f2f",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  href,
}: {
  title: string;
  value: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={summaryCardStyle}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#f5f5f5" }}>{title}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#f97316" }}>{value}</div>
        <div style={{ color: "#d1d5db", lineHeight: 1.5 }}>{description}</div>
        <div
          style={{
            marginTop: 6,
            color: "#f97316",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Open →
        </div>
      </div>
    </Link>
  );
}

function RecentActivityCard({
  materials,
  prefab,
  tools,
  equipment,
  logs,
}: {
  materials: number;
  prefab: number;
  tools: number;
  equipment: number;
  logs: number;
}) {
  return (
    <div style={panelCardStyle}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>Snapshot</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <MiniStat label="Materials" value={String(materials)} />
        <MiniStat label="Prefab" value={String(prefab)} />
        <MiniStat label="Tools" value={String(tools)} />
        <MiniStat label="Equipment" value={String(equipment)} />
        <MiniStat label="Inventory Logs" value={String(logs)} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={miniStatStyle}>
      <div style={{ fontSize: 12, color: "#a3a3a3", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>{value}</div>
    </div>
  );
}

function OverviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={overviewCardStyle}>
      <div style={{ fontSize: 13, color: "#a3a3a3", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>{value}</div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#111111",
  padding: "24px",
  fontFamily: "Arial, sans-serif",
  color: "#f5f5f5",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "1450px",
  margin: "0 auto",
  display: "grid",
  gap: 24,
};

const heroStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 16,
  padding: 20,
};

const heroTitleStyle: React.CSSProperties = {
  fontSize: "32px",
  margin: 0,
  color: "#f5f5f5",
};

const heroSubtitleStyle: React.CSSProperties = {
  color: "#d1d5db",
  margin: "8px 0 0 0",
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-block",
  marginBottom: 10,
  color: "#f97316",
  textDecoration: "none",
  fontWeight: 700,
};

const summaryCardStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 12,
  padding: 18,
  display: "grid",
  gap: 8,
  minHeight: 140,
  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
};

const panelCardStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 12,
  padding: 18,
  display: "grid",
  gap: 12,
};

const miniStatStyle: React.CSSProperties = {
  border: "1px solid #2f2f2f",
  borderRadius: 10,
  padding: 12,
  background: "#141414",
};

const overviewCardStyle: React.CSSProperties = {
  border: "1px solid #2f2f2f",
  borderRadius: 12,
  padding: 16,
  background: "#1a1a1a",
};