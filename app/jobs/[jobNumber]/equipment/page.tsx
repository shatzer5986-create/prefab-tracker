"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Section from "@/components/Section";
import StatCard from "@/components/StatCard";
import RequestsTable from "@/components/RequestsTable";

import type {
  AppData,
  Employee,
  EquipmentItem,
  Job,
  JobRequest,
  JobRequestLine,
} from "@/types";

const STORAGE_KEY = "prefab-tracker-v7";
const MASTER_EQUIPMENT_KEY = "master-equipment-inventory-v1";
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

function loadStoredEquipment(): EquipmentItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(MASTER_EQUIPMENT_KEY);
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

function normalizeEmployeeName(value: unknown) {
  return safeString(value).toLowerCase();
}

function cleanEmployees(rows: Employee[]) {
  return rows
    .filter((employee) => employee && typeof employee === "object")
    .filter((employee) => safeString(employee.name))
    .reduce<Employee[]>((acc, employee) => {
      const exists = acc.some(
        (row) => normalizeEmployeeName(row.name) === normalizeEmployeeName(employee.name)
      );
      if (!exists) acc.push(employee);
      return acc;
    }, [])
    .sort((a, b) => safeString(a.name).localeCompare(safeString(b.name)));
}

function isShopLocation(value: string) {
  const normalized = safeString(value).toLowerCase();
  return SHOP_LOCATIONS.some((loc) => loc.toLowerCase() === normalized);
}

function buildEquipmentTitle(item: EquipmentItem) {
  return (
    [
      safeString(item.description),
      safeString(item.itemNumber),
      safeString(item.manufacturer),
      safeString(item.model),
      safeString(item.assetNumber),
    ]
      .filter(Boolean)
      .join(" • ") || "Equipment"
  );
}

function buildEquipmentSubtitle(item: EquipmentItem) {
  return [
    safeString(item.assetType),
    safeString(item.category),
    safeString(item.barcode) ? `Barcode: ${safeString(item.barcode)}` : "",
    safeString(item.serialNumber) ? `Serial: ${safeString(item.serialNumber)}` : "",
    safeString(item.status) ? `Status: ${safeString(item.status)}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
}

function buildEquipmentLocation(item: EquipmentItem) {
  if (safeString(item.assignmentType) === "Person") {
    return item.assignedTo ? `Assigned to ${item.assignedTo}` : "Assigned to person";
  }

  if (safeString(item.assignmentType) === "Job") {
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

  return safeString(item.toolRoomLocation) || "Unassigned";
}

function getAvailableQty(item: EquipmentItem) {
  const qty = safeNumber((item as any).quantityAvailable, NaN);

  if (Number.isFinite(qty)) return Math.max(qty, 0);

  const fallbackQty = safeNumber((item as any).quantity, 1);
  return Math.max(fallbackQty, 0);
}

function createEmptyRequestLine(): RequestLineDraft {
  return {
    rowId: Date.now() + Math.floor(Math.random() * 100000),
    category: "",
    inventoryItemId: "",
    quantity: 1,
  };
}

function dedupeEquipment(rows: EquipmentItem[]) {
  const map = new Map<number, EquipmentItem>();

  for (const row of rows) {
    const id = Number((row as any)?.id);
    if (!Number.isFinite(id)) continue;
    if (!map.has(id)) map.set(id, row);
  }

  return Array.from(map.values());
}

function sortEquipment(rows: EquipmentItem[]) {
  return [...rows].sort((a, b) => {
    const categoryCompare = safeString(a.category).localeCompare(safeString(b.category));
    if (categoryCompare !== 0) return categoryCompare;
    return buildEquipmentTitle(a).localeCompare(buildEquipmentTitle(b));
  });
}

function getEquipmentCategories(rows: EquipmentItem[]) {
  return Array.from(
    new Set(
      rows
        .map((item) => safeString(item.category))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
}

export default function JobEquipmentPage() {
  const params = useParams<{ jobNumber: string }>();
  const jobNumber = decodeURIComponent(params.jobNumber);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [equipmentInventory, setEquipmentInventory] = useState<EquipmentItem[]>([]);
  const [requests, setRequests] = useState<JobRequest[]>([]);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showPickupForm, setShowPickupForm] = useState(false);

  const [requestDestinationType, setRequestDestinationType] = useState<"Job" | "Person">("Job");
  const [requestDestinationPerson, setRequestDestinationPerson] = useState("");
  const [requestLines, setRequestLines] = useState<RequestLineDraft[]>([createEmptyRequestLine()]);
  const [requestRequestedBy, setRequestRequestedBy] = useState("");
  const [requestNeededBy, setRequestNeededBy] = useState("");
  const [requestNotes, setRequestNotes] = useState("");

  const [pickupFromType, setPickupFromType] = useState<"Job" | "Person">("Job");
  const [pickupFromPerson, setPickupFromPerson] = useState("");
  const [pickupLines, setPickupLines] = useState<RequestLineDraft[]>([createEmptyRequestLine()]);
  const [pickupRequestedBy, setPickupRequestedBy] = useState("");
  const [pickupNeededBy, setPickupNeededBy] = useState("");
  const [pickupToLocation, setPickupToLocation] = useState("Shop");
  const [pickupNotes, setPickupNotes] = useState("");

  function refreshFromStorage() {
    const parsed = loadStoredAppData();
    const masterEquipment = loadStoredEquipment();
    const appEquipment = parsed?.equipmentInventory || fallbackData.equipmentInventory || [];
    const mergedEquipment = dedupeEquipment([...masterEquipment, ...appEquipment]);

    setEquipmentInventory(sortEquipment(mergedEquipment));
    setJobs(parsed?.jobs || fallbackData.jobs);
  }

  async function loadEmployeesFromApi() {
    try {
      const response = await fetch("/api/employees", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load employees");

      const rows = await response.json();
      const data = Array.isArray(rows) ? rows : [];
      setEmployees(cleanEmployees(data));
    } catch (error) {
      console.error("Loading employees failed:", error);
      setEmployees([]);
    }
  }

  async function refreshRequestsFromApi() {
    try {
      const response = await fetch("/api/requests", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load requests");
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Loading requests failed:", error);
      setRequests([]);
    }
  }

  async function createSharedRequest(newRequest: JobRequest) {
    const response = await fetch("/api/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newRequest),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || "Failed to create request");
    }

    return data;
  }

  function resetRequestForm() {
    setRequestDestinationType("Job");
    setRequestDestinationPerson("");
    setRequestLines([createEmptyRequestLine()]);
    setRequestRequestedBy("");
    setRequestNeededBy("");
    setRequestNotes("");
  }

  function resetPickupForm() {
    setPickupFromType("Job");
    setPickupFromPerson("");
    setPickupLines([createEmptyRequestLine()]);
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

    async function init() {
      await loadJobs();
      refreshFromStorage();
      await refreshRequestsFromApi();
      await loadEmployeesFromApi();
    }

    init();

    const handleFocus = () => {
      refreshFromStorage();
      refreshRequestsFromApi();
      loadEmployeesFromApi();
    };

    const handleStorage = () => {
      refreshFromStorage();
      refreshRequestsFromApi();
      loadEmployeesFromApi();
    };

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
    return cleanEmployees(employees).map((employee) => safeString(employee.name));
  }, [employees]);

  const assignedEquipment = useMemo(
    () =>
      equipmentInventory.filter(
        (item) =>
          safeString(item.assignmentType) === "Job" &&
          safeString(item.jobNumber) === safeString(jobNumber)
      ),
    [equipmentInventory, jobNumber]
  );

  const assignedPersonEquipment = useMemo(
    () =>
      equipmentInventory.filter(
        (item) =>
          safeString(item.assignmentType) === "Person" &&
          safeString(item.assignedTo)
      ),
    [equipmentInventory]
  );

  const peopleWithAssignedEquipment = useMemo(() => {
    return Array.from(
      new Set(
        assignedPersonEquipment
          .map((item) => safeString(item.assignedTo))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [assignedPersonEquipment]);

  const availableEquipment = useMemo(
    () =>
      sortEquipment(
        equipmentInventory.filter((item) => {
          if (safeString(item.status) && safeString(item.status) !== "Working") return false;
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
      ),
    [equipmentInventory]
  );

  const requestCategories = useMemo(
  () => getEquipmentCategories(equipmentInventory),
  [equipmentInventory]
);

  const pickupSourceEquipment = useMemo(() => {
    if (pickupFromType === "Job") {
      return sortEquipment(assignedEquipment);
    }

    return sortEquipment(
      equipmentInventory.filter(
        (item) =>
          safeString(item.assignmentType) === "Person" &&
          safeString(item.assignedTo) === safeString(pickupFromPerson)
      )
    );
  }, [pickupFromType, pickupFromPerson, assignedEquipment, equipmentInventory]);

  const pickupCategories = useMemo(
    () => getEquipmentCategories(pickupSourceEquipment),
    [pickupSourceEquipment]
  );

  const equipmentRequests = useMemo(
    () =>
      requests.filter(
        (item) =>
          safeString(item.jobNumber) === safeString(jobNumber) &&
          (item.lines || []).some((line) => line.type === "Equipment")
      ),
    [requests, jobNumber]
  );

  const totalAssignedQty = useMemo(
    () => assignedEquipment.reduce((sum, row) => sum + getAvailableQty(row), 0),
    [assignedEquipment]
  );

  const damagedCount = useMemo(
    () => assignedEquipment.filter((row) => safeString(row.status) === "Damaged").length,
    [assignedEquipment]
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
    options?: { resetSelection?: boolean }
  ) {
    setRequestLines((prev) =>
      prev.map((line) => {
        if (line.rowId !== rowId) return line;

        const next: RequestLineDraft = {
          ...line,
          ...patch,
        };

        if (options?.resetSelection) {
          next.inventoryItemId = "";
          next.quantity = 1;
        }

        return next;
      })
    );
  }

  function getLineEquipmentOptions(line: RequestLineDraft) {
  const category = safeString(line.category);
  if (!category) return [];

  return sortEquipment(
    equipmentInventory.filter((item) => safeString(item.category) === category)
  );
}

  function addPickupLine() {
    setPickupLines((prev) => [...prev, createEmptyRequestLine()]);
  }

  function removePickupLine(rowId: number) {
    setPickupLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((line) => line.rowId !== rowId);
    });
  }

  function updatePickupLine(
    rowId: number,
    patch: Partial<RequestLineDraft>,
    options?: { resetSelection?: boolean }
  ) {
    setPickupLines((prev) =>
      prev.map((line) => {
        if (line.rowId !== rowId) return line;

        const next: RequestLineDraft = {
          ...line,
          ...patch,
        };

        if (options?.resetSelection) {
          next.inventoryItemId = "";
          next.quantity = 1;
        }

        return next;
      })
    );
  }

  function getPickupEquipmentOptions(line: RequestLineDraft) {
    const category = safeString(line.category);
    if (!category) return [];

    return pickupSourceEquipment
      .filter((item) => safeString(item.category) === category)
      .sort((a, b) => buildEquipmentTitle(a).localeCompare(buildEquipmentTitle(b)));
  }

  async function createEquipmentRequest() {
    if (!safeString(requestRequestedBy)) {
      alert("Select Requested By.");
      return;
    }

    if (requestDestinationType === "Person" && !safeString(requestDestinationPerson)) {
      alert("Select the employee destination.");
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

    const missingEquipment = cleanedLines.find((line) => line.inventoryItemId === "");
    if (missingEquipment) {
      alert("Each request line needs an equipment item.");
      return;
    }

    const validatedSelections: Array<{
      item: EquipmentItem;
      qty: number;
    }> = [];

    const duplicateCheck = new Set<number>();

    for (const line of cleanedLines) {
      const selectedId = Number(line.inventoryItemId);
      const item = availableEquipment.find(
        (equipment) => Number((equipment as any).id) === selectedId
      );

      if (!item) {
        alert("One of the selected equipment items is no longer available. Please reselect it.");
        return;
      }

      if (duplicateCheck.has(selectedId)) {
        alert("The same equipment item is selected more than once. Use one line per item.");
        return;
      }

      duplicateCheck.add(selectedId);

      const qty = Math.max(1, Number(line.quantity) || 1);
      const maxQty = getAvailableQty(item);

      if (qty < 1 || qty > maxQty) {
        alert(
          `Requested quantity for ${buildEquipmentTitle(item)} must be between 1 and ${maxQty}.`
        );
        return;
      }

      validatedSelections.push({ item, qty });
    }

    const lines: JobRequestLine[] = validatedSelections.map(({ item, qty }, index) => ({
      id: Date.now() + index + 1,
      type: "Equipment",
      category: safeString(item.category),
      itemName: buildEquipmentTitle(item),
      description: [buildEquipmentSubtitle(item), buildEquipmentLocation(item)]
        .filter(Boolean)
        .join(" | "),
      quantity: qty,
      unit: "ea",
      inventoryItemId: (item as any).id,
      inventorySnapshot: JSON.stringify(item),
    }));

    const newRequest: JobRequest = {
      id: Date.now(),
      destinationType: requestDestinationType,
      requestFlow: "To Job",
      jobNumber: requestDestinationType === "Job" ? jobNumber : "",
      requestedForPerson:
        requestDestinationType === "Person" ? safeString(requestDestinationPerson) : "",
      requestedBy: safeString(requestRequestedBy),
      requestDate: new Date().toISOString().slice(0, 10),
      neededBy: requestNeededBy,
      status: "Open",
      notes: safeString(requestNotes),
      fromLocation: "Shop",
      toLocation:
        requestDestinationType === "Job"
          ? jobNumber
          : `Person: ${safeString(requestDestinationPerson)}`,
      lines,
      workflowStatus: "Request Submitted",
      pickTicketId: null,
      pickTicketNumber: "",
      transferTicketId: null,
      transferTicketNumber: "",
      deliveredToSiteAt: "",
      assignedToJobAt: "",
    };

    try {
      await createSharedRequest(newRequest);
      await refreshRequestsFromApi();
      resetRequestForm();
      setShowRequestForm(false);
    } catch (error) {
      console.error("Creating equipment request failed:", error);
      alert(error instanceof Error ? error.message : "Failed to create request.");
    }
  }

  async function createPickupRequest() {
    if (!safeString(pickupRequestedBy)) {
      alert("Select Requested By.");
      return;
    }

    if (pickupFromType === "Person" && !safeString(pickupFromPerson)) {
      alert("Select the assigned person.");
      return;
    }

    const cleanedLines = pickupLines.filter(
      (line) => safeString(line.category) || line.inventoryItemId !== ""
    );

    if (!cleanedLines.length) {
      alert("Add at least one pickup line.");
      return;
    }

    const missingCategory = cleanedLines.find((line) => !safeString(line.category));
    if (missingCategory) {
      alert("Each pickup line needs a category.");
      return;
    }

    const missingEquipment = cleanedLines.find((line) => line.inventoryItemId === "");
    if (missingEquipment) {
      alert("Each pickup line needs an equipment item.");
      return;
    }

    const validatedSelections: Array<{
      item: EquipmentItem;
      qty: number;
    }> = [];

    const duplicateCheck = new Set<number>();

    for (const line of cleanedLines) {
      const selectedId = Number(line.inventoryItemId);
      const item = pickupSourceEquipment.find(
        (equipment) => Number((equipment as any).id) === selectedId
      );

      if (!item) {
        alert(
          "One of the selected pickup equipment items is no longer valid. Please reselect it."
        );
        return;
      }

      if (duplicateCheck.has(selectedId)) {
        alert("The same equipment item is selected more than once. Use one line per item.");
        return;
      }

      duplicateCheck.add(selectedId);

      const qty = Math.max(1, Number(line.quantity) || 1);
      const maxQty = getAvailableQty(item);

      if (qty < 1 || qty > maxQty) {
        alert(
          `Requested quantity for ${buildEquipmentTitle(item)} must be between 1 and ${maxQty}.`
        );
        return;
      }

      validatedSelections.push({ item, qty });
    }

    const lines: JobRequestLine[] = validatedSelections.map(({ item, qty }, index) => ({
      id: Date.now() + index + 1,
      type: "Equipment",
      category: safeString(item.category),
      itemName: buildEquipmentTitle(item),
      description: [buildEquipmentSubtitle(item), buildEquipmentLocation(item)]
        .filter(Boolean)
        .join(" | "),
      quantity: qty,
      unit: "ea",
      inventoryItemId: (item as any).id,
      inventorySnapshot: JSON.stringify(item),
    }));

    const fromLocation =
      pickupFromType === "Person"
        ? `Person: ${safeString(pickupFromPerson)}`
        : jobNumber;

    const newRequest: JobRequest = {
      id: Date.now(),
      destinationType: "Job",
      requestFlow: "From Job",
      jobNumber,
      requestedForPerson: pickupFromType === "Person" ? safeString(pickupFromPerson) : "",
      requestedBy: safeString(pickupRequestedBy),
      requestDate: new Date().toISOString().slice(0, 10),
      neededBy: pickupNeededBy,
      status: "Open",
      notes: safeString(pickupNotes),
      fromLocation,
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

    try {
      await createSharedRequest(newRequest);
      await refreshRequestsFromApi();
      resetPickupForm();
      setShowPickupForm(false);
    } catch (error) {
      console.error("Creating pickup request failed:", error);
      alert(error instanceof Error ? error.message : "Failed to create request.");
    }
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
              <h1 style={heroTitleStyle}>Job Equipment</h1>
              <p style={heroSubtitleStyle}>
                {currentJob
                  ? `${currentJob.jobNumber} • ${currentJob.name || "Unnamed Job"}`
                  : jobNumber}
              </p>
            </div>

            <JobNavTabs jobNumber={jobNumber} active="equipment" />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <StatCard title="Assigned Equipment Records" value={String(assignedEquipment.length)} />
          <StatCard title="Assigned Quantity" value={String(totalAssignedQty)} />
          <StatCard title="Damaged" value={String(damagedCount)} />
          <StatCard title="Open Equipment Requests" value={String(equipmentRequests.length)} />
        </div>

        <Section title="Equipment Requests">
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
                {showRequestForm ? "Close Request Form" : "Request Equipment"}
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
                  Request Equipment from Shop
                </div>

                <div style={{ fontSize: 13, color: "#d1d5db" }}>
                  Pick a category first, then choose the equipment name from that category.
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  <Field label="Destination Type">
                    <select
                      value={requestDestinationType}
                      onChange={(e) => {
                        const nextType = e.target.value === "Person" ? "Person" : "Job";
                        setRequestDestinationType(nextType);
                        setRequestDestinationPerson("");
                      }}
                      style={fieldInputStyle}
                    >
                      <option value="Job">Job</option>
                      <option value="Person">Person</option>
                    </select>
                  </Field>

                  {requestDestinationType === "Person" ? (
                    <Field label="Send To Employee">
                      <select
                        value={requestDestinationPerson}
                        onChange={(e) => setRequestDestinationPerson(e.target.value)}
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
                  ) : null}

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
                    const equipmentOptions = getLineEquipmentOptions(line);
                    const selectedEquipment =
                      line.inventoryItemId === ""
                        ? null
                        : availableEquipment.find(
                            (equipment) => Number((equipment as any).id) === line.inventoryItemId
                          ) || null;

                    const maxQty = selectedEquipment
                      ? Math.max(getAvailableQty(selectedEquipment), 1)
                      : 1;

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
                                  { resetSelection: true }
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

                          <Field label="Equipment Name">
                            <select
                              value={line.inventoryItemId === "" ? "" : String(line.inventoryItemId)}
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
                                {line.category ? "Select equipment" : "Select category first"}
                              </option>
                              {equipmentOptions.map((item) => (
                                <option key={(item as any).id} value={String((item as any).id)}>
                                  {[
                                    buildEquipmentTitle(item),
                                    safeString(item.status),
                                    safeString(item.toolRoomLocation) ||
                                      safeString(item.assignmentType),
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
                              disabled={!selectedEquipment}
                            />
                          </Field>
                        </div>

                        {selectedEquipment ? (
                          <div style={lineMetaStyle}>
                            <div>{buildEquipmentSubtitle(selectedEquipment)}</div>
                            <div>
                              Qty Available: {getAvailableQty(selectedEquipment)} •{" "}
                              {buildEquipmentLocation(selectedEquipment)}
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
                    onClick={createEquipmentRequest}
                    style={{
                      ...requestButtonStyle,
                      background: "#c2410c",
                      border: "1px solid #ea580c",
                    }}
                  >
                    Send Equipment Request
                  </button>
                </div>

                <div style={emptyStateStyle}>
                  {availableEquipment.length === 0
                    ? "No available shop equipment was found. Check the master equipment list and local app storage."
                    : `${availableEquipment.length} available equipment record(s) found across shop locations.`}
                </div>
              </div>
            ) : null}

            {showPickupForm ? (
              <div style={panelCardStyle}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>
                  Request Pickup
                </div>

                <div style={{ fontSize: 13, color: "#d1d5db" }}>
                  Choose whether you are pulling equipment from this job or from a specific person.
                  Categories and equipment names only show what is actually assigned to that source.
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  <Field label="Pickup From Type">
                    <select
                      value={pickupFromType}
                      onChange={(e) => {
                        const nextType = e.target.value === "Person" ? "Person" : "Job";
                        setPickupFromType(nextType);
                        setPickupFromPerson("");
                        setPickupLines([createEmptyRequestLine()]);
                      }}
                      style={fieldInputStyle}
                    >
                      <option value="Job">This Job</option>
                      <option value="Person">Assigned Person</option>
                    </select>
                  </Field>

                  {pickupFromType === "Person" ? (
                    <Field label="Assigned Person">
                      <select
                        value={pickupFromPerson}
                        onChange={(e) => {
                          setPickupFromPerson(e.target.value);
                          setPickupLines([createEmptyRequestLine()]);
                        }}
                        style={fieldInputStyle}
                      >
                        <option value="">Select person</option>
                        {peopleWithAssignedEquipment.map((person) => (
                          <option key={person} value={person}>
                            {person}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : null}

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

                <div style={{ display: "grid", gap: 12 }}>
                  {pickupLines.map((line, index) => {
                    const equipmentOptions = getPickupEquipmentOptions(line);
                    const selectedEquipment =
                      line.inventoryItemId === ""
                        ? null
                        : pickupSourceEquipment.find(
                            (equipment) => Number((equipment as any).id) === line.inventoryItemId
                          ) || null;

                    const maxQty = selectedEquipment
                      ? Math.max(getAvailableQty(selectedEquipment), 1)
                      : 1;

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
                            Pickup Line {index + 1}
                          </div>

                          <button
                            type="button"
                            onClick={() => removePickupLine(line.rowId)}
                            disabled={pickupLines.length === 1}
                            style={{
                              ...smallButtonStyle,
                              opacity: pickupLines.length === 1 ? 0.5 : 1,
                              cursor: pickupLines.length === 1 ? "not-allowed" : "pointer",
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
                                updatePickupLine(
                                  line.rowId,
                                  { category: e.target.value },
                                  { resetSelection: true }
                                )
                              }
                              style={fieldInputStyle}
                              disabled={pickupFromType === "Person" && !pickupFromPerson}
                            >
                              <option value="">
                                {pickupFromType === "Person" && !pickupFromPerson
                                  ? "Select person first"
                                  : "Select category"}
                              </option>
                              {pickupCategories.map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </Field>

                          <Field label="Equipment Name">
                            <select
                              value={line.inventoryItemId === "" ? "" : String(line.inventoryItemId)}
                              onChange={(e) =>
                                updatePickupLine(line.rowId, {
                                  inventoryItemId: e.target.value ? Number(e.target.value) : "",
                                  quantity: 1,
                                })
                              }
                              style={fieldInputStyle}
                              disabled={!line.category}
                            >
                              <option value="">
                                {line.category ? "Select equipment" : "Select category first"}
                              </option>
                              {equipmentOptions.map((item) => (
                                <option key={(item as any).id} value={String((item as any).id)}>
                                  {[
                                    buildEquipmentTitle(item),
                                    safeString(item.status),
                                    buildEquipmentLocation(item),
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
                                updatePickupLine(line.rowId, {
                                  quantity: Math.min(
                                    Math.max(Number(e.target.value) || 1, 1),
                                    maxQty
                                  ),
                                })
                              }
                              style={fieldInputStyle}
                              disabled={!selectedEquipment}
                            />
                          </Field>
                        </div>

                        {selectedEquipment ? (
                          <div style={lineMetaStyle}>
                            <div>{buildEquipmentSubtitle(selectedEquipment)}</div>
                            <div>
                              Qty Assigned: {getAvailableQty(selectedEquipment)} •{" "}
                              {buildEquipmentLocation(selectedEquipment)}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={addPickupLine} style={secondaryButtonStyle}>
                    Add Pickup Line
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

                <div style={emptyStateStyle}>
                  {pickupSourceEquipment.length === 0
                    ? pickupFromType === "Person"
                      ? "No equipment is assigned to that person."
                      : "No equipment is currently assigned to this job."
                    : `${pickupSourceEquipment.length} assigned equipment record(s) available for pickup.`}
                </div>
              </div>
            ) : null}

            <RequestsTable rows={equipmentRequests} />
          </div>
        </Section>

        <Section title="Assigned Equipment on This Job">
          {assignedEquipment.length === 0 ? (
            <div style={emptyStateStyle}>No equipment is currently assigned to this job.</div>
          ) : (
            <EquipmentCards rows={assignedEquipment} />
          )}
        </Section>

        <Section title="Available Shop Equipment">
          {availableEquipment.length === 0 ? (
            <div style={emptyStateStyle}>No available equipment found in shop locations.</div>
          ) : (
            <EquipmentCards rows={availableEquipment} />
          )}
        </Section>
      </div>
    </div>
  );
}

function EquipmentCards({ rows }: { rows: EquipmentItem[] }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {rows.map((row) => (
        <div key={(row as any).id} style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>
                {buildEquipmentTitle(row)}
              </div>
              <div style={{ color: "#d1d5db", fontSize: 14 }}>{buildEquipmentSubtitle(row)}</div>
              <div style={{ color: "#a3a3a3", fontSize: 13 }}>{buildEquipmentLocation(row)}</div>
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
              Qty {getAvailableQty(row)}
            </div>
          </div>

          <div style={detailsGridStyle}>
            <Detail label="Asset Type" value={row.assetType} />
            <Detail label="Category" value={row.category} />
            <Detail label="Barcode" value={row.barcode} />
            <Detail label="Item Number" value={row.itemNumber} />
            <Detail label="Asset Number" value={row.assetNumber} />
            <Detail label="Manufacturer" value={row.manufacturer} />
            <Detail label="Model" value={row.model} />
            <Detail label="Serial Number" value={row.serialNumber} />
            <Detail label="Quantity" value={String(getAvailableQty(row))} />
            <Detail label="Assignment Type" value={row.assignmentType} />
            <Detail label="Assigned To" value={row.assignedTo} />
            <Detail label="Job#" value={row.jobNumber} />
            <Detail label="Location" value={row.toolRoomLocation} />
            <Detail label="Transfer Date In" value={row.transferDateIn} />
            <Detail label="Transfer Date Out" value={row.transferDateOut} />
            <Detail label="Status" value={row.status} />
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