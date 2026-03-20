"use client";

import { useEffect, useMemo, useState } from "react";

import AppSidebar from "@/components/AppSidebar";
import Section from "@/components/Section";
import StatCard from "@/components/StatCard";
import JobsTable from "@/components/JobsTable";
import JobForm from "@/components/JobForm";

import type {
  AppData,
  Job,
  JobStatus,
  Material,
  PrefabItem,
  PurchaseOrder,
} from "@/types";

const STORAGE_KEY = "prefab-tracker-v7";

const defaultData: AppData = {
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

function loadStoredAppData(): AppData {
  if (typeof window === "undefined") return defaultData;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw) as AppData;

    return {
      ...defaultData,
      ...parsed,
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
      materials: Array.isArray(parsed.materials) ? parsed.materials : [],
      prefab: Array.isArray(parsed.prefab) ? parsed.prefab : [],
      purchaseOrders: Array.isArray(parsed.purchaseOrders) ? parsed.purchaseOrders : [],
    };
  } catch {
    return defaultData;
  }
}

export default function JobsPage() {
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [prefab, setPrefab] = useState<PrefabItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [jobPageSearch, setJobPageSearch] = useState("");
  const [jobPageHighlightIndex, setJobPageHighlightIndex] = useState(0);

  const [jobForm, setJobForm] = useState({
    jobNumber: "",
    name: "",
    customer: "",
    status: "Active" as JobStatus,
  });

  useEffect(() => {
    const parsed = loadStoredAppData();
    setJobs(parsed.jobs);
    setMaterials(parsed.materials);
    setPrefab(parsed.prefab);
    setPurchaseOrders(parsed.purchaseOrders);
  }, []);

  useEffect(() => {
    async function loadJobs() {
      try {
        const response = await fetch("/api/jobs", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load jobs");
        const dbJobs = await response.json();
        if (Array.isArray(dbJobs)) setJobs(dbJobs);
      } catch (error) {
        console.error("Loading jobs failed:", error);
      }
    }

    async function loadMaterials() {
      try {
        const response = await fetch("/api/materials", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load materials");
        const dbMaterials = await response.json();
        if (Array.isArray(dbMaterials)) setMaterials(dbMaterials);
      } catch (error) {
        console.error("Loading materials failed:", error);
      }
    }

    loadJobs();
    loadMaterials();
  }, []);

  useEffect(() => {
    setJobPageHighlightIndex(0);
  }, [jobPageSearch]);

  const jobPageOptions = useMemo(() => {
    const term = jobPageSearch.trim().toLowerCase();

    return jobs
      .filter((job) => {
        if (!term) return true;
        return `${job.jobNumber} ${job.name} ${job.customer || ""}`
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => a.jobNumber.localeCompare(b.jobNumber));
  }, [jobs, jobPageSearch]);

  const openPOCount = useMemo(
    () => purchaseOrders.filter((po) => String(po.status || "") !== "Delivered").length,
    [purchaseOrders]
  );

  const shortages = useMemo(
    () =>
      materials.filter(
        (item) => Number(item.receivedQty || 0) < Number(item.allocatedQty || 0)
      ).length,
    [materials]
  );

  const blockedPrefab = useMemo(
    () =>
      prefab.filter(
        (item) => !item.materialReady && String(item.status || "") !== "Complete"
      ).length,
    [prefab]
  );

  async function addOrUpdateJob() {
    if (!jobForm.jobNumber.trim() || !jobForm.name.trim()) return;

    try {
      if (editingJobId !== null) {
        const response = await fetch(`/api/jobs/${editingJobId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobNumber: jobForm.jobNumber.trim(),
            name: jobForm.name.trim(),
            customer: jobForm.customer.trim(),
            status: jobForm.status,
          }),
        });

        if (!response.ok) throw new Error("Failed to update job");
        const updatedJob = await response.json();

        setJobs((prev) =>
          prev.map((job) => (job.id === editingJobId ? updatedJob : job))
        );
      } else {
        const response = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobNumber: jobForm.jobNumber.trim(),
            name: jobForm.name.trim(),
            customer: jobForm.customer.trim(),
            status: jobForm.status,
          }),
        });

        if (!response.ok) throw new Error("Failed to create job");
        const newJob = await response.json();

        setJobs((prev) => [newJob, ...prev]);
      }

      setJobForm({
        jobNumber: "",
        name: "",
        customer: "",
        status: "Active",
      });
      setEditingJobId(null);
    } catch (error) {
      console.error("Saving job failed:", error);
      alert("Failed to save job.");
    }
  }

  function editJob(job: Job) {
    setEditingJobId(job.id);
    setJobForm({
      jobNumber: job.jobNumber,
      name: job.name,
      customer: job.customer,
      status: job.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteJob(id: number) {
    const job = jobs.find((j) => j.id === id);
    if (!job) return;

    const confirmed = window.confirm(
      `Delete job ${job.jobNumber}? This will not delete its material, prefab, or PO rows.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/jobs/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete job");

      setJobs((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Deleting job failed:", error);
      alert("Failed to delete job.");
    }
  }

  return (
    <main style={pageStyle}>
      <div style={layoutStyle}>
        <AppSidebar active="jobs" />

        <div style={mainStyle}>
          <div style={topBarStyle}>
            <div>
              <h1 style={{ fontSize: 30, margin: 0, color: "#f5f5f5" }}>
                Job Dashboard
              </h1>
              <p style={{ color: "#d1d5db", margin: "6px 0 0 0" }}>
                Open jobs, add jobs, and manage job records.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <StatCard title="Jobs" value={String(jobs.length)} />
            <StatCard title="Open POs" value={String(openPOCount)} />
            <StatCard title="Shortages" value={String(shortages)} />
            <StatCard title="Blocked Prefab" value={String(blockedPrefab)} />
          </div>

          <Section title="Open Job Page" collapsible defaultOpen>
            <div style={{ display: "grid", gap: 16 }}>
              <div
                style={{
                  width: "100%",
                  maxWidth: 980,
                  display: "grid",
                  gap: 12,
                  position: "relative",
                }}
              >
                <label
                  htmlFor="job-page-search"
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#d1d5db",
                  }}
                >
                  Find and Open Job Page
                </label>

                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    id="job-page-search"
                    type="text"
                    placeholder="Search job number, name, or customer..."
                    value={jobPageSearch}
                    onChange={(e) => setJobPageSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (!jobPageOptions.length) return;

                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setJobPageHighlightIndex((prev) =>
                          prev < Math.min(jobPageOptions.length, 8) - 1 ? prev + 1 : prev
                        );
                      }

                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setJobPageHighlightIndex((prev) => (prev > 0 ? prev - 1 : 0));
                      }

                      if (e.key === "Enter") {
                        e.preventDefault();
                        const selected =
                          jobPageOptions[jobPageHighlightIndex] || jobPageOptions[0];

                        if (selected) {
                          window.location.href = `/jobs/${encodeURIComponent(
                            selected.jobNumber
                          )}`;
                        }
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "16px 18px",
                      borderRadius: 12,
                      border: "1px solid #3a3a3a",
                      background: "#121212",
                      color: "#f5f5f5",
                      fontSize: 16,
                      boxSizing: "border-box",
                    }}
                  />

                  {jobPageSearch.trim() && jobPageOptions.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: 0,
                        right: 0,
                        background: "#141414",
                        border: "1px solid #2f2f2f",
                        borderRadius: 12,
                        overflow: "hidden",
                        zIndex: 999,
                        boxShadow: "0 14px 30px rgba(0, 0, 0, 0.35)",
                        maxHeight: 360,
                        overflowY: "auto",
                      }}
                    >
                      {jobPageOptions.slice(0, 12).map((job, index) => (
                        <button
                          key={job.id}
                          type="button"
                          onMouseEnter={() => setJobPageHighlightIndex(index)}
                          onClick={() => {
                            window.location.href = `/jobs/${encodeURIComponent(
                              job.jobNumber
                            )}`;
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "14px 16px",
                            border: "none",
                            borderBottom:
                              index !== Math.min(jobPageOptions.length, 12) - 1
                                ? "1px solid #262626"
                                : "none",
                            color: "white",
                            cursor: "pointer",
                            background:
                              jobPageHighlightIndex === index ? "#2a2a2a" : "#141414",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 15,
                              color: "#f97316",
                            }}
                          >
                            {job.jobNumber}
                          </div>
                          <div style={{ color: "#d1d5db", fontSize: 13 }}>
                            {job.name}
                          </div>
                          <div style={{ color: "#a3a3a3", fontSize: 12 }}>
                            {job.customer || "-"}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 12, color: "#a3a3a3" }}>
                  Use ↑ ↓ and Enter to open.
                </div>
              </div>
            </div>
          </Section>

          <Section
            title={editingJobId !== null ? "Edit Job" : "Add Job"}
            collapsible
            defaultOpen
          >
            <JobForm
              jobForm={jobForm}
              setJobForm={setJobForm}
              editingJobId={editingJobId}
              onSave={addOrUpdateJob}
              onCancel={() => {
                setJobForm({
                  jobNumber: "",
                  name: "",
                  customer: "",
                  status: "Active",
                });
                setEditingJobId(null);
              }}
            />
          </Section>

          <Section title="Jobs" collapsible defaultOpen>
            <JobsTable jobs={jobs} onEdit={editJob} onDelete={deleteJob} />
          </Section>
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