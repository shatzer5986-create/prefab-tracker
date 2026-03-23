"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { inputStyle } from "@/components/InputBlock";
import Section from "@/components/Section";
import StatCard from "@/components/StatCard";
import EquipmentTable from "@/components/EquipmentTable";
import RequestsTable from "@/components/RequestsTable";

import type {
  AppData,
  AppNotification,
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

function normalizeEmployeeName(value: unknown) {
  return safeString(value).toLowerCase();
}

function cleanEmployees(rows: Employee[]) {
  return rows
    .filter((employee) => employee && typeof employee === "object")
    .filter((employee) => safeString(employee.name))
    .reduce<Employee[]>((acc, employee) => {
      const exists = acc.some(
        (row) =>
          normalizeEmployeeName(row.name) === normalizeEmployeeName(employee.name)
      );
      if (!exists) acc.push(employee);
      return acc;
    }, [])
    .sort((a, b) => safeString(a.name).localeCompare(safeString(b.name)));
}

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isShopLocation(value: string) {
  const normalized = safeString(value).toLowerCase();
  return SHOP_LOCATIONS.some((loc) => loc.toLowerCase() === normalized);
}

function buildEquipmentLocation(item: EquipmentItem) {
  if (item.assignmentType === "Tool Room") {
    return item.toolRoomLocation
      ? `Tool Room: ${item.toolRoomLocation}`
      : "Tool Room";
  }

  if (item.assignmentType === "Shop") return "Shop";
  if (item.assignmentType === "Yard") return "Yard";
  if (item.assignmentType === "WH1") return "WH1";
  if (item.assignmentType === "WH2") return "WH2";

  if (item.assignmentType === "Person") {
    return item.assignedTo ? `Assigned to ${item.assignedTo}` : "Assigned to person";
  }

  if (item.assignmentType === "Job") {
    return item.jobNumber ? `Assigned to job ${item.jobNumber}` : "Assigned to job";
  }

  return "Unassigned";
}

function buildEquipmentTitle(item: EquipmentItem) {
  const assetType = safeString(item.assetType);
  const assetNumber = safeString(item.assetNumber);
  const year = safeString(item.year);
  const manufacturer = safeString(item.manufacturer);
  const model = safeString(item.model);
  const description = safeString(item.description);

  return (
    [
      assetType,
      assetNumber,
      year,
      manufacturer,
      model,
      description && description !== model ? description : "",
    ]
      .filter(Boolean)
      .join(" • ") || "Equipment"
  );
}

function buildEquipmentSubtitle(item: EquipmentItem) {
  const category = safeString(item.category);
  const itemNumber = safeString(item.itemNumber);
  const barcode = safeString(item.barcode);
  const serialNumber = safeString(item.serialNumber);
  const licensePlate = safeString(item.licensePlate);
  const vinSerial = safeString(item.vinSerial);
  const status = safeString(item.status);

  return [
    category,
    itemNumber ? `Item #: ${itemNumber}` : "",
    barcode ? `Barcode: ${barcode}` : "",
    serialNumber ? `Serial: ${serialNumber}` : "",
    licensePlate ? `Plate: ${licensePlate}` : "",
    vinSerial ? `VIN/Serial: ${vinSerial}` : "",
    status ? `Status: ${status}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
}

function getAvailableQty(item: EquipmentItem) {
  const qty = Math.max(safeNumber(item.quantityAvailable, 0), 0);

  if (qty > 0) return qty;

  const assetType = safeString(item.assetType).toLowerCase();
  const hasUniqueIdentity =
    !!safeString(item.assetNumber) ||
    !!safeString(item.serialNumber) ||
    !!safeString(item.vinSerial) ||
    !!safeString(item.licensePlate);

  const singleAssetTypes = ["vehicle", "trailer", "equipment"];

  if (singleAssetTypes.includes(assetType) || hasUniqueIdentity) {
    return 1;
  }

  return 0;
}
function createEmptyRequestLine(): RequestLineDraft {
  return {
    rowId: Date.now() + Math.floor(Math.random() * 100000),
    category: "",
    inventoryItemId: "",
    quantity: 1,
  };
}

export default function JobEquipmentPage() {
  const params = useParams<{ jobNumber: string }>();
  const jobNumber = decodeURIComponent(params.jobNumber);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [equipmentInventory, setEquipmentInventory] = useState<EquipmentItem[]>([]);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showPickupForm, setShowPickupForm] = useState(false);

  const [requestLines, setRequestLines] = useState<RequestLineDraft[]>([createEmptyRequestLine()]);
  const [requestRequestedBy, setRequestRequestedBy] = useState("");
  const [requestNeededBy, setRequestNeededBy] = useState("");
  const [requestNotes, setRequestNotes] = useState("");

  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([]);
  const [selectedEquipmentQtys, setSelectedEquipmentQtys] = useState<Record<number, number>>({});
  const [pickupRequestedBy, setPickupRequestedBy] = useState("");
  const [pickupNeededBy, setPickupNeededBy] = useState("");
  const [pickupToLocation, setPickupToLocation] = useState("Shop");
  const [pickupNotes, setPickupNotes] = useState("");

  function refreshFromStorage() {
    const parsed = loadStoredAppData();

    setEquipmentInventory(loadStoredEquipment());
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
      equipmentInventory: latest.equipmentInventory || [],
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
    setSelectedEquipmentIds([]);
    setSelectedEquipmentQtys({});
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

  const filteredEquipment = useMemo(
    () =>
      equipmentInventory.filter(
        (item) =>
          safeString(item.assignmentType) === "Job" &&
          safeString(item.jobNumber) === safeString(jobNumber)
      ),
    [equipmentInventory, jobNumber]
  );

  const requestableEquipment = useMemo(
    () =>
      [...equipmentInventory]
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
          return buildEquipmentTitle(a).localeCompare(buildEquipmentTitle(b));
        }),
    [equipmentInventory]
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

  const employeeOptions = useMemo(() => {
  return [...employees]
    .filter((employee) => employee.name?.trim())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((employee) => employee.name);
}, [employees]);

  const requestCategories = useMemo(() => {
    return Array.from(
      new Set(
        equipmentInventory
          .map((item) => safeString(item.category))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [equipmentInventory]);

  const totalQty = useMemo(
    () =>
      filteredEquipment.reduce((sum, row) => sum + safeNumber(row.quantityAvailable, 0), 0),
    [filteredEquipment]
  );

  const assignedToPersonCount = useMemo(
    () => filteredEquipment.filter((row) => row.assignmentType === "Person").length,
    [filteredEquipment]
  );

  const storedCount = useMemo(
    () =>
      filteredEquipment.filter(
        (row) =>
          row.assignmentType === "Tool Room" ||
          row.assignmentType === "Shop" ||
          row.assignmentType === "Yard" ||
          row.assignmentType === "WH1" ||
          row.assignmentType === "WH2"
      ).length,
    [filteredEquipment]
  );

  const workingCount = useMemo(
    () => filteredEquipment.filter((row) => row.status === "Working").length,
    [filteredEquipment]
  );

  const damagedCount = useMemo(
    () => filteredEquipment.filter((row) => row.status === "Damaged").length,
    [filteredEquipment]
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

    return equipmentInventory
      .filter((item) => safeString(item.category) === category)
      .sort((a, b) => buildEquipmentTitle(a).localeCompare(buildEquipmentTitle(b)));
  }

  function createEquipmentRequest() {
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

    const missingItem = cleanedLines.find((line) => line.inventoryItemId === "");
    if (missingItem) {
      alert("Each request line needs an equipment item.");
      return;
    }

    const validatedSelections: Array<{
      line: RequestLineDraft;
      item: EquipmentItem;
      qty: number;
    }> = [];

    const duplicateCheck = new Set<number>();

    for (const line of cleanedLines) {
      const selectedId = Number(line.inventoryItemId);
      const item = equipmentInventory.find((row) => Number(row.id) === selectedId);

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

      validatedSelections.push({
        line,
        item,
        qty,
      });
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
      title: "Equipment request submitted",
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

  function toggleSelectedEquipment(id: number) {
    setSelectedEquipmentIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((value) => value !== id);
        setSelectedEquipmentQtys((current) => {
          const updated = { ...current };
          delete updated[id];
          return updated;
        });
        return next;
      }

      const selectedItem = filteredEquipment.find((item) => item.id === id);
      const defaultQty = Math.max(Math.min(getAvailableQty(selectedItem as EquipmentItem), 1), 1);

      setSelectedEquipmentQtys((current) => ({
        ...current,
        [id]: defaultQty,
      }));

      return [...prev, id];
    });
  }

  function updateSelectedEquipmentQty(id: number, qty: number) {
    setSelectedEquipmentQtys((prev) => ({
      ...prev,
      [id]: Math.max(1, qty || 1),
    }));
  }

  function toggleAllEquipmentForPickup() {
    const allIds = filteredEquipment.map((item) => item.id);

    setSelectedEquipmentIds((prev) => {
      if (prev.length === allIds.length) {
        setSelectedEquipmentQtys({});
        return [];
      }

      const qtyMap: Record<number, number> = {};
      for (const item of filteredEquipment) {
        qtyMap[item.id] = Math.max(Math.min(getAvailableQty(item), 1), 1);
      }

      setSelectedEquipmentQtys(qtyMap);
      return allIds;
    });
  }

  function createPickupRequest() {
    if (!selectedEquipmentIds.length) {
      alert("Select at least one equipment item.");
      return;
    }

    if (!safeString(pickupRequestedBy)) {
      alert("Select Requested By.");
      return;
    }

    const selectedItems = filteredEquipment.filter((item) =>
      selectedEquipmentIds.includes(item.id)
    );

    if (!selectedItems.length) {
      alert("No selected equipment found.");
      return;
    }

    const invalidQtyItem = selectedItems.find((item) => {
      const requestedQty = safeNumber(selectedEquipmentQtys[item.id], 1);
      const maxQty = getAvailableQty(item);
      return requestedQty < 1 || requestedQty > maxQty;
    });

    if (invalidQtyItem) {
      alert(
        `Requested quantity for ${buildEquipmentTitle(
          invalidQtyItem
        )} must be between 1 and ${getAvailableQty(invalidQtyItem)}.`
      );
      return;
    }

    const lines: JobRequestLine[] = selectedItems.map((item, index) => ({
      id: Date.now() + index + 1,
      type: "Equipment",
      category: safeString(item.category),
      itemName: buildEquipmentTitle(item),
      description: [buildEquipmentSubtitle(item), buildEquipmentLocation(item)]
        .filter(Boolean)
        .join(" | "),
      quantity: safeNumber(selectedEquipmentQtys[item.id], 1),
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
      title: "Equipment pickup request submitted",
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
    <main style={pageStyle}>
      <div style={containerStyle}>
        <div style={heroStyle}>
          <div>
            <Link href={`/jobs/${encodeURIComponent(jobNumber)}`} style={backLinkStyle}>
              ← Back to Job Dashboard
            </Link>

            <h1 style={heroTitleStyle}>Equipment</h1>

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
          <StatCard title="Assigned Equipment Rows" value={String(filteredEquipment.length)} />
          <StatCard
            title="Master Equipment List Rows"
            value={String(equipmentInventory.length)}
          />
          <StatCard title="Requestable Equipment Rows" value={String(requestableEquipment.length)} />
          <StatCard title="Total Qty" value={String(totalQty)} />
          <StatCard title="Assigned to Person" value={String(assignedToPersonCount)} />
          <StatCard title="Stored / Yard / WH" value={String(storedCount)} />
          <StatCard title="Working" value={String(workingCount)} />
          <StatCard title="Damaged" value={String(damagedCount)} />
        </div>

        <div style={{ marginTop: 4 }}>
          <JobNavTabs jobNumber={jobNumber} active="equipment" />
        </div>

        <Section title="Equipment Requests" collapsible defaultOpen>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
                  Request Equipment from Master List
                </div>

                <div style={{ fontSize: 13, color: "#d1d5db" }}>
                  Pick a category first, then choose the equipment item from that category.
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
                      value={requestNeededBy}
                      onChange={(e) => setRequestNeededBy(e.target.value)}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Notes">
                    <input
                      value={requestNotes}
                      onChange={(e) => setRequestNotes(e.target.value)}
                      style={inputStyle}
                    />
                  </Field>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {requestLines.map((line, index) => {
                    const equipmentOptions = getLineEquipmentOptions(line);
                    const selectedItem =
                      line.inventoryItemId === ""
                        ? null
                        : equipmentInventory.find((item) => item.id === line.inventoryItemId) ||
                          null;

                    const maxQty = selectedItem ? Math.max(getAvailableQty(selectedItem), 1) : 1;

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
                              style={inputStyle}
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
                              style={inputStyle}
                              disabled={!line.category}
                            >
                              <option value="">
                                {line.category ? "Select equipment" : "Select category first"}
                              </option>
                              {equipmentOptions.map((item) => (
                                <option key={item.id} value={String(item.id)}>
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
                              style={inputStyle}
                              disabled={!selectedItem}
                            />
                          </Field>
                        </div>

                        {selectedItem ? (
                          <div style={lineMetaStyle}>
                            <div>{buildEquipmentSubtitle(selectedItem)}</div>
                            <div>
                              Qty Available: {getAvailableQty(selectedItem)} •{" "}
                              {buildEquipmentLocation(selectedItem)}
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
              </div>
            ) : null}

            {showPickupForm ? (
              <div style={panelCardStyle}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>
                  Request Pickup from Job
                </div>

                <div style={{ fontSize: 13, color: "#d1d5db" }}>
                  Select one or more equipment items assigned to this job, set the quantity for each,
                  then send a pickup request.
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
                    onClick={toggleAllEquipmentForPickup}
                    style={secondaryButtonStyle}
                  >
                    {selectedEquipmentIds.length === filteredEquipment.length &&
                    filteredEquipment.length > 0
                      ? "Clear Selection"
                      : "Select All Assigned Equipment"}
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
                  {filteredEquipment.length === 0 ? (
                    <div style={emptyStateStyle}>No equipment assigned to this job.</div>
                  ) : (
                    filteredEquipment.map((item) => {
                      const checked = selectedEquipmentIds.includes(item.id);
                      const maxQty = Math.max(getAvailableQty(item), 1);
                      const qtyValue = selectedEquipmentQtys[item.id] ?? 1;

                      return (
                        <div key={item.id} style={pickupItemCardStyle}>
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
                              onChange={() => toggleSelectedEquipment(item.id)}
                            />
                            <div style={{ display: "grid", gap: 4 }}>
                              <div style={{ fontWeight: 700, color: "#f5f5f5" }}>
                                {buildEquipmentTitle(item)}
                              </div>
                              <div style={{ fontSize: 13, color: "#d1d5db" }}>
                                {buildEquipmentSubtitle(item)}
                              </div>
                              <div style={{ fontSize: 12, color: "#a3a3a3" }}>
                                Qty Assigned: {getAvailableQty(item)} •{" "}
                                {buildEquipmentLocation(item)}
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
                                  updateSelectedEquipmentQty(
                                    item.id,
                                    Math.min(
                                      Math.max(Number(e.target.value) || 1, 1),
                                      maxQty
                                    )
                                  )
                                }
                                style={inputStyle}
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
          </div>
        </Section>

        <Section title="Assigned Equipment">
          <EquipmentTable rows={filteredEquipment} readOnly />
        </Section>

        <Section title="Equipment Request History">
          <RequestsTable rows={equipmentRequests} />
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
  border: "none",
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
  gridTemplateColumns: "20px 1fr",
  gap: 12,
  alignItems: "start",
  background: "#141414",
  border: "1px solid #2f2f2f",
  borderRadius: 10,
  padding: 12,
  cursor: "pointer",
};

const pickupItemCardStyle: React.CSSProperties = {
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