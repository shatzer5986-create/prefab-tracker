"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Section from "@/components/Section";
import StatCard from "@/components/StatCard";
import RequestsTable from "@/components/RequestsTable";

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
const MASTER_TOOLS_KEY = "master-tool-inventory-v1";
const SHOP_LOCATIONS = ["Tool Room", "Shop", "Yard", "WH1", "WH2"] as const;

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

type RequestLineDraft = {
  rowId: number;
  category: string;
  inventoryItemId: number | "";
  quantity: number;
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

function loadStoredTools(): ToolItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(MASTER_TOOLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isShopLocation(value: string) {
  const normalized = safeString(value).toLowerCase();
  return SHOP_LOCATIONS.some((loc) => loc.toLowerCase() === normalized);
}

function buildToolTitle(item: ToolItem) {
  return (
    [
      safeString(item.description),
      safeString(item.itemNumber),
      safeString(item.manufacturer),
      safeString(item.model),
    ]
      .filter(Boolean)
      .join(" • ") || "Tool"
  );
}

function buildToolSubtitle(item: ToolItem) {
  return [
    safeString(item.category),
    safeString(item.barcode) ? `Barcode: ${safeString(item.barcode)}` : "",
    safeString(item.serialNumber) ? `Serial: ${safeString(item.serialNumber)}` : "",
    safeString(item.status) ? `Status: ${safeString(item.status)}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
}

function buildToolLocation(item: ToolItem) {
  if (item.assignmentType === "Person") {
    return item.assignedTo ? `Assigned to ${item.assignedTo}` : "Assigned to person";
  }

  if (item.assignmentType === "Job") {
    return item.jobNumber ? `Assigned to job ${item.jobNumber}` : "Assigned to job";
  }

  if (
    item.assignmentType === "Tool Room" ||
    item.assignmentType === "Shop" ||
    item.assignmentType === "Yard" ||
    item.assignmentType === "WH1" ||
    item.assignmentType === "WH2"
  ) {
    return item.toolRoomLocation || item.assignmentType;
  }

  return "Unassigned";
}

function getAvailableQty(item: ToolItem) {
  return Math.max(safeNumber(item.quantityAvailable, 0), 0);
}

function createEmptyRequestLine(): RequestLineDraft {
  return {
    rowId: Date.now() + Math.floor(Math.random() * 100000),
    category: "",
    inventoryItemId: "",
    quantity: 1,
  };
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

  const [requestLines, setRequestLines] = useState<RequestLineDraft[]>([createEmptyRequestLine()]);
  const [requestRequestedBy, setRequestRequestedBy] = useState("");
  const [requestNeededBy, setRequestNeededBy] = useState("");
  const [requestNotes, setRequestNotes] = useState("");

  const [selectedAssignedToolIds, setSelectedAssignedToolIds] = useState<number[]>([]);
  const [selectedAssignedToolQtys, setSelectedAssignedToolQtys] = useState<Record<number, number>>(
    {}
  );
  const [pickupRequestedBy, setPickupRequestedBy] = useState("");
  const [pickupNeededBy, setPickupNeededBy] = useState("");
  const [pickupToLocation, setPickupToLocation] = useState("Shop");
  const [pickupNotes, setPickupNotes] = useState("");

  function refreshFromStorage() {
    const parsed = loadStoredAppData();

    setToolInventory(loadStoredTools());
    setRequests(parsed?.requests || fallbackData.requests);
    setNotifications(parsed?.notifications || fallbackData.notifications);
    setJobs(parsed?.jobs || fallbackData.jobs);
    setEmployees(parsed?.employees || fallbackData.employees);
  }

  function persistRequestsAndNotifications(
    nextRequests: JobRequest[],
    nextNotifications: AppNotification[]
  ) {
    const latest = loadStoredAppData() || fallbackData;

    const updatedData: AppData = {
      ...latest,
      requests: nextRequests,
      notifications: nextNotifications,
      toolInventory: latest.toolInventory || [],
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));

    setRequests(nextRequests);
    setNotifications(nextNotifications);
  }

  function resetRequestForm() {
    setRequestLines([createEmptyRequestLine()]);
    setRequestRequestedBy("");
    setRequestNeededBy("");
    setRequestNotes("");
  }

  function resetPickupForm() {
    setSelectedAssignedToolIds([]);
    setSelectedAssignedToolQtys({});
    setPickupRequestedBy("");
    setPickupNeededBy("");
    setPickupToLocation("Shop");
    setPickupNotes("");
  }

  useEffect(() => {
    resetRequestForm();
    resetPickupForm();
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

    loadJobs();
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

  const currentJob = useMemo(
    () => jobs.find((job) => safeString(job.jobNumber) === safeString(jobNumber)) || null,
    [jobs, jobNumber]
  );

  const employeeOptions = useMemo(() => {
    return [...employees]
      .filter((employee) => employee.isActive)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((employee) => employee.name);
  }, [employees]);

  const assignedTools = useMemo(
    () =>
      toolInventory.filter(
        (item) =>
          safeString(item.assignmentType) === "Job" &&
          safeString(item.jobNumber) === safeString(jobNumber)
      ),
    [toolInventory, jobNumber]
  );

  const availableTools = useMemo(
    () =>
      [...toolInventory]
        .filter((item) => {
          if (safeString(item.status) !== "Working") return false;
          const qty = getAvailableQty(item);
          if (qty < 1) return false;

          const location =
            safeString(item.toolRoomLocation) ||
            safeString(item.assignmentType) ||
            safeString(item.jobNumber);

          return (
            isShopLocation(location) ||
            item.assignmentType === "Tool Room" ||
            item.assignmentType === "Shop" ||
            item.assignmentType === "Yard" ||
            item.assignmentType === "WH1" ||
            item.assignmentType === "WH2"
          );
        })
        .sort((a, b) => {
          const categoryCompare = safeString(a.category).localeCompare(safeString(b.category));
          if (categoryCompare !== 0) return categoryCompare;
          return buildToolTitle(a).localeCompare(buildToolTitle(b));
        }),
    [toolInventory]
  );

 const requestCategories = useMemo(() => {
  return Array.from(
    new Set(
      toolInventory
        .map((item) => safeString(item.category))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
}, [toolInventory]);

  const availableToolsByCategory = useMemo(() => {
    const map = new Map<string, ToolItem[]>();

    for (const item of availableTools) {
      const category = safeString(item.category) || "Uncategorized";
      const existing = map.get(category) || [];
      existing.push(item);
      map.set(category, existing);
    }

    for (const [key, value] of map.entries()) {
      value.sort((a, b) => buildToolTitle(a).localeCompare(buildToolTitle(b)));
      map.set(key, value);
    }

    return map;
  }, [availableTools]);

  const toolRequests = useMemo(
    () =>
      requests.filter(
        (item) =>
          safeString(item.jobNumber) === safeString(jobNumber) &&
          (item.lines || []).some((line) => line.type === "Tool")
      ),
    [requests, jobNumber]
  );

  const totalAssignedQty = useMemo(
    () => assignedTools.reduce((sum, row) => sum + safeNumber(row.quantityAvailable, 0), 0),
    [assignedTools]
  );

  const damagedCount = useMemo(
    () => assignedTools.filter((row) => safeString(row.status) === "Damaged").length,
    [assignedTools]
  );

  function addRequestLine() {
    setRequestLines((prev) => [...prev, createEmptyRequestLine()]);
  }

  function removeRequestLine(rowId: number) {
    setRequestLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((line) => line.rowId !== rowId);
    });
  }

  function updateRequestLine(
    rowId: number,
    patch: Partial<RequestLineDraft>,
    options?: { resetTool?: boolean }
  ) {
    setRequestLines((prev) =>
      prev.map((line) => {
        if (line.rowId !== rowId) return line;

        const next: RequestLineDraft = {
          ...line,
          ...patch,
        };

        if (options?.resetTool) {
          next.inventoryItemId = "";
          next.quantity = 1;
        }

        return next;
      })
    );
  }

  function getLineToolOptions(line: RequestLineDraft) {
  const category = safeString(line.category);
  if (!category) return [];

  return toolInventory
    .filter((item) => safeString(item.category) === category)
    .sort((a, b) => buildToolTitle(a).localeCompare(buildToolTitle(b)));
}

 function createToolRequest() {
  if (!safeString(requestRequestedBy)) {
    alert("Select Requested By.");
    return;
  }

  const cleanedLines = requestLines.filter(
    (line) => safeString(line.category) || line.inventoryItemId !== ""
  );

  if (!cleanedLines.length) {
    alert("Add at least one request line.");
    return;
  }

  const missingCategory = cleanedLines.find((line) => !safeString(line.category));
  if (missingCategory) {
    alert("Each request line needs a category.");
    return;
  }

  const missingTool = cleanedLines.find((line) => line.inventoryItemId === "");
  if (missingTool) {
    alert("Each request line needs a tool name.");
    return;
  }

  const validatedSelections: Array<{
    line: RequestLineDraft;
    item: ToolItem;
    qty: number;
  }> = [];

  const duplicateCheck = new Set<number>();

  for (const line of cleanedLines) {
    const selectedId = Number(line.inventoryItemId);
    const item = toolInventory.find((tool) => Number(tool.id) === selectedId);

    if (!item) {
      alert("One of the selected tools is no longer available. Please reselect it.");
      return;
    }

    if (duplicateCheck.has(selectedId)) {
      alert("The same tool is selected more than once. Use one line per tool.");
      return;
    }

    duplicateCheck.add(selectedId);

    const qty = Math.max(1, Number(line.quantity) || 1);

    validatedSelections.push({
      line,
      item,
      qty,
    });
  }

  const lines: JobRequestLine[] = validatedSelections.map(({ item, qty }, index) => ({
    id: Date.now() + index + 1,
    type: "Tool",
    category: safeString(item.category),
    itemName: buildToolTitle(item),
    description: [buildToolSubtitle(item), buildToolLocation(item)]
      .filter(Boolean)
      .join(" | "),
    quantity: qty,
    unit: "ea",
    inventoryItemId: item.id,
    inventorySnapshot: JSON.stringify(item),
  }));

  const newRequest: JobRequest = {
    id: Date.now(),
    destinationType: "Job",
    requestFlow: "To Job",
    jobNumber,
    requestedForPerson: "",
    requestedBy: safeString(requestRequestedBy),
    requestDate: new Date().toISOString().slice(0, 10),
    neededBy: requestNeededBy,
    status: "Open",
    notes: safeString(requestNotes),
    fromLocation: "Shop",
    toLocation: jobNumber,
    lines,
    workflowStatus: "Request Submitted",
    pickTicketId: null,
    pickTicketNumber: "",
    transferTicketId: null,
    transferTicketNumber: "",
    deliveredToSiteAt: "",
    assignedToJobAt: "",
  };

  const latest = loadStoredAppData() || fallbackData;
  const nextRequests = [newRequest, ...(latest.requests || [])];

  const newNotification: AppNotification = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    jobNumber: newRequest.jobNumber,
    requestId: newRequest.id,
    type: "Request Submitted",
    title: "Tool request submitted",
    message:
      (newRequest.lines || [])
        .map(
          (line) => `${line.itemName} (${line.quantity}${line.unit ? ` ${line.unit}` : ""})`
        )
        .join(", ") || "Items requested.",
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  const nextNotifications = [newNotification, ...(latest.notifications || [])];
  persistRequestsAndNotifications(nextRequests, nextNotifications);

  resetRequestForm();
  setShowRequestForm(false);
}

  function toggleSelectedAssignedTool(id: number) {
    setSelectedAssignedToolIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((value) => value !== id);
        setSelectedAssignedToolQtys((current) => {
          const updated = { ...current };
          delete updated[id];
          return updated;
        });
        return next;
      }

      const selectedItem = assignedTools.find((item) => item.id === id);
      const defaultQty = Math.max(Math.min(getAvailableQty(selectedItem as ToolItem), 1), 1);

      setSelectedAssignedToolQtys((current) => ({
        ...current,
        [id]: defaultQty,
      }));

      return [...prev, id];
    });
  }

  function updateSelectedAssignedToolQty(id: number, qty: number) {
    setSelectedAssignedToolQtys((prev) => ({
      ...prev,
      [id]: Math.max(1, qty || 1),
    }));
  }

  function toggleAllAssignedTools() {
    const allIds = assignedTools.map((item) => item.id);

    setSelectedAssignedToolIds((prev) => {
      if (prev.length === allIds.length) {
        setSelectedAssignedToolQtys({});
        return [];
      }

      const qtyMap: Record<number, number> = {};
      for (const item of assignedTools) {
        qtyMap[item.id] = Math.max(Math.min(getAvailableQty(item), 1), 1);
      }

      setSelectedAssignedToolQtys(qtyMap);
      return allIds;
    });
  }

  function createPickupRequest() {
    if (!selectedAssignedToolIds.length) {
      alert("Select at least one assigned tool.");
      return;
    }

    if (!safeString(pickupRequestedBy)) {
      alert("Select Requested By.");
      return;
    }

    const selectedItems = assignedTools.filter((item) =>
      selectedAssignedToolIds.includes(item.id)
    );

    if (!selectedItems.length) {
      alert("No selected assigned tools found.");
      return;
    }

    const invalidQtyItem = selectedItems.find((item) => {
      const requestedQty = safeNumber(selectedAssignedToolQtys[item.id], 1);
      const maxQty = getAvailableQty(item);
      return requestedQty < 1 || requestedQty > maxQty;
    });

    if (invalidQtyItem) {
      alert(
        `Requested quantity for ${buildToolTitle(invalidQtyItem)} must be between 1 and ${getAvailableQty(
          invalidQtyItem
        )}.`
      );
      return;
    }

    const lines: JobRequestLine[] = selectedItems.map((item, index) => ({
      id: Date.now() + index + 1,
      type: "Tool",
      category: safeString(item.category),
      itemName: buildToolTitle(item),
      description: [buildToolSubtitle(item), buildToolLocation(item)]
        .filter(Boolean)
        .join(" | "),
      quantity: safeNumber(selectedAssignedToolQtys[item.id], 1),
      unit: "ea",
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

    const latest = loadStoredAppData() || fallbackData;
    const nextRequests = [newRequest, ...(latest.requests || [])];

    const newNotification: AppNotification = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      jobNumber: newRequest.jobNumber,
      requestId: newRequest.id,
      type: "Request Submitted",
      title: "Tool pickup request submitted",
      message:
        (newRequest.lines || [])
          .map(
            (line) => `${line.itemName} (${line.quantity}${line.unit ? ` ${line.unit}` : ""})`
          )
          .join(", ") || "Items requested.",
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    const nextNotifications = [newNotification, ...(latest.notifications || [])];
    persistRequestsAndNotifications(nextRequests, nextNotifications);

    resetPickupForm();
    setShowPickupForm(false);
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={heroStyle}>
          <Link href="/jobs" style={backLinkStyle}>
            ← Back to Jobs
          </Link>

          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <h1 style={heroTitleStyle}>Job Tools</h1>
              <p style={heroSubtitleStyle}>
                {currentJob
                  ? `${currentJob.jobNumber} • ${currentJob.name || "Unnamed Job"}`
                  : jobNumber}
              </p>
            </div>

            <JobNavTabs jobNumber={jobNumber} active="tools" />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <StatCard title="Assigned Tool Records" value={String(assignedTools.length)} />
<StatCard title="Assigned Quantity" value={String(totalAssignedQty)} />
<StatCard title="Damaged" value={String(damagedCount)} />
<StatCard title="Open Tool Requests" value={String(toolRequests.length)} />
        </div>

        <Section title="Tool Requests">
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  setShowRequestForm((prev) => !prev);
                  if (showPickupForm) setShowPickupForm(false);
                }}
                style={{
                  ...requestButtonStyle,
                  background: showRequestForm ? "#ea580c" : "#c2410c",
                  border: "1px solid #ea580c",
                }}
              >
                {showRequestForm ? "Close Request Form" : "Request Tools"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPickupForm((prev) => !prev);
                  if (showRequestForm) setShowRequestForm(false);
                }}
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
                  Request Tools from Shop
                </div>

                <div style={{ fontSize: 13, color: "#d1d5db" }}>
                  Pick a category first, then choose the tool name from that category. Each line becomes one request line.
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
                      value={requestRequestedBy}
                      onChange={(e) => setRequestRequestedBy(e.target.value)}
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
                      value={requestNeededBy}
                      onChange={(e) => setRequestNeededBy(e.target.value)}
                      style={fieldInputStyle}
                    />
                  </Field>

                  <Field label="Notes">
                    <input
                      value={requestNotes}
                      onChange={(e) => setRequestNotes(e.target.value)}
                      style={fieldInputStyle}
                    />
                  </Field>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {requestLines.map((line, index) => {
                    const toolOptions = getLineToolOptions(line);
                    const selectedTool =
                      line.inventoryItemId === ""
                        ? null
                        : availableTools.find((tool) => tool.id === line.inventoryItemId) || null;
                    const maxQty = selectedTool ? Math.max(getAvailableQty(selectedTool), 1) : 1;

                    return (
                      <div key={line.rowId} style={lineCardStyle}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#f5f5f5" }}>
                            Request Line {index + 1}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeRequestLine(line.rowId)}
                            disabled={requestLines.length === 1}
                            style={{
                              ...smallButtonStyle,
                              opacity: requestLines.length === 1 ? 0.5 : 1,
                              cursor: requestLines.length === 1 ? "not-allowed" : "pointer",
                            }}
                          >
                            Remove Line
                          </button>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(180px, 1fr) minmax(260px, 2fr) 120px",
                            gap: 12,
                          }}
                        >
                          <Field label="Category">
                            <select
                              value={line.category}
                              onChange={(e) =>
                                updateRequestLine(
                                  line.rowId,
                                  { category: e.target.value },
                                  { resetTool: true }
                                )
                              }
                              style={fieldInputStyle}
                            >
                              <option value="">Select category</option>
                             {requestCategories.map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </Field>

                          <Field label="Tool Name">
  <select
    value={line.inventoryItemId}
    onChange={(e) =>
      updateRequestLine(line.rowId, {
        inventoryItemId: e.target.value ? Number(e.target.value) : "",
        quantity: 1,
      })
    }
    style={fieldInputStyle}
    disabled={!line.category}
  >
    <option value="">
      {line.category ? "Select tool" : "Select category first"}
    </option>
    {toolOptions.map((item) => (
      <option key={item.id} value={item.id}>
        {[
          buildToolTitle(item),
          safeString(item.status),
          safeString(item.toolRoomLocation) || safeString(item.assignmentType),
        ]
          .filter(Boolean)
          .join(" • ")}
      </option>
    ))}
  </select>
</Field>

                          <Field label="Qty">
                            <input
                              type="number"
                              min={1}
                              max={maxQty}
                              value={line.quantity}
                              onChange={(e) =>
                                updateRequestLine(line.rowId, {
                                  quantity: Math.min(
                                    Math.max(Number(e.target.value) || 1, 1),
                                    maxQty
                                  ),
                                })
                              }
                              style={fieldInputStyle}
                              disabled={!selectedTool}
                            />
                          </Field>
                        </div>

                        {selectedTool ? (
                          <div style={lineMetaStyle}>
                            <div>{buildToolSubtitle(selectedTool)}</div>
                            <div>
                              Qty Available: {getAvailableQty(selectedTool)} • {buildToolLocation(selectedTool)}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={addRequestLine} style={secondaryButtonStyle}>
                    Add Request Line
                  </button>

                  <button
                    type="button"
                    onClick={createToolRequest}
                    style={{
                      ...requestButtonStyle,
                      background: "#c2410c",
                      border: "1px solid #ea580c",
                    }}
                  >
                    Send Tool Request
                  </button>
                </div>
              </div>
            ) : null}

            {showPickupForm ? (
              <div style={panelCardStyle}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>
                  Request Pickup from Job
                </div>

                <div style={{ fontSize: 13, color: "#d1d5db" }}>
                  Select one or more tools assigned to this job, set the quantity for each, then send a pickup request.
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
                    onClick={toggleAllAssignedTools}
                    style={secondaryButtonStyle}
                  >
                    {selectedAssignedToolIds.length === assignedTools.length && assignedTools.length > 0
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
                  {assignedTools.length === 0 ? (
                    <div style={emptyStateStyle}>No tools are currently assigned to this job.</div>
                  ) : (
                    assignedTools.map((item) => {
                      const checked = selectedAssignedToolIds.includes(item.id);
                      const maxQty = Math.max(getAvailableQty(item), 1);
                      const qtyValue = selectedAssignedToolQtys[item.id] ?? 1;

                      return (
                        <div key={item.id} style={pickupRowStyle}>
                          <label
                            style={{
                              display: "grid",
                              gridTemplateColumns: "20px 1fr",
                              gap: 12,
                              alignItems: "start",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSelectedAssignedTool(item.id)}
                            />
                            <div style={{ display: "grid", gap: 4 }}>
                              <div style={{ fontWeight: 700, color: "#f5f5f5" }}>
                                {buildToolTitle(item)}
                              </div>
                              <div style={{ fontSize: 13, color: "#d1d5db" }}>
                                {buildToolSubtitle(item)}
                              </div>
                              <div style={{ fontSize: 12, color: "#a3a3a3" }}>
                                Qty Assigned: {item.quantityAvailable ?? 0} • {buildToolLocation(item)}
                              </div>
                            </div>
                          </label>

                          {checked ? (
                            <div
                              style={{
                                marginTop: 10,
                                display: "grid",
                                gridTemplateColumns: "160px 1fr",
                                gap: 10,
                                alignItems: "center",
                              }}
                            >
                              <div style={{ fontSize: 13, color: "#d1d5db", fontWeight: 700 }}>
                                Pickup Quantity
                              </div>
                              <input
                                type="number"
                                min={1}
                                max={maxQty}
                                value={qtyValue}
                                onChange={(e) =>
                                  updateSelectedAssignedToolQty(
                                    item.id,
                                    Math.min(
                                      Math.max(Number(e.target.value) || 1, 1),
                                      maxQty
                                    )
                                  )
                                }
                                style={qtyInputStyle}
                              />
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}

            <RequestsTable rows={toolRequests} />
          </div>
        </Section>

        <Section title="Assigned Tools on This Job">
          {assignedTools.length === 0 ? (
            <div style={emptyStateStyle}>No tools are currently assigned to this job.</div>
          ) : (
            <ToolCards rows={assignedTools} />
          )}
        </Section>

        <Section title="Available Shop Tools">
          {availableTools.length === 0 ? (
            <div style={emptyStateStyle}>No available tools found in shop locations.</div>
          ) : (
            <ToolCards rows={availableTools} />
          )}
        </Section>
      </div>
    </div>
  );
}

function ToolCards({ rows }: { rows: ToolItem[] }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {rows.map((row) => (
        <div key={row.id} style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>
                {buildToolTitle(row)}
              </div>
              <div style={{ color: "#d1d5db", fontSize: 14 }}>{buildToolSubtitle(row)}</div>
              <div style={{ color: "#a3a3a3", fontSize: 13 }}>{buildToolLocation(row)}</div>
            </div>

            <div
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid #3a3a3a",
                background: "#141414",
                color: "#f5f5f5",
                fontSize: 13,
                fontWeight: 700,
                alignSelf: "flex-start",
              }}
            >
              Qty {row.quantityAvailable ?? 0}
            </div>
          </div>

          <div style={detailsGridStyle}>
            <Detail label="Category" value={row.category} />
            <Detail label="Barcode" value={row.barcode} />
            <Detail label="Item Number" value={row.itemNumber} />
            <Detail label="Manufacturer" value={row.manufacturer} />
            <Detail label="Model" value={row.model} />
            <Detail label="Serial Number" value={row.serialNumber} />
            <Detail label="Quantity" value={String(row.quantityAvailable ?? 0)} />
            <Detail label="Assignment Type" value={row.assignmentType} />
            <Detail label="Assigned To" value={row.assignedTo} />
            <Detail label="Job#" value={row.jobNumber} />
            <Detail label="Location" value={row.toolRoomLocation} />
            <Detail label="Transfer Date In" value={row.transferDateIn} />
            <Detail label="Transfer Date Out" value={row.transferDateOut} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div
      style={{
        background: "#141414",
        border: "1px solid #2f2f2f",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div style={{ fontSize: 12, color: "#a3a3a3", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#f5f5f5" }}>{value || "-"}</div>
    </div>
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

const smallButtonStyle: React.CSSProperties = {
  border: "1px solid #3a3a3a",
  borderRadius: 8,
  padding: "8px 12px",
  color: "white",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  background: "#2a2a2a",
};

const pickupRowStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  background: "#141414",
  border: "1px solid #2f2f2f",
  borderRadius: 10,
  padding: 12,
};

const lineCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  background: "#141414",
  border: "1px solid #2f2f2f",
  borderRadius: 10,
  padding: 14,
};

const lineMetaStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 13,
  color: "#a3a3a3",
  background: "#101010",
  border: "1px solid #262626",
  borderRadius: 8,
  padding: "10px 12px",
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

const qtyInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #3a3a3a",
  fontSize: 14,
  boxSizing: "border-box",
  background: "#121212",
  color: "#f5f5f5",
};

const cardStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 14,
  padding: 16,
  display: "grid",
  gap: 14,
  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
};