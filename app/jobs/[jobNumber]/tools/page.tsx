"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { inputStyle } from "@/components/InputBlock";
import Section from "@/components/Section";
import StatCard from "@/components/StatCard";
import ToolTable from "@/components/ToolTable";
import RequestsTable from "@/components/RequestsTable";
import InventoryRequestPicker from "@/components/InventoryRequestPicker";
import RequestForm from "@/components/RequestForm";
import type { RequestFormState } from "@/components/RequestForm";
import type {
  AppData,
  AppNotification,
  Employee,
  Job,
  JobRequest,
  JobRequestLine,
  ToolItem,
} from "@/types";

const STORAGE_KEY = "prefab-tracker-v7";
const LEGACY_TOOLS_KEY = "master-tool-inventory-v1";

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

function safeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function emptyToolRequestForm(jobNumber: string): RequestFormState {
  return {
    jobNumber,
    type: "Tool",
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

function normalizeToolRow(raw: any, index: number): ToolItem {
  const description =
    safeText(raw.description) ||
    safeText(raw.toolName) ||
    safeText(raw.name);

  const normalizedAssignmentType =
    raw.assignmentType === "Job" ||
    raw.assignmentType === "Person" ||
    raw.assignmentType === "Tool Room" ||
    raw.assignmentType === "Shop" ||
    raw.assignmentType === "Yard" ||
    raw.assignmentType === "WH1" ||
    raw.assignmentType === "WH2"
      ? raw.assignmentType
      : raw.jobAssigned
      ? "Job"
      : raw.personAssigned
      ? "Person"
      : raw.toolRoomLocation || raw.location
      ? "Tool Room"
      : "Job";

  const normalizedStatus =
    raw.status === "Damaged" || raw.status === "Working"
      ? raw.status
      : "Working";

  return {
    id: safeNumber(raw.id, Date.now() + index),
    category: safeText(raw.category),
    barcode: safeText(raw.barcode),
    itemNumber: safeText(raw.itemNumber),
    manufacturer: safeText(raw.manufacturer),
    model: safeText(raw.model),
    description,
    quantityAvailable: safeNumber(
      raw.quantityAvailable,
      safeNumber(raw.qtyAvailable, safeNumber(raw.quantity, safeNumber(raw.qty, 0)))
    ),
    jobNumber: safeText(raw.jobNumber) || safeText(raw.jobAssigned) || safeText(raw.job),
    assignmentType: normalizedAssignmentType,
    assignedTo: safeText(raw.assignedTo) || safeText(raw.personAssigned),
    toolRoomLocation: safeText(raw.toolRoomLocation) || safeText(raw.location),
    serialNumber: safeText(raw.serialNumber),
    transferDateIn: safeText(raw.transferDateIn) || safeText(raw.dateTransferredIn),
    transferDateOut: safeText(raw.transferDateOut) || safeText(raw.dateTransferredOut),
    status: normalizedStatus,
  };
}

function loadToolInventory(): ToolItem[] {
  if (typeof window === "undefined") return [];

  const appData = loadStoredAppData();
  const appTools = Array.isArray(appData?.toolInventory) ? appData!.toolInventory : [];

  const legacyRaw = localStorage.getItem(LEGACY_TOOLS_KEY);
  let legacyTools: any[] = [];

  if (legacyRaw) {
    try {
      const parsed = JSON.parse(legacyRaw);
      legacyTools = Array.isArray(parsed) ? parsed : [];
    } catch {
      legacyTools = [];
    }
  }

  const merged = [...appTools, ...legacyTools];
  const normalized = merged.map((row, index) => normalizeToolRow(row, index));

  const unique = new Map<number, ToolItem>();
  for (const row of normalized) unique.set(row.id, row);

  return Array.from(unique.values());
}

function buildToolLocation(tool: ToolItem) {
  if (tool.assignmentType === "Tool Room") {
    return tool.toolRoomLocation ? `Tool Room: ${tool.toolRoomLocation}` : "Tool Room";
  }
  if (tool.assignmentType === "Shop") return "Shop";
  if (tool.assignmentType === "Yard") return "Yard";
  if (tool.assignmentType === "WH1") return "WH1";
  if (tool.assignmentType === "WH2") return "WH2";
  if (tool.assignmentType === "Person") {
    return tool.assignedTo ? `Assigned to ${tool.assignedTo}` : "Assigned to person";
  }
  if (tool.assignmentType === "Job") {
    return tool.jobNumber ? `Assigned to job ${tool.jobNumber}` : "Assigned to job";
  }
  return "-";
}

function buildToolTitle(tool: ToolItem) {
  return (
    safeText(tool.description) ||
    [safeText(tool.manufacturer), safeText(tool.model)].filter(Boolean).join(" ") ||
    safeText(tool.itemNumber) ||
    safeText(tool.barcode) ||
    "Tool"
  );
}

function buildToolSubtitle(tool: ToolItem) {
  return [
    safeText(tool.category),
    safeText(tool.itemNumber) ? `Item #: ${safeText(tool.itemNumber)}` : "",
    safeText(tool.barcode) ? `Barcode: ${safeText(tool.barcode)}` : "",
    safeText(tool.serialNumber) ? `Serial: ${safeText(tool.serialNumber)}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
}

export default function JobToolsPage() {
  const params = useParams<{ jobNumber: string }>();
  const jobNumber = decodeURIComponent(params.jobNumber);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [toolInventory, setToolInventory] = useState<ToolItem[]>([]);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showPickupForm, setShowPickupForm] = useState(false);

  const [inventorySearch, setInventorySearch] = useState("");
  const [toolRequestForm, setToolRequestForm] = useState<RequestFormState>(() =>
  emptyToolRequestForm(jobNumber)
);

  const [selectedToolIds, setSelectedToolIds] = useState<number[]>([]);
  const [pickupRequestedBy, setPickupRequestedBy] = useState("");
  const [pickupNeededBy, setPickupNeededBy] = useState("");
  const [pickupToLocation, setPickupToLocation] = useState("Shop");
  const [pickupNotes, setPickupNotes] = useState("");

  function refreshFromStorage() {
    const parsed = loadStoredAppData();
    setToolInventory(loadToolInventory());
    setRequests(parsed?.requests || fallbackData.requests || []);
    setNotifications(parsed?.notifications || fallbackData.notifications || []);
    setJobs(parsed?.jobs || fallbackData.jobs || []);
    setEmployees(parsed?.employees || fallbackData.employees || []);
  }

  useEffect(() => {
    setToolRequestForm(emptyToolRequestForm(jobNumber));
    setInventorySearch("");
    setSelectedToolIds([]);
    setPickupRequestedBy("");
    setPickupNeededBy("");
    setPickupToLocation("Shop");
    setPickupNotes("");
  }, [jobNumber]);

  useEffect(() => {
    async function loadJobsFromApi() {
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

    loadJobsFromApi();
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
      toolInventory,
      requests,
      notifications,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [jobs, employees, toolInventory, requests, notifications]);

  const currentJob = useMemo(
    () => jobs.find((job) => job.jobNumber === jobNumber) || null,
    [jobs, jobNumber]
  );

  const filteredTools = useMemo(
    () => toolInventory.filter((item) => item.jobNumber === jobNumber),
    [toolInventory, jobNumber]
  );

  const toolRequests = useMemo(
    () =>
      requests.filter(
        (item) =>
          item.jobNumber === jobNumber &&
          (item.lines || []).some((line) => line.type === "Tool")
      ),
    [requests, jobNumber]
  );

  const employeeOptions = useMemo(() => {
    return [...employees]
      .filter((employee) => employee.isActive)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((employee) => employee.name);
  }, [employees]);

  const toolPickerItems = useMemo(() => {
    return toolInventory.map((tool) => {
      const title = buildToolTitle(tool);
      const subtitle = buildToolSubtitle(tool);
      const location = buildToolLocation(tool);

      return {
        id: tool.id,
        title,
        subtitle,
        meta: location,
        status: safeText(tool.status),
        qtyAvailable: Number(tool.quantityAvailable || 0),
        searchText: [
          title,
          subtitle,
          location,
          safeText(tool.description),
          safeText(tool.category),
          safeText(tool.itemNumber),
          safeText(tool.barcode),
          safeText(tool.manufacturer),
          safeText(tool.model),
          safeText(tool.serialNumber),
          safeText(tool.jobNumber),
          safeText(tool.assignedTo),
          safeText(tool.toolRoomLocation),
        ]
          .filter(Boolean)
          .join(" "),
      };
    });
  }, [toolInventory]);

  const totalQty = useMemo(
    () => filteredTools.reduce((sum, row) => sum + Number(row.quantityAvailable || 0), 0),
    [filteredTools]
  );

  const serializedCount = useMemo(
    () => filteredTools.filter((row) => safeText(row.serialNumber) !== "").length,
    [filteredTools]
  );

  const assignedToPersonCount = useMemo(
    () => filteredTools.filter((row) => row.assignmentType === "Person").length,
    [filteredTools]
  );

  const inToolRoomCount = useMemo(
    () =>
      filteredTools.filter(
        (row) =>
          row.assignmentType === "Tool Room" ||
          row.assignmentType === "Shop" ||
          row.assignmentType === "Yard" ||
          row.assignmentType === "WH1" ||
          row.assignmentType === "WH2"
      ).length,
    [filteredTools]
  );

  const damagedCount = useMemo(
    () => filteredTools.filter((row) => row.status === "Damaged").length,
    [filteredTools]
  );

  function toggleSelectedTool(id: number) {
    setSelectedToolIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  }

  function toggleAllToolsForPickup() {
    const allIds = filteredTools.map((tool) => tool.id);

    setSelectedToolIds((prev) =>
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

  function saveToolRequest() {
    const hasMinimumData =
      toolRequestForm.itemName.trim() ||
      toolRequestForm.description.trim() ||
      toolRequestForm.notes.trim();

    if (!hasMinimumData) return;

    const line: JobRequestLine = {
      id: Date.now() + 1,
      type: "Tool",
      category: "",
      itemName: toolRequestForm.itemName.trim(),
      description: toolRequestForm.description.trim(),
      quantity: Number(toolRequestForm.quantity) || 0,
      unit: toolRequestForm.unit.trim() || "ea",
      inventoryItemId: toolRequestForm.inventoryItemId ?? null,
      inventorySnapshot: toolRequestForm.inventorySnapshot ?? "",
    };

    const newRequest: JobRequest = {
      id: Date.now(),
      destinationType: "Job",
      requestFlow: "To Job",
      jobNumber,
      requestedForPerson: "",
      requestedBy: toolRequestForm.requestedBy.trim(),
      requestDate: new Date().toISOString().slice(0, 10),
      neededBy: toolRequestForm.neededBy,
      status: "Open",
      notes: toolRequestForm.notes.trim(),
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
    addSubmittedNotification(newRequest, "Tool request submitted");
    setToolRequestForm(emptyToolRequestForm(jobNumber));
    setInventorySearch("");
    setShowRequestForm(false);
  }

  function createPickupRequest() {
    if (!selectedToolIds.length) {
      alert("Select at least one tool.");
      return;
    }

    if (!safeText(pickupRequestedBy)) {
      alert("Select Requested By.");
      return;
    }

    const selectedTools = filteredTools.filter((tool) =>
      selectedToolIds.includes(tool.id)
    );

    if (!selectedTools.length) {
      alert("No selected tools found.");
      return;
    }

    const lines: JobRequestLine[] = selectedTools.map((tool, index) => ({
      id: Date.now() + index + 1,
      type: "Tool",
      category: safeText(tool.category),
      itemName: buildToolTitle(tool),
      description: [buildToolSubtitle(tool), buildToolLocation(tool)]
        .filter(Boolean)
        .join(" | "),
      quantity: Number(tool.quantityAvailable) || 1,
      unit: "ea",
      inventoryItemId: tool.id,
      inventorySnapshot: JSON.stringify(tool),
    }));

    const newRequest: JobRequest = {
      id: Date.now(),
      destinationType: "Job",
      requestFlow: "From Job",
      jobNumber,
      requestedForPerson: "",
      requestedBy: safeText(pickupRequestedBy),
      requestDate: new Date().toISOString().slice(0, 10),
      neededBy: pickupNeededBy,
      status: "Open",
      notes: safeText(pickupNotes),
      fromLocation: jobNumber,
      toLocation: safeText(pickupToLocation) || "Shop",
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
    addSubmittedNotification(newRequest, "Pickup request submitted");

    setSelectedToolIds([]);
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

            <h1 style={heroTitleStyle}>Tools</h1>

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
          <StatCard title="Tool Rows" value={String(filteredTools.length)} />
          <StatCard title="Master Tool List Rows" value={String(toolInventory.length)} />
          <StatCard title="Total Qty" value={String(totalQty)} />
          <StatCard title="Serialized" value={String(serializedCount)} />
          <StatCard title="Assigned to Person" value={String(assignedToPersonCount)} />
          <StatCard title="Stored / Yard / WH" value={String(inToolRoomCount)} />
          <StatCard title="Damaged" value={String(damagedCount)} />
        </div>

        <div style={{ marginTop: 4 }}>
          <JobNavTabs jobNumber={jobNumber} active="tools" />
        </div>

        <Section title="Tool Requests" collapsible defaultOpen>
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
                {showRequestForm ? "Close Request Form" : "Request Tool"}
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
              <div style={panelCardStyle}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>
                  Tool Request
                </div>

                <div style={{ fontSize: 13, color: "#d1d5db" }}>
                  Search matches description, item #, barcode, manufacturer, model, serial, assignment, and location.
                </div>

                <InventoryRequestPicker
                  label="Pick From Master Tool List"
                  searchValue={inventorySearch}
                  onSearchChange={setInventorySearch}
                  items={toolPickerItems}
                  onSelect={(picked) => {
                    setInventorySearch(picked.title);

                    const selectedTool = toolInventory.find((t) => t.id === picked.id);

                    setToolRequestForm((prev) => ({
                      ...prev,
                      itemName: picked.title,
                      description: [picked.subtitle, picked.meta].filter(Boolean).join(" | "),
                      quantity: 1,
                      unit: "ea",
                      notes: `Inventory status: ${picked.status || "-"} | Qty available: ${
                        picked.qtyAvailable ?? 0
                      }${picked.meta ? ` | ${picked.meta}` : ""}`,
                      inventoryItemId: picked.id,
                      inventorySnapshot: selectedTool ? JSON.stringify(selectedTool) : "",
                    }));
                  }}
                  emptyMessage="No matching tools found in the master tool list."
                />

                <RequestForm
                  title="Selected Tool Request Details"
                  requestType="Tool"
                  form={toolRequestForm}
                  setForm={setToolRequestForm}
                  onSave={saveToolRequest}
                  onCancel={() => {
                    setToolRequestForm(emptyToolRequestForm(jobNumber));
                    setInventorySearch("");
                    setShowRequestForm(false);
                  }}
                  hideType
                />
              </div>
            ) : null}

            {showPickupForm ? (
              <div style={panelCardStyle}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>
                  Request Pickup from Job
                </div>

                <div style={{ fontSize: 13, color: "#d1d5db" }}>
                  Select one or more tools assigned to this job, then send a pickup request to the shop.
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
                      style={inputStyle}
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
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Return To">
                    <select
                      value={pickupToLocation}
                      onChange={(e) => setPickupToLocation(e.target.value)}
                      style={inputStyle}
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
                      style={inputStyle}
                    />
                  </Field>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={toggleAllToolsForPickup}
                    style={secondaryButtonStyle}
                  >
                    {selectedToolIds.length === filteredTools.length && filteredTools.length > 0
                      ? "Clear Selection"
                      : "Select All Assigned Tools"}
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
                  {filteredTools.length === 0 ? (
                    <div style={emptyStateStyle}>No tools assigned to this job.</div>
                  ) : (
                    filteredTools.map((tool) => {
                      const checked = selectedToolIds.includes(tool.id);

                      return (
                        <label key={tool.id} style={pickupRowStyle}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelectedTool(tool.id)}
                          />
                          <div style={{ display: "grid", gap: 4 }}>
                            <div style={{ fontWeight: 700, color: "#f5f5f5" }}>
                              {buildToolTitle(tool)}
                            </div>
                            <div style={{ fontSize: 13, color: "#d1d5db" }}>
                              {buildToolSubtitle(tool)}
                            </div>
                            <div style={{ fontSize: 12, color: "#a3a3a3" }}>
                              {buildToolLocation(tool)}
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

        <Section title="Assigned Tools">
          <ToolTable rows={filteredTools} readOnly />
        </Section>

        <Section title="Tool Request History">
          <RequestsTable rows={toolRequests} />
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
    { key: "dashboard", label: "Dashboard", href: `/jobs/${encodeURIComponent(jobNumber)}` },
    { key: "materials", label: "Materials", href: `/jobs/${encodeURIComponent(jobNumber)}/materials` },
    { key: "prefab", label: "Prefab", href: `/jobs/${encodeURIComponent(jobNumber)}/prefab` },
    { key: "tools", label: "Tools", href: `/jobs/${encodeURIComponent(jobNumber)}/tools` },
    { key: "equipment", label: "Equipment", href: `/jobs/${encodeURIComponent(jobNumber)}/equipment` },
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