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
const SHOP_LOCATIONS = ["Shop", "Tool Room", "Yard", "WH1", "WH2"];

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

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

function isShopLocation(location: string) {
  return SHOP_LOCATIONS.includes(location);
}

function isJobsiteLocation(location: string, jobNumber: string) {
  return safeString(location) === safeString(jobNumber);
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

  const [selectedShopMaterialIds, setSelectedShopMaterialIds] = useState<number[]>([]);
  const [selectedShopMaterialQtys, setSelectedShopMaterialQtys] = useState<Record<number, number>>(
    {}
  );

  const [selectedJobsiteMaterialIds, setSelectedJobsiteMaterialIds] = useState<number[]>([]);
  const [selectedJobsiteMaterialQtys, setSelectedJobsiteMaterialQtys] = useState<
    Record<number, number>
  >({});

  const [requestRequestedBy, setRequestRequestedBy] = useState("");
  const [requestNeededBy, setRequestNeededBy] = useState("");
  const [requestNotes, setRequestNotes] = useState("");

  const [pickupRequestedBy, setPickupRequestedBy] = useState("");
  const [pickupNeededBy, setPickupNeededBy] = useState("");
  const [pickupToLocation, setPickupToLocation] = useState("Shop");
  const [pickupNotes, setPickupNotes] = useState("");

  async function reloadMaterials() {
    try {
      const response = await fetch("/api/materials", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load materials");
      const dbMaterials = await response.json();
      setMaterials(Array.isArray(dbMaterials) ? dbMaterials : []);
    } catch (error) {
      console.error("Reloading materials failed:", error);
    }
  }

  function refreshRequestsSide() {
    const parsed = loadStoredAppData();
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
      materials: latest.materials || [],
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    setRequests(nextRequests);
    setNotifications(nextNotifications);
  }

  useEffect(() => {
    setMaterialRequestForm(emptyMaterialRequestForm(jobNumber));
    setSelectedShopMaterialIds([]);
    setSelectedShopMaterialQtys({});
    setSelectedJobsiteMaterialIds([]);
    setSelectedJobsiteMaterialQtys({});
    setRequestRequestedBy("");
    setRequestNeededBy("");
    setRequestNotes("");
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

    loadJobs();
    reloadMaterials();
    refreshRequestsSide();

    const handleFocus = () => {
      reloadMaterials();
      refreshRequestsSide();
    };

    const handleStorage = () => {
      refreshRequestsSide();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [jobNumber]);

  const currentJob = useMemo(
    () => jobs.find((job) => job.jobNumber === jobNumber) || null,
    [jobs, jobNumber]
  );

  const allJobMaterials = useMemo(
    () => materials.filter((item) => item.job === jobNumber),
    [materials, jobNumber]
  );

  const shopMaterials = useMemo(
    () => allJobMaterials.filter((item) => isShopLocation(safeString(item.location))),
    [allJobMaterials]
  );

  const jobsiteMaterials = useMemo(
    () => allJobMaterials.filter((item) => isJobsiteLocation(safeString(item.location), jobNumber)),
    [allJobMaterials, jobNumber]
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
    .filter((employee) => employee.name?.trim())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((employee) => employee.name);
}, [employees]);

  const totalOrdered = useMemo(
    () => allJobMaterials.reduce((sum, row) => sum + Number(row.orderedQty || 0), 0),
    [allJobMaterials]
  );

  const totalReceived = useMemo(
    () => allJobMaterials.reduce((sum, row) => sum + Number(row.receivedQty || 0), 0),
    [allJobMaterials]
  );

  const totalStock = useMemo(
    () => allJobMaterials.reduce((sum, row) => sum + Number((row as any).stockQty || 0), 0),
    [allJobMaterials]
  );

  const totalAllocated = useMemo(
    () => allJobMaterials.reduce((sum, row) => sum + Number(row.allocatedQty || 0), 0),
    [allJobMaterials]
  );

  const shortageCount = useMemo(
    () =>
      allJobMaterials.filter(
        (row) => Number(row.receivedQty || 0) < Number(row.allocatedQty || 0)
      ).length,
    [allJobMaterials]
  );

  const partialCount = useMemo(
    () => allJobMaterials.filter((row) => row.status === "Partial").length,
    [allJobMaterials]
  );

  function toggleSelectedShopMaterial(id: number) {
    setSelectedShopMaterialIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((value) => value !== id);
        setSelectedShopMaterialQtys((current) => {
          const updated = { ...current };
          delete updated[id];
          return updated;
        });
        return next;
      }

      const selectedItem = shopMaterials.find((item) => item.id === id);
      const defaultQty = Math.max(
        Math.min(Number((selectedItem as any)?.stockQty || 0), 1),
        1
      );

      setSelectedShopMaterialQtys((current) => ({
        ...current,
        [id]: defaultQty,
      }));

      return [...prev, id];
    });
  }

  function toggleSelectedJobsiteMaterial(id: number) {
    setSelectedJobsiteMaterialIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((value) => value !== id);
        setSelectedJobsiteMaterialQtys((current) => {
          const updated = { ...current };
          delete updated[id];
          return updated;
        });
        return next;
      }

      const selectedItem = jobsiteMaterials.find((item) => item.id === id);
      const defaultQty = Math.max(
        Math.min(Number((selectedItem as any)?.stockQty || 0), 1),
        1
      );

      setSelectedJobsiteMaterialQtys((current) => ({
        ...current,
        [id]: defaultQty,
      }));

      return [...prev, id];
    });
  }

  function updateSelectedShopMaterialQty(id: number, qty: number) {
    setSelectedShopMaterialQtys((prev) => ({
      ...prev,
      [id]: Math.max(1, qty || 1),
    }));
  }

  function updateSelectedJobsiteMaterialQty(id: number, qty: number) {
    setSelectedJobsiteMaterialQtys((prev) => ({
      ...prev,
      [id]: Math.max(1, qty || 1),
    }));
  }

  function toggleAllShopMaterials() {
    const allIds = shopMaterials.map((item) => item.id);

    setSelectedShopMaterialIds((prev) => {
      if (prev.length === allIds.length) {
        setSelectedShopMaterialQtys({});
        return [];
      }

      const qtyMap: Record<number, number> = {};
      for (const item of shopMaterials) {
        qtyMap[item.id] = Math.max(
          Math.min(Number((item as any).stockQty || 0), 1),
          1
        );
      }
      setSelectedShopMaterialQtys(qtyMap);
      return allIds;
    });
  }

  function toggleAllJobsiteMaterials() {
    const allIds = jobsiteMaterials.map((item) => item.id);

    setSelectedJobsiteMaterialIds((prev) => {
      if (prev.length === allIds.length) {
        setSelectedJobsiteMaterialQtys({});
        return [];
      }

      const qtyMap: Record<number, number> = {};
      for (const item of jobsiteMaterials) {
        qtyMap[item.id] = Math.max(
          Math.min(Number((item as any).stockQty || 0), 1),
          1
        );
      }
      setSelectedJobsiteMaterialQtys(qtyMap);
      return allIds;
    });
  }

  function saveManualMaterialRequest() {
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

    const latest = loadStoredAppData() || fallbackData;
    const nextRequests = [newRequest, ...(latest.requests || [])];

    const newNotification: AppNotification = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      jobNumber: newRequest.jobNumber,
      requestId: newRequest.id,
      type: "Request Submitted",
      title: "Material request submitted",
      message:
        (newRequest.lines || []).map((line) => line.itemName).join(", ") ||
        "Items requested.",
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    const nextNotifications = [newNotification, ...(latest.notifications || [])];

    persistRequestsAndNotifications(nextRequests, nextNotifications);

    setMaterialRequestForm(emptyMaterialRequestForm(jobNumber));
    setShowRequestForm(false);
  }

  async function createShopToJobRequest() {
    if (!selectedShopMaterialIds.length) {
      alert("Select at least one shop material row.");
      return;
    }

    if (!safeString(requestRequestedBy)) {
      alert("Select Requested By.");
      return;
    }

    const selectedItems = shopMaterials.filter((item) =>
      selectedShopMaterialIds.includes(item.id)
    );

    if (!selectedItems.length) {
      alert("No selected shop materials found.");
      return;
    }

    const invalidQtyItem = selectedItems.find((item) => {
      const requestedQty = safeNumber(selectedShopMaterialQtys[item.id], 1);
      const maxQty = Math.max(Number((item as any).stockQty || 0), 0);
      return requestedQty < 1 || requestedQty > maxQty;
    });

    if (invalidQtyItem) {
      alert(
        `Requested quantity for ${buildMaterialTitle(invalidQtyItem)} must be between 1 and ${Math.max(
          Number((invalidQtyItem as any).stockQty || 0),
          0
        )}.`
      );
      return;
    }

    const lines: JobRequestLine[] = selectedItems.map((item, index) => ({
      id: Date.now() + index + 1,
      type: "Material",
      category: safeString(item.category),
      itemName: buildMaterialTitle(item),
      description: buildMaterialSubtitle(item),
      quantity: safeNumber(selectedShopMaterialQtys[item.id], 1),
      unit: safeString(item.unit) || "ea",
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
      title: "Material request submitted",
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

    setSelectedShopMaterialIds([]);
    setSelectedShopMaterialQtys({});
    setRequestRequestedBy("");
    setRequestNeededBy("");
    setRequestNotes("");
    setShowRequestForm(false);
  }

  async function createPickupRequest() {
    if (!selectedJobsiteMaterialIds.length) {
      alert("Select at least one jobsite material row.");
      return;
    }

    if (!safeString(pickupRequestedBy)) {
      alert("Select Requested By.");
      return;
    }

    const selectedItems = jobsiteMaterials.filter((item) =>
      selectedJobsiteMaterialIds.includes(item.id)
    );

    if (!selectedItems.length) {
      alert("No selected jobsite materials found.");
      return;
    }

    const invalidQtyItem = selectedItems.find((item) => {
      const requestedQty = safeNumber(selectedJobsiteMaterialQtys[item.id], 1);
      const maxQty = Math.max(Number((item as any).stockQty || 0), 0);
      return requestedQty < 1 || requestedQty > maxQty;
    });

    if (invalidQtyItem) {
      alert(
        `Requested quantity for ${buildMaterialTitle(invalidQtyItem)} must be between 1 and ${Math.max(
          Number((invalidQtyItem as any).stockQty || 0),
          0
        )}.`
      );
      return;
    }

    const lines: JobRequestLine[] = selectedItems.map((item, index) => ({
      id: Date.now() + index + 1,
      type: "Material",
      category: safeString(item.category),
      itemName: buildMaterialTitle(item),
      description: buildMaterialSubtitle(item),
      quantity: safeNumber(selectedJobsiteMaterialQtys[item.id], 1),
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

    const latest = loadStoredAppData() || fallbackData;
    const nextRequests = [newRequest, ...(latest.requests || [])];

    const newNotification: AppNotification = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      jobNumber: newRequest.jobNumber,
      requestId: newRequest.id,
      type: "Request Submitted",
      title: "Material pickup request submitted",
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

    setSelectedJobsiteMaterialIds([]);
    setSelectedJobsiteMaterialQtys({});
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
          <StatCard title="All Job Material Rows" value={String(allJobMaterials.length)} />
          <StatCard title="Shop Stock Rows" value={String(shopMaterials.length)} />
          <StatCard title="Jobsite Rows" value={String(jobsiteMaterials.length)} />
          <StatCard title="Total Ordered" value={String(totalOrdered)} />
          <StatCard title="Total Received" value={String(totalReceived)} />
          <StatCard title="Total Stock" value={String(totalStock)} />
          <StatCard title="Total Allocated" value={String(totalAllocated)} />
          <StatCard title="Shortages" value={String(shortageCount)} />
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
                {showRequestForm ? "Close Request Form" : "Request Material from Shop"}
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
                  Request Material from Shop
                </div>

                <div style={{ fontSize: 13, color: "#d1d5db" }}>
                  Select reserved shop stock for this job, set the quantity for each, and create a request. Inventory will not move until the transfer ticket is completed.
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

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={toggleAllShopMaterials}
                    style={secondaryButtonStyle}
                  >
                    {selectedShopMaterialIds.length === shopMaterials.length &&
                    shopMaterials.length > 0
                      ? "Clear Selection"
                      : "Select All Shop Rows"}
                  </button>

                  <button
                    type="button"
                    onClick={createShopToJobRequest}
                    style={{
                      ...requestButtonStyle,
                      background: "#c2410c",
                      border: "1px solid #ea580c",
                    }}
                  >
                    Send Material Request
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
                  {shopMaterials.length === 0 ? (
                    <div style={emptyStateStyle}>No shop stock reserved for this job.</div>
                  ) : (
                    shopMaterials.map((item) => {
                      const checked = selectedShopMaterialIds.includes(item.id);
                      const maxQty = Math.max(Number((item as any).stockQty || 0), 0);
                      const qtyValue = selectedShopMaterialQtys[item.id] ?? 1;

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
                              onChange={() => toggleSelectedShopMaterial(item.id)}
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
                                Stock: {(item as any).stockQty ?? 0} • Allocated: {item.allocatedQty ?? 0} •
                                Unit: {item.unit || "-"}
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
                                Request Quantity
                              </div>
                              <input
                                type="number"
                                min={1}
                                max={Math.max(maxQty, 1)}
                                value={qtyValue}
                                onChange={(e) =>
                                  updateSelectedShopMaterialQty(
                                    item.id,
                                    Math.min(
                                      Math.max(Number(e.target.value) || 1, 1),
                                      Math.max(maxQty, 1)
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

                <div style={{ borderTop: "1px solid #2f2f2f", paddingTop: 12 }}>
                  <RequestForm
                    title="Manual Material Request"
                    requestType="Material"
                    form={materialRequestForm}
                    setForm={setMaterialRequestForm}
                    onSave={saveManualMaterialRequest}
                    onCancel={() => {
                      setMaterialRequestForm(emptyMaterialRequestForm(jobNumber));
                      setShowRequestForm(false);
                    }}
                    hideType
                  />
                </div>
              </div>
            ) : null}

            {showPickupForm ? (
              <div style={panelCardStyle}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>
                  Request Pickup from Job
                </div>

                <div style={{ fontSize: 13, color: "#d1d5db" }}>
                  Select one or more on-site material rows from this job, set the quantity for each, then send a pickup request. Inventory will not move until the transfer ticket is completed.
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
                    onClick={toggleAllJobsiteMaterials}
                    style={secondaryButtonStyle}
                  >
                    {selectedJobsiteMaterialIds.length === jobsiteMaterials.length &&
                    jobsiteMaterials.length > 0
                      ? "Clear Selection"
                      : "Select All Jobsite Rows"}
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
                  {jobsiteMaterials.length === 0 ? (
                    <div style={emptyStateStyle}>No materials currently shown at the jobsite.</div>
                  ) : (
                    jobsiteMaterials.map((item) => {
                      const checked = selectedJobsiteMaterialIds.includes(item.id);
                      const maxQty = Math.max(Number((item as any).stockQty || 0), 0);
                      const qtyValue = selectedJobsiteMaterialQtys[item.id] ?? 1;

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
                              onChange={() => toggleSelectedJobsiteMaterial(item.id)}
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
                                Stock: {(item as any).stockQty ?? 0} • Allocated: {item.allocatedQty ?? 0} •
                                Unit: {item.unit || "-"}
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
                                max={Math.max(maxQty, 1)}
                                value={qtyValue}
                                onChange={(e) =>
                                  updateSelectedJobsiteMaterialQty(
                                    item.id,
                                    Math.min(
                                      Math.max(Number(e.target.value) || 1, 1),
                                      Math.max(maxQty, 1)
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
          </div>
        </Section>

        <Section title="Shop Stock Reserved for This Job">
          <MaterialsReadOnlyTable rows={shopMaterials} mode="shop" />
        </Section>

        <Section title="Jobsite Materials">
          <MaterialsReadOnlyTable rows={jobsiteMaterials} mode="jobsite" />
        </Section>

        <Section title="Material Request History">
          <RequestsTable rows={materialRequests} />
        </Section>
      </div>
    </main>
  );
}

function MaterialsReadOnlyTable({
  rows,
  mode,
}: {
  rows: Material[];
  mode: "shop" | "jobsite";
}) {
  const isShop = mode === "shop";

  return (
    <TableWrapper>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Item</Th>
            <Th>Category</Th>
            {isShop ? <Th>Vendor Ordered</Th> : <Th>Requested from Shop</Th>}
            {isShop ? <Th>Vendor Received</Th> : <Th>Delivered to Job</Th>}
            <Th>Stock On Hand</Th>
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
              <td
                colSpan={11}
                style={{
                  padding: "10px",
                  borderBottom: "1px solid #f1f5f9",
                  fontSize: "14px",
                }}
              >
                No materials found.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.item || "-"}</Td>
                <Td>{row.category || "-"}</Td>
                <Td>{row.orderedQty ?? 0}</Td>
                <Td>{row.receivedQty ?? 0}</Td>
                <Td>{(row as any).stockQty ?? 0}</Td>
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
  gap: 10,
  background: "#141414",
  border: "1px solid #2f2f2f",
  borderRadius: 10,
  padding: 12,
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