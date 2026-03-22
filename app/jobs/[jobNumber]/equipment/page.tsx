"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { inputStyle } from "@/components/InputBlock";
import Section from "@/components/Section";
import StatCard from "@/components/StatCard";
import EquipmentTable from "@/components/EquipmentTable";
import RequestsTable from "@/components/RequestsTable";
import InventoryRequestPicker from "@/components/InventoryRequestPicker";
import RequestForm from "@/components/RequestForm";

import type {
  AppData,
  AppNotification,
  Employee,
  EquipmentItem,
  Job,
  JobRequest,
  JobRequestLine,
} from "@/types";
import type { RequestFormState } from "@/components/RequestForm";

const STORAGE_KEY = "prefab-tracker-v7";
const MASTER_EQUIPMENT_KEY = "master-equipment-inventory-v1";

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

function emptyEquipmentRequestForm(jobNumber: string): RequestFormState {
  return {
    jobNumber,
    type: "Equipment" as const,
    requestedBy: "",
    neededBy: "",
    itemName: "",
    description: "",
    quantity: 1,
    unit: "ea",
    notes: "",
    inventoryItemId: null as number | null,
    inventorySnapshot: "",
    lines: [],
  };
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

  const [inventorySearch, setInventorySearch] = useState("");
  const [equipmentRequestForm, setEquipmentRequestForm] = useState<RequestFormState>(() =>
    emptyEquipmentRequestForm(jobNumber)
  );

  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([]);
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

  useEffect(() => {
    setEquipmentRequestForm(emptyEquipmentRequestForm(jobNumber));
    setInventorySearch("");
    setSelectedEquipmentIds([]);
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
    () => jobs.find((job) => job.jobNumber === jobNumber) || null,
    [jobs, jobNumber]
  );

  const filteredEquipment = useMemo(
    () => equipmentInventory.filter((item) => item.jobNumber === jobNumber),
    [equipmentInventory, jobNumber]
  );

  const equipmentRequests = useMemo(
    () =>
      requests.filter(
        (item) =>
          item.jobNumber === jobNumber &&
          (item.lines || []).some((line) => line.type === "Equipment")
      ),
    [requests, jobNumber]
  );

  const employeeOptions = useMemo(() => {
    return [...employees]
      .filter((employee) => employee.isActive)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((employee) => employee.name);
  }, [employees]);

  const equipmentPickerItems = useMemo(() => {
    return equipmentInventory.map((item) => {
      const title = buildEquipmentTitle(item);
      const subtitle = buildEquipmentSubtitle(item);
      const location = buildEquipmentLocation(item);
      const badge = safeString(item.assetType) || "Equipment";

      return {
        id: item.id,
        title,
        subtitle,
        meta: location,
        badge,
        status: item.status,
        qtyAvailable: Number(item.quantityAvailable || 0),
        searchText: [
          badge,
          title,
          subtitle,
          location,
          item.description,
          item.category,
          item.itemNumber,
          item.barcode,
          item.manufacturer,
          item.model,
          item.serialNumber,
          item.licensePlate,
          item.vinSerial,
          item.assetNumber,
          item.year,
          item.jobNumber,
          item.assignedTo,
          item.toolRoomLocation,
        ]
          .filter(Boolean)
          .join(" "),
      };
    });
  }, [equipmentInventory]);

  const totalQty = useMemo(
    () =>
      filteredEquipment.reduce(
        (sum, row) => sum + Number(row.quantityAvailable || 0),
        0
      ),
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

  function toggleSelectedEquipment(id: number) {
    setSelectedEquipmentIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  }

  function toggleAllEquipmentForPickup() {
    const allIds = filteredEquipment.map((item) => item.id);

    setSelectedEquipmentIds((prev) =>
      prev.length === allIds.length ? [] : allIds
    );
  }

  function saveEquipmentRequest() {
    const hasMinimumData =
      equipmentRequestForm.itemName.trim() ||
      equipmentRequestForm.description.trim() ||
      equipmentRequestForm.notes.trim();

    if (!hasMinimumData) return;

    const line: JobRequestLine = {
      id: Date.now() + 1,
      type: "Equipment",
      category: "",
      itemName: equipmentRequestForm.itemName.trim(),
      description: equipmentRequestForm.description.trim(),
      quantity: Number(equipmentRequestForm.quantity) || 0,
      unit: equipmentRequestForm.unit.trim() || "ea",
      inventoryItemId: equipmentRequestForm.inventoryItemId ?? null,
      inventorySnapshot: equipmentRequestForm.inventorySnapshot ?? "",
    };

    const newRequest: JobRequest = {
      id: Date.now(),
      destinationType: "Job",
      requestFlow: "To Job",
      jobNumber,
      requestedForPerson: "",
      requestedBy: equipmentRequestForm.requestedBy.trim(),
      requestDate: new Date().toISOString().slice(0, 10),
      neededBy: equipmentRequestForm.neededBy,
      status: "Open",
      notes: equipmentRequestForm.notes.trim(),
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
      title: "Equipment request submitted",
      message:
        (newRequest.lines || []).map((line) => line.itemName).join(", ") ||
        "Items requested.",
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    const nextNotifications = [newNotification, ...(latest.notifications || [])];

    const updatedData: AppData = {
      ...latest,
      requests: nextRequests,
      notifications: nextNotifications,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));

    setRequests(nextRequests);
    setNotifications(nextNotifications);
    setEquipmentRequestForm(emptyEquipmentRequestForm(jobNumber));
    setInventorySearch("");
    setShowRequestForm(false);
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

    const lines: JobRequestLine[] = selectedItems.map((item, index) => ({
      id: Date.now() + index + 1,
      type: "Equipment",
      category: safeString(item.category),
      itemName: buildEquipmentTitle(item),
      description: [buildEquipmentSubtitle(item), buildEquipmentLocation(item)]
        .filter(Boolean)
        .join(" | "),
      quantity: Number(item.quantityAvailable) || 1,
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
        (newRequest.lines || []).map((line) => line.itemName).join(", ") ||
        "Items requested.",
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    const nextNotifications = [newNotification, ...(latest.notifications || [])];

    const updatedData: AppData = {
      ...latest,
      requests: nextRequests,
      notifications: nextNotifications,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));

    setRequests(nextRequests);
    setNotifications(nextNotifications);

    setSelectedEquipmentIds([]);
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
          <StatCard title="Equipment Rows" value={String(filteredEquipment.length)} />
          <StatCard
            title="Master Equipment List Rows"
            value={String(equipmentInventory.length)}
          />
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
                onClick={() => setShowRequestForm((prev) => !prev)}
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
                  Equipment Request
                </div>

                <InventoryRequestPicker
                  label="Pick From Master Equipment List"
                  searchValue={inventorySearch}
                  onSearchChange={setInventorySearch}
                  items={equipmentPickerItems}
                  onSelect={(picked) => {
                    const selectedEquipment = equipmentInventory.find(
                      (equipment) => equipment.id === picked.id
                    );

                    setInventorySearch(picked.title);

                    setEquipmentRequestForm((prev) => ({
                      ...prev,
                      itemName: picked.title,
                      description: [picked.subtitle, picked.meta]
                        .filter(Boolean)
                        .join(" | "),
                      quantity: 1,
                      unit: "ea",
                      notes: `Inventory status: ${picked.status || "-"} | Qty available: ${
                        picked.qtyAvailable ?? 0
                      }${picked.meta ? ` | ${picked.meta}` : ""}`,
                      inventoryItemId: picked.id,
                      inventorySnapshot: selectedEquipment
                        ? JSON.stringify(selectedEquipment)
                        : "",
                    }));
                  }}
                  emptyMessage="No matching equipment found in the master equipment list."
                />

                <RequestForm
                  title="Selected Equipment Request Details"
                  requestType="Equipment"
                  form={equipmentRequestForm}
                  setForm={setEquipmentRequestForm}
                  onSave={saveEquipmentRequest}
                  onCancel={() => {
                    setEquipmentRequestForm(emptyEquipmentRequestForm(jobNumber));
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
                  Select one or more equipment items assigned to this job, then send a pickup request to the shop.
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

                      return (
                        <label key={item.id} style={pickupRowStyle}>
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
                              {buildEquipmentLocation(item)}
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