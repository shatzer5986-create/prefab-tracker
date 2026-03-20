"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { RequestFormState } from "@/components/RequestForm";
import Section from "@/components/Section";
import StatCard from "@/components/StatCard";
import RequestForm from "@/components/RequestForm";
import RequestsTable from "@/components/RequestsTable";
import { TableWrapper, Th, Td, tableStyle } from "@/components/TableBits";

import type {
  AppData,
  AppNotification,
  Employee,
  Job,
  JobRequest,
  JobRequestLine,
  Material,
} from "@/types";

const STORAGE_KEY = "prefab-tracker-v7";

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

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function emptyMaterialRequestForm(jobNumber: string): RequestFormState {
  return {
    jobNumber,
    type: "Material",
    requestedBy: "",
    neededBy: "",
    itemName: "",
    description: "",
    quantity: 1,
    unit: "ea",
    notes: "",
    inventoryItemId: null,
    inventorySnapshot: "",
    lines: [],
  };
}

function buildMaterialTitle(item: Material) {
  return safeString(item.item) || "Material";
}

function buildMaterialSubtitle(item: Material) {
  return [
    safeString(item.category),
    safeString(item.vendor) ? `Vendor: ${safeString(item.vendor)}` : "",
    safeString(item.poNumber) ? `PO: ${safeString(item.poNumber)}` : "",
    safeString(item.location) ? `Location: ${safeString(item.location)}` : "",
    safeString(item.status) ? `Status: ${safeString(item.status)}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
}

export default function JobMaterialsPage() {
  const params = useParams<{ jobNumber: string }>();
  const jobNumber = decodeURIComponent(params.jobNumber);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showPickupForm, setShowPickupForm] = useState(false);

 const [materialRequestForm, setMaterialRequestForm] = useState<RequestFormState>(() =>
  emptyMaterialRequestForm(jobNumber)
);

  const [selectedMaterialIds, setSelectedMaterialIds] = useState<number[]>([]);
  const [pickupRequestedBy, setPickupRequestedBy] = useState("");
  const [pickupNeededBy, setPickupNeededBy] = useState("");
  const [pickupToLocation, setPickupToLocation] = useState("Shop");
  const [pickupNotes, setPickupNotes] = useState("");

  function refreshFromStorage() {
    const parsed = loadStoredAppData();
    setRequests(parsed?.requests || fallbackData.requests);
    setNotifications(parsed?.notifications || fallbackData.notifications);
    setJobs(parsed?.jobs || fallbackData.jobs);
    setEmployees(parsed?.employees || fallbackData.employees);
  }

  useEffect(() => {
    setMaterialRequestForm(emptyMaterialRequestForm(jobNumber));
    setSelectedMaterialIds([]);
    setPickupRequestedBy("");
    setPickupNeededBy("");
    setPickupToLocation("Shop");
    setPickupNotes("");
  }, [jobNumber]);

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
    refreshFromStorage();

    const handleFocus = () => refreshFromStorage();
    const handleStorage = () => refreshFromStorage();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [jobNumber]);

  useEffect(() => {
    const latest = loadStoredAppData() || fallbackData;

    const dataToSave: AppData = {
      ...latest,
      jobs: latest.jobs?.length ? latest.jobs : jobs,
      employees: latest.employees?.length ? latest.employees : employees,
      materials,
      requests,
      notifications,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [jobs, employees, materials, requests, notifications]);

  const currentJob = useMemo(
    () => jobs.find((job) => job.jobNumber === jobNumber) || null,
    [jobs, jobNumber]
  );

  const filteredMaterials = useMemo(
    () => materials.filter((item) => item.job === jobNumber),
    [materials, jobNumber]
  );

  const materialRequests = useMemo(
    () =>
      requests.filter(
        (item) =>
          item.jobNumber === jobNumber &&
          (item.lines || []).some((line) => line.type === "Material")
      ),
    [requests, jobNumber]
  );

  const employeeOptions = useMemo(() => {
    return [...employees]
      .filter((employee) => employee.isActive)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((employee) => employee.name);
  }, [employees]);

  const totalOrdered = useMemo(
    () =>
      filteredMaterials.reduce(
        (sum, row) => sum + Number(row.orderedQty || 0),
        0
      ),
    [filteredMaterials]
  );

  const totalReceived = useMemo(
    () =>
      filteredMaterials.reduce(
        (sum, row) => sum + Number(row.receivedQty || 0),
        0
      ),
    [filteredMaterials]
  );

  const totalAllocated = useMemo(
    () =>
      filteredMaterials.reduce(
        (sum, row) => sum + Number(row.allocatedQty || 0),
        0
      ),
    [filteredMaterials]
  );

  const shortageCount = useMemo(
    () =>
      filteredMaterials.filter(
        (row) => Number(row.receivedQty || 0) < Number(row.allocatedQty || 0)
      ).length,
    [filteredMaterials]
  );

  const receivedCount = useMemo(
    () => filteredMaterials.filter((row) => row.status === "Received").length,
    [filteredMaterials]
  );

  const partialCount = useMemo(
    () => filteredMaterials.filter((row) => row.status === "Partial").length,
    [filteredMaterials]
  );

  function toggleSelectedMaterial(id: number) {
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  }

  function toggleAllMaterialsForPickup() {
    const allIds = filteredMaterials.map((item) => item.id);

    setSelectedMaterialIds((prev) =>
      prev.length === allIds.length ? [] : allIds
    );
  }

  function addSubmittedNotification(request: JobRequest, title = "Request submitted") {
    const newNotification: AppNotification = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      jobNumber: request.jobNumber,
      requestId: request.id,
      type: "Request Submitted",
      title,
      message:
        (request.lines || []).map((line) => line.itemName).join(", ") ||
        "Items requested.",
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    setNotifications((prev) => [newNotification, ...prev]);
  }

  function saveMaterialRequest() {
    const hasMinimumData =
      materialRequestForm.itemName.trim() ||
      materialRequestForm.description.trim() ||
      materialRequestForm.notes.trim();

    if (!hasMinimumData) return;

    const line: JobRequestLine = {
      id: Date.now() + 1,
      type: "Material",
      category: "",
      itemName: materialRequestForm.itemName.trim(),
      description: materialRequestForm.description.trim(),
      quantity: Number(materialRequestForm.quantity) || 0,
      unit: materialRequestForm.unit.trim() || "ea",
      inventoryItemId: materialRequestForm.inventoryItemId ?? null,
      inventorySnapshot: materialRequestForm.inventorySnapshot ?? "",
    };

    const newRequest: JobRequest = {
      id: Date.now(),
      destinationType: "Job",
      requestFlow: "To Job",
      jobNumber,
      requestedForPerson: "",
      requestedBy: materialRequestForm.requestedBy.trim(),
      requestDate: new Date().toISOString().slice(0, 10),
      neededBy: materialRequestForm.neededBy,
      status: "Open",
      notes: materialRequestForm.notes.trim(),
      fromLocation: "Shop",
      toLocation: jobNumber,
      lines: [line],
      workflowStatus: "Request Submitted",
      pickTicketId: null,
      pickTicketNumber: "",
      transferTicketId: null,
      transferTicketNumber: "",
      deliveredToSiteAt: "",
      assignedToJobAt: "",
    };

    setRequests((prev) => [newRequest, ...prev]);
    addSubmittedNotification(newRequest, "Material request submitted");
    setMaterialRequestForm(emptyMaterialRequestForm(jobNumber));
    setShowRequestForm(false);
  }

  function createPickupRequest() {
    if (!selectedMaterialIds.length) {
      alert("Select at least one material row.");
      return;
    }

    if (!safeString(pickupRequestedBy)) {
      alert("Select Requested By.");
      return;
    }

    const selectedItems = filteredMaterials.filter((item) =>
      selectedMaterialIds.includes(item.id)
    );

    if (!selectedItems.length) {
      alert("No selected materials found.");
      return;
    }

    const lines: JobRequestLine[] = selectedItems.map((item, index) => ({
      id: Date.now() + index + 1,
      type: "Material",
      category: safeString(item.category),
      itemName: buildMaterialTitle(item),
      description: buildMaterialSubtitle(item),
      quantity: Math.max(Number(item.receivedQty || 0), 1),
      unit: safeString(item.unit) || "ea",
      inventoryItemId: item.id,
      inventorySnapshot: JSON.stringify(item),
    }));

    const newRequest: JobRequest = {
      id: Date.now(),
      destinationType: "Job",
      requestFlow: "From Job",
      jobNumber,
      requestedForPerson: "",
      requestedBy: safeString(pickupRequestedBy),
      requestDate: new Date().toISOString().slice(0, 10),
      neededBy: pickupNeededBy,
      status: "Open",
      notes: safeString(pickupNotes),
      fromLocation: jobNumber,
      toLocation: safeString(pickupToLocation) || "Shop",
      lines,
      workflowStatus: "Request Submitted",
      pickTicketId: null,
      pickTicketNumber: "",
      transferTicketId: null,
      transferTicketNumber: "",
      deliveredToSiteAt: "",
      assignedToJobAt: "",
    };

    setRequests((prev) => [newRequest, ...prev]);
    addSubmittedNotification(newRequest, "Material pickup request submitted");

    setSelectedMaterialIds([]);
    setPickupRequestedBy("");
    setPickupNeededBy("");
    setPickupToLocation("Shop");
    setPickupNotes("");
    setShowPickupForm(false);
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <div style={heroStyle}>
          <div>
            <Link href={`/jobs/${encodeURIComponent(jobNumber)}`} style={backLinkStyle}>
              ← Back to Job Dashboard
            </Link>

            <h1 style={heroTitleStyle}>Materials</h1>

            <p style={heroSubtitleStyle}>
              {jobNumber}
              {currentJob?.name ? ` • ${currentJob.name}` : ""}
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
          <StatCard title="Material Rows" value={String(filteredMaterials.length)} />
          <StatCard title="Total Ordered" value={String(totalOrdered)} />
          <StatCard title="Total Received" value={String(totalReceived)} />
          <StatCard title="Total Allocated" value={String(totalAllocated)} />
          <StatCard title="Shortages" value={String(shortageCount)} />
          <StatCard title="Received Rows" value={String(receivedCount)} />
          <StatCard title="Partial Rows" value={String(partialCount)} />
        </div>

        <div style={{ marginTop: 4 }}>
          <JobNavTabs jobNumber={jobNumber} active="materials" />
        </div>

        <Section title="Material Requests" collapsible defaultOpen>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setShowRequestForm((prev) => !prev)}
                style={{
                  ...requestButtonStyle,
                  background: showRequestForm ? "#ea580c" : "#c2410c",
                  border: "1px solid #ea580c",
                }}
              >
                {showRequestForm ? "Close Request Form" : "Request Material"}
              </button>

              <button
                type="button"
                onClick={() => setShowPickupForm((prev) => !prev)}
                style={{
                  ...requestButtonStyle,
                  background: showPickupForm ? "#15803d" : "#166534",
                  border: "1px solid #15803d",
                }}
              >
                {showPickupForm ? "Close Pickup Form" : "Request Pickup from Job"}
              </button>
            </div>

            {showRequestForm ? (
              <RequestForm
                title="Material Request"
                requestType="Material"
                form={materialRequestForm}
                setForm={setMaterialRequestForm}
                onSave={saveMaterialRequest}
                onCancel={() => {
                  setMaterialRequestForm(emptyMaterialRequestForm(jobNumber));
                  setShowRequestForm(false);
                }}
                hideType
              />
            ) : null}

            {showPickupForm ? (
              <div style={panelCardStyle}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>
                  Request Pickup from Job
                </div>

                <div style={{ fontSize: 13, color: "#d1d5db" }}>
                  Select one or more material rows from this job, then send a pickup request to the shop.
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  <Field label="Requested By">
                    <select
                      value={pickupRequestedBy}
                      onChange={(e) => setPickupRequestedBy(e.target.value)}
                      style={fieldInputStyle}
                    >
                      <option value="">Select employee</option>
                      {employeeOptions.map((employee) => (
                        <option key={employee} value={employee}>
                          {employee}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Needed By">
                    <input
                      type="date"
                      value={pickupNeededBy}
                      onChange={(e) => setPickupNeededBy(e.target.value)}
                      style={fieldInputStyle}
                    />
                  </Field>

                  <Field label="Return To">
                    <select
                      value={pickupToLocation}
                      onChange={(e) => setPickupToLocation(e.target.value)}
                      style={fieldInputStyle}
                    >
                      <option value="Shop">Shop</option>
                      <option value="Tool Room">Tool Room</option>
                      <option value="Yard">Yard</option>
                      <option value="WH1">WH1</option>
                      <option value="WH2">WH2</option>
                    </select>
                  </Field>

                  <Field label="Notes">
                    <input
                      value={pickupNotes}
                      onChange={(e) => setPickupNotes(e.target.value)}
                      style={fieldInputStyle}
                    />
                  </Field>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={toggleAllMaterialsForPickup}
                    style={secondaryButtonStyle}
                  >
                    {selectedMaterialIds.length === filteredMaterials.length &&
                    filteredMaterials.length > 0
                      ? "Clear Selection"
                      : "Select All Material Rows"}
                  </button>

                  <button
                    type="button"
                    onClick={createPickupRequest}
                    style={{
                      ...requestButtonStyle,
                      background: "#166534",
                      border: "1px solid #15803d",
                    }}
                  >
                    Send Pickup Request
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    maxHeight: 420,
                    overflow: "auto",
                  }}
                >
                  {filteredMaterials.length === 0 ? (
                    <div style={emptyStateStyle}>No materials assigned to this job.</div>
                  ) : (
                    filteredMaterials.map((item) => {
                      const checked = selectedMaterialIds.includes(item.id);

                      return (
                        <label key={item.id} style={pickupRowStyle}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelectedMaterial(item.id)}
                          />
                          <div style={{ display: "grid", gap: 4 }}>
                            <div style={{ fontWeight: 700, color: "#f5f5f5" }}>
                              {buildMaterialTitle(item)}
                            </div>
                            <div style={{ fontSize: 13, color: "#d1d5db" }}>
                              {buildMaterialSubtitle(item)}
                            </div>
                            <div style={{ fontSize: 12, color: "#a3a3a3" }}>
                              Ordered: {item.orderedQty ?? 0} • Received: {item.receivedQty ?? 0} •
                              Allocated: {item.allocatedQty ?? 0} • Unit: {item.unit || "-"}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </Section>

        <Section title="Job Materials">
          <MaterialsReadOnlyTable rows={filteredMaterials} />
        </Section>

        <Section title="Material Request History">
          <RequestsTable rows={materialRequests} />
        </Section>
      </div>
    </main>
  );
}

function MaterialsReadOnlyTable({ rows }: { rows: Material[] }) {
  return (
    <TableWrapper>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Item</Th>
            <Th>Category</Th>
            <Th>Ordered</Th>
            <Th>Received</Th>
            <Th>Allocated</Th>
            <Th>Unit</Th>
            <Th>Vendor</Th>
            <Th>Status</Th>
            <Th>Location</Th>
            <Th>PO #</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ padding: "10px", borderBottom: "1px solid #f1f5f9", fontSize: "14px" }}>
  No materials assigned to this job.
</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.item || "-"}</Td>
                <Td>{row.category || "-"}</Td>
                <Td>{row.orderedQty ?? 0}</Td>
                <Td>{row.receivedQty ?? 0}</Td>
                <Td>{row.allocatedQty ?? 0}</Td>
                <Td>{row.unit || "-"}</Td>
                <Td>{row.vendor || "-"}</Td>
                <Td>{row.status || "-"}</Td>
                <Td>{row.location || "-"}</Td>
                <Td>{row.poNumber || "-"}</Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </TableWrapper>
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

function Field({
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
          marginBottom: 6,
          fontSize: 14,
          fontWeight: 700,
          color: "#d1d5db",
        }}
      >
        {label}
      </label>
      {children}
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

const panelCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 12,
  padding: 16,
};

const requestButtonStyle: React.CSSProperties = {
  borderRadius: "10px",
  padding: "12px 16px",
  color: "white",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #3a3a3a",
  borderRadius: "10px",
  padding: "12px 16px",
  color: "white",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 700,
  background: "#2a2a2a",
};

const pickupRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "20px 1fr",
  gap: 12,
  alignItems: "start",
  background: "#141414",
  border: "1px solid #2f2f2f",
  borderRadius: 10,
  padding: 12,
  cursor: "pointer",
};

const emptyStateStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 10,
  padding: 16,
  color: "#a3a3a3",
};

const fieldInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: 8,
  border: "1px solid #3a3a3a",
  fontSize: 16,
  boxSizing: "border-box",
  background: "#121212",
  color: "#f5f5f5",
};