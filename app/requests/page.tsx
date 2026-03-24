"use client";

import { useEffect, useMemo, useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import { inputStyle } from "@/components/InputBlock";
import Section from "@/components/Section";
import StatCard from "@/components/StatCard";
import RequestsTable from "@/components/RequestsTable";

import type {
  Employee,
  EquipmentItem,
  Job,
  JobRequest,
  JobRequestLine,
  Material,
  PrefabItem,
  ToolItem,
} from "@/types";

const SHOP_LOCATIONS = ["Tool Room", "Shop", "Yard", "WH1", "WH2"] as const;

type RequestTypeOption = JobRequestLine["type"] | "Other";

type SourceOption = {
  id: number | null;
  category: string;
  itemName: string;
  description: string;
  unit: string;
  inventorySnapshot: string;
};

const emptyLineForm = {
  type: "Material" as RequestTypeOption,
  category: "",
  itemName: "",
  description: "",
  quantity: "1",
  unit: "ea",
  inventoryItemId: "",
  inventorySnapshot: "",
};

const emptyRequestForm: {
  destinationType: JobRequest["destinationType"];
  requestFlow: JobRequest["requestFlow"];
  jobNumber: string;
  requestedForPerson: string;
  requestedBy: string;
  neededBy: string;
  fromLocation: string;
  toLocation: string;
  notes: string;
} = {
  destinationType: "Job",
  requestFlow: "To Job",
  jobNumber: "",
  requestedForPerson: "",
  requestedBy: "",
  neededBy: "",
  fromLocation: "Shop",
  toLocation: "",
  notes: "",
};

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
        (row) =>
          normalizeEmployeeName(row.name) === normalizeEmployeeName(employee.name)
      );
      if (!exists) acc.push(employee);
      return acc;
    }, [])
    .sort((a, b) => safeString(a.name).localeCompare(safeString(b.name)));
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeLocation(location: string) {
  const trimmed = safeString(location);
  if (!trimmed) return "";
  const shopMatch = SHOP_LOCATIONS.find(
    (value) => value.toLowerCase() === trimmed.toLowerCase()
  );
  return shopMatch || trimmed;
}

function buildMaterialOptions(rows: Material[]): SourceOption[] {
  return rows.map((item) => ({
    id: item.id,
    category: safeString(item.category) || "Material",
    itemName: safeString(item.item) || "Material",
    description: [
      safeString(item.vendor) ? `Vendor: ${safeString(item.vendor)}` : "",
      safeString(item.poNumber) ? `PO: ${safeString(item.poNumber)}` : "",
      safeString(item.location) ? `Location: ${safeString(item.location)}` : "",
      safeString(item.status) ? `Status: ${safeString(item.status)}` : "",
    ]
      .filter(Boolean)
      .join(" • "),
    unit: safeString(item.unit) || "ea",
    inventorySnapshot: JSON.stringify(item),
  }));
}

function buildPrefabOptions(rows: PrefabItem[]): SourceOption[] {
  return rows.map((item) => ({
    id: item.id,
    category: safeString(item.type) || "Prefab",
    itemName: safeString(item.assembly) || "Prefab",
    description: [
      safeString(item.area) ? `Area: ${safeString(item.area)}` : "",
      safeString(item.status) ? `Status: ${safeString(item.status)}` : "",
      `Built: ${safeNumber(item.qtyBuilt, 0)}`,
      `Planned: ${safeNumber(item.qtyPlanned, 0)}`,
    ]
      .filter(Boolean)
      .join(" • "),
    unit: "ea",
    inventorySnapshot: JSON.stringify(item),
  }));
}

function buildToolOptions(rows: ToolItem[]): SourceOption[] {
  return rows.map((item) => ({
    id: item.id,
    category: safeString(item.category) || "Tool",
    itemName:
      [
        safeString(item.description),
        safeString(item.itemNumber),
        safeString(item.manufacturer),
        safeString(item.model),
      ]
        .filter(Boolean)
        .join(" • ") || "Tool",
    description: [
      safeString(item.barcode) ? `Barcode: ${safeString(item.barcode)}` : "",
      safeString(item.serialNumber) ? `Serial: ${safeString(item.serialNumber)}` : "",
      safeString(item.status) ? `Status: ${safeString(item.status)}` : "",
      safeString(item.assignmentType) ? `Assignment: ${safeString(item.assignmentType)}` : "",
    ]
      .filter(Boolean)
      .join(" • "),
    unit: "ea",
    inventorySnapshot: JSON.stringify(item),
  }));
}

function buildEquipmentOptions(rows: EquipmentItem[]): SourceOption[] {
  return rows.map((item) => ({
    id: item.id,
    category: safeString(item.category) || safeString(item.assetType) || "Equipment",
    itemName:
      [
        safeString(item.assetType),
        safeString(item.assetNumber),
        safeString(item.manufacturer),
        safeString(item.model),
      ]
        .filter(Boolean)
        .join(" • ") || "Equipment",
    description: [
      safeString(item.itemNumber) ? `Item #: ${safeString(item.itemNumber)}` : "",
      safeString(item.barcode) ? `Barcode: ${safeString(item.barcode)}` : "",
      safeString(item.serialNumber) ? `Serial: ${safeString(item.serialNumber)}` : "",
      safeString(item.licensePlate) ? `Plate: ${safeString(item.licensePlate)}` : "",
      safeString(item.status) ? `Status: ${safeString(item.status)}` : "",
    ]
      .filter(Boolean)
      .join(" • "),
    unit: "ea",
    inventorySnapshot: JSON.stringify(item),
  }));
}

export default function RequestsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);

  const [requestForm, setRequestForm] = useState(emptyRequestForm);
  const [lineForm, setLineForm] = useState(emptyLineForm);
  const [draftLines, setDraftLines] = useState<JobRequestLine[]>([]);

  const [jobFilter, setJobFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  async function loadJobs() {
    try {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load jobs");
      const dbJobs = await response.json();
      setJobs(Array.isArray(dbJobs) ? dbJobs : []);
    } catch (error) {
      console.error("Loading jobs failed:", error);
      setJobs([]);
    }
  }

  async function loadEmployees() {
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

  async function loadRequests() {
    try {
      const response = await fetch("/api/requests", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load requests");
      const rows = await response.json();
      setRequests(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error("Loading requests failed:", error);
      setRequests([]);
    }
  }

  async function loadMaterials() {
    try {
      const response = await fetch("/api/materials", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load materials");
      const rows = await response.json();
      setMaterials(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error("Loading materials failed:", error);
      setMaterials([]);
    }
  }

  async function loadTools() {
    try {
      const response = await fetch("/api/tools", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load tools");
      const rows = await response.json();
      setTools(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error("Loading tools failed:", error);
      setTools([]);
    }
  }

  async function loadEquipment() {
    try {
      const response = await fetch("/api/assets?assetType=Equipment", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to load equipment");
      const rows = await response.json();
      setEquipment(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error("Loading equipment failed:", error);
      setEquipment([]);
    }
  }

  useEffect(() => {
    async function init() {
      await Promise.all([
        loadJobs(),
        loadEmployees(),
        loadRequests(),
        loadMaterials(),
        loadTools(),
        loadEquipment(),
      ]);
    }

    init();

    const handleFocus = () => {
      loadRequests();
      loadEmployees();
      loadMaterials();
      loadTools();
      loadEquipment();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const employeeOptions = useMemo(() => {
    return cleanEmployees(employees).map((employee) => safeString(employee.name));
  }, [employees]);

  const jobOptions = useMemo(() => {
    return jobs.map((job) => safeString(job.jobNumber)).filter(Boolean).sort();
  }, [jobs]);

  const locationOptions = useMemo(() => {
    return dedupeStrings([
      ...SHOP_LOCATIONS,
      ...jobOptions,
      ...employeeOptions,
    ]).sort((a, b) => a.localeCompare(b));
  }, [jobOptions, employeeOptions]);

  const sourceOptionsByType = useMemo(() => {
  return {
    Material: buildMaterialOptions(materials),
    Prefab: [] as SourceOption[],
    Tool: buildToolOptions(tools),
    Equipment: buildEquipmentOptions(equipment),
    Other: [] as SourceOption[],
  };
}, [materials, tools, equipment]);

  const currentSourceOptions = useMemo(() => {
    return sourceOptionsByType[lineForm.type] || [];
  }, [sourceOptionsByType, lineForm.type]);

  const categoryOptions = useMemo(() => {
    return dedupeStrings(
      currentSourceOptions.map((option) => safeString(option.category)).filter(Boolean)
    ).sort((a, b) => a.localeCompare(b));
  }, [currentSourceOptions]);

  const itemOptions = useMemo(() => {
    if (!lineForm.category) return [];
    return currentSourceOptions
      .filter((option) => safeString(option.category) === safeString(lineForm.category))
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [currentSourceOptions, lineForm.category]);

  const filteredRequests = useMemo(() => {
    const searchTerm = safeString(search).toLowerCase();

    return requests.filter((request) => {
      const matchesJob = !jobFilter || safeString(request.jobNumber) === safeString(jobFilter);
      const matchesStatus =
        !statusFilter ||
        safeString(request.status) === safeString(statusFilter) ||
        safeString(request.workflowStatus) === safeString(statusFilter);
      const matchesType =
        !typeFilter ||
        (request.lines || []).some((line) => safeString(line.type) === safeString(typeFilter));

      const haystack = [
        safeString(request.jobNumber),
        safeString(request.requestedBy),
        safeString(request.requestedForPerson),
        safeString(request.fromLocation),
        safeString(request.toLocation),
        safeString(request.notes),
        safeString(request.status),
        safeString(request.workflowStatus),
        ...(request.lines || []).flatMap((line) => [
          safeString(line.type),
          safeString(line.category),
          safeString(line.itemName),
          safeString(line.description),
        ]),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !searchTerm || haystack.includes(searchTerm);

      return matchesJob && matchesStatus && matchesType && matchesSearch;
    });
  }, [requests, jobFilter, statusFilter, typeFilter, search]);

  const openCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "Open" ||
          request.status === "Approved" ||
          request.status === "In Progress" ||
          request.status === "Ordered"
      ).length,
    [requests]
  );

  const completeCount = useMemo(
    () =>
      requests.filter(
        (request) => request.workflowStatus === "Assigned to Job"
      ).length,
    [requests]
  );

  const materialCount = useMemo(
    () =>
      requests.filter((request) =>
        (request.lines || []).some((line) => line.type === "Material")
      ).length,
    [requests]
  );

  const toolCount = useMemo(
    () =>
      requests.filter((request) =>
        (request.lines || []).some((line) => line.type === "Tool")
      ).length,
    [requests]
  );

  function resetComposer() {
    setRequestForm(emptyRequestForm);
    setLineForm(emptyLineForm);
    setDraftLines([]);
  }

  function addDraftLine() {
    if (!safeString(lineForm.itemName)) {
      alert("Select an item name.");
      return;
    }

    const nextType: JobRequestLine["type"] =
      lineForm.type === "Other" ? "Material" : lineForm.type;

    const nextLine: JobRequestLine = {
      id: Date.now(),
      type: nextType,
      category: safeString(lineForm.category),
      itemName: safeString(lineForm.itemName),
      description: safeString(lineForm.description),
      quantity: Math.max(Number(lineForm.quantity) || 1, 1),
      unit: safeString(lineForm.unit) || "ea",
      inventoryItemId: lineForm.inventoryItemId ? Number(lineForm.inventoryItemId) : null,
      inventorySnapshot: safeString(lineForm.inventorySnapshot),
    };

    setDraftLines((prev) => [...prev, nextLine]);
    setLineForm((prev) => ({
      ...emptyLineForm,
      type: prev.type,
    }));
  }

  function removeDraftLine(id: number) {
    setDraftLines((prev) => prev.filter((line) => line.id !== id));
  }

  async function createRequest() {
    if (!safeString(requestForm.requestedBy)) {
      alert("Select Requested By.");
      return;
    }

    if (!safeString(requestForm.jobNumber)) {
      alert("Select a Job#.");
      return;
    }

    if (!draftLines.length) {
      alert("Add at least one request line.");
      return;
    }

    const response = await fetch("/api/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        destinationType: requestForm.destinationType,
        requestFlow: requestForm.requestFlow,
        jobNumber: safeString(requestForm.jobNumber),
        requestedForPerson: safeString(requestForm.requestedForPerson),
        requestedBy: safeString(requestForm.requestedBy),
        requestDate: new Date().toISOString(),
        neededBy: requestForm.neededBy,
        status: "Open",
        notes: safeString(requestForm.notes),
        fromLocation: normalizeLocation(requestForm.fromLocation),
        toLocation: normalizeLocation(requestForm.toLocation || requestForm.jobNumber),
        workflowStatus: "Request Submitted",
        pickTicketId: null,
        pickTicketNumber: "",
        transferTicketId: null,
        transferTicketNumber: "",
        deliveredToSiteAt: "",
        assignedToJobAt: "",
        lines: draftLines.map((line) => ({
          type: line.type,
          category: line.category,
          itemName: line.itemName,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          inventoryItemId: line.inventoryItemId ?? null,
          inventorySnapshot: line.inventorySnapshot || "",
        })),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(data?.error || "Failed to create request.");
      return;
    }

    await loadRequests();
    resetComposer();
  }

  async function updateRequestStatus(id: number, status: JobRequest["status"]) {
    const request = requests.find((row) => row.id === id);
    if (!request) return;

    const response = await fetch(`/api/requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(data?.error || "Failed to update request.");
      return;
    }

    await loadRequests();
  }

  async function markAssignedToJob(id: number) {
    const request = requests.find((row) => row.id === id);
    if (!request) return;

    const response = await fetch(`/api/requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflowStatus: "Assigned to Job",
        deliveredToSiteAt: new Date().toISOString(),
        assignedToJobAt: new Date().toISOString(),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(data?.error || "Failed to mark request assigned.");
      return;
    }

    await loadRequests();
  }

  return (
    <main style={pageStyle}>
      <div style={layoutStyle}>
        <AppSidebar active="requests" />

        <div style={mainStyle}>
          <div style={topBarStyle}>
            <div>
              <h1 style={{ fontSize: 30, margin: 0, color: "#f5f5f5" }}>
                Requests
              </h1>
              <p style={{ color: "#d1d5db", margin: "6px 0 0 0" }}>
                Create and track material, prefab, tool, and equipment requests.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <StatCard title="All Requests" value={String(requests.length)} />
            <StatCard title="Open Requests" value={String(openCount)} />
            <StatCard title="Completed" value={String(completeCount)} />
            <StatCard title="Material Requests" value={String(materialCount)} />
            <StatCard title="Tool Requests" value={String(toolCount)} />
          </div>

          <Section title="Create Request" collapsible defaultOpen>
            <div style={{ display: "grid", gap: 20 }}>
              <div style={formGridStyle}>
                <Field label="Destination Type">
                  <select
                    value={requestForm.destinationType}
                    onChange={(e) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        destinationType: e.target.value as JobRequest["destinationType"],
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="Job">Job</option>
                  </select>
                </Field>

                <Field label="Request Flow">
                  <select
                    value={requestForm.requestFlow}
                    onChange={(e) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        requestFlow: e.target.value as JobRequest["requestFlow"],
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="To Job">To Job</option>
                    <option value="From Job">From Job</option>
                  </select>
                </Field>

                <Field label="Job#">
                  <select
                    value={requestForm.jobNumber}
                    onChange={(e) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        jobNumber: e.target.value,
                        toLocation:
                          prev.requestFlow === "To Job" ? e.target.value : prev.toLocation,
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="">Select job</option>
                    {jobOptions.map((job) => (
                      <option key={job} value={job}>
                        {job}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Requested By">
                  <select
                    value={requestForm.requestedBy}
                    onChange={(e) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        requestedBy: e.target.value,
                      }))
                    }
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

                <Field label="Requested For Person">
                  <select
                    value={requestForm.requestedForPerson}
                    onChange={(e) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        requestedForPerson: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="">Optional</option>
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
                    value={requestForm.neededBy}
                    onChange={(e) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        neededBy: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </Field>

                <Field label="From Location">
                  <select
                    value={requestForm.fromLocation}
                    onChange={(e) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        fromLocation: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="">Select from location</option>
                    {locationOptions.map((location) => (
                      <option key={`from-${location}`} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="To Location">
                  <select
                    value={requestForm.toLocation}
                    onChange={(e) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        toLocation: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="">Select to location</option>
                    {locationOptions.map((location) => (
                      <option key={`to-${location}`} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Notes">
                  <input
                    value={requestForm.notes}
                    onChange={(e) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </Field>
              </div>

              <div style={{ borderTop: "1px solid #2f2f2f", paddingTop: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                  Add Request Line
                </div>

                <div style={formGridStyle}>
                  <Field label="Type">
                    <select
                      value={lineForm.type}
                      onChange={(e) =>
                        setLineForm({
                          ...emptyLineForm,
                          type: e.target.value as RequestTypeOption,
                        })
                      }
                      style={inputStyle}
                    >
                      <option value="Material">Material</option>
                      <option value="Prefab">Prefab</option>
                      <option value="Tool">Tool</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Other">Other</option>
                    </select>
                  </Field>

                  <Field label="Category">
                    {lineForm.type === "Other" ? (
                      <input
                        value={lineForm.category}
                        onChange={(e) =>
                          setLineForm((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        style={inputStyle}
                      />
                    ) : (
                      <select
                        value={lineForm.category}
                        onChange={(e) =>
                          setLineForm((prev) => ({
                            ...prev,
                            category: e.target.value,
                            itemName: "",
                            description: "",
                            unit: "ea",
                            inventoryItemId: "",
                            inventorySnapshot: "",
                          }))
                        }
                        style={inputStyle}
                      >
                        <option value="">Select category</option>
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>

                  <Field label="Item Name">
                    {lineForm.type === "Other" ? (
                      <input
                        value={lineForm.itemName}
                        onChange={(e) =>
                          setLineForm((prev) => ({
                            ...prev,
                            itemName: e.target.value,
                          }))
                        }
                        style={inputStyle}
                      />
                    ) : (
                      <select
                        value={lineForm.inventoryItemId}
                        onChange={(e) => {
                          const selected = itemOptions.find(
                            (option) => String(option.id) === e.target.value
                          );

                          setLineForm((prev) => ({
                            ...prev,
                            inventoryItemId: e.target.value,
                            itemName: selected?.itemName || "",
                            description: selected?.description || "",
                            unit: selected?.unit || "ea",
                            inventorySnapshot: selected?.inventorySnapshot || "",
                          }));
                        }}
                        style={inputStyle}
                        disabled={!lineForm.category}
                      >
                        <option value="">
                          {lineForm.category ? "Select item" : "Select category first"}
                        </option>
                        {itemOptions.map((option) => (
                          <option key={`${option.category}-${option.id}`} value={String(option.id)}>
                            {option.itemName}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>

                  <Field label="Description">
                    <input
                      value={lineForm.description}
                      onChange={(e) =>
                        setLineForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Qty">
                    <input
                      type="number"
                      value={lineForm.quantity}
                      onChange={(e) =>
                        setLineForm((prev) => ({
                          ...prev,
                          quantity: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Unit">
                    <input
                      value={lineForm.unit}
                      onChange={(e) =>
                        setLineForm((prev) => ({
                          ...prev,
                          unit: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    />
                  </Field>
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={addDraftLine} style={actionButtonStyle}>
                    Add Line
                  </button>
                  <button type="button" onClick={createRequest} style={actionButtonStyle}>
                    Create Request
                  </button>
                  <button type="button" onClick={resetComposer} style={secondaryButtonStyle}>
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Draft Request Lines" collapsible defaultOpen>
            {draftLines.length === 0 ? (
              <div style={{ color: "#a3a3a3" }}>No request lines added yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {draftLines.map((line) => (
                  <div key={line.id} style={cardStyle}>
                    <div style={cardHeaderStyle}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>
                          {line.itemName}
                        </div>
                        <div style={{ color: "#d1d5db", fontSize: 14 }}>
                          {line.type} • Qty {line.quantity} {line.unit}
                        </div>
                      </div>

                      <button
                        type="button"
                        style={{
                          ...smallActionButtonStyle,
                          background: "#7f1d1d",
                          border: "1px solid #991b1b",
                        }}
                        onClick={() => removeDraftLine(line.id)}
                      >
                        Remove
                      </button>
                    </div>

                    <div style={{ color: "#a3a3a3", fontSize: 13 }}>
                      {line.category ? `Category: ${line.category}` : "No category"}
                    </div>

                    {safeString(line.description) ? (
                      <div style={lineNoteStyle}>{line.description}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Request Filters" collapsible defaultOpen={false}>
            <div style={formGridStyle}>
              <Field label="Job#">
                <select
                  value={jobFilter}
                  onChange={(e) => setJobFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">All jobs</option>
                  {jobOptions.map((job) => (
                    <option key={job} value={job}>
                      {job}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Status">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">All statuses</option>
                  <option value="Open">Open</option>
                  <option value="Approved">Approved</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Ordered">Ordered</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Assigned to Job">Assigned to Job</option>
                </select>
              </Field>

              <Field label="Type">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">All types</option>
                  <option value="Material">Material</option>
                  <option value="Prefab">Prefab</option>
                  <option value="Tool">Tool</option>
                  <option value="Equipment">Equipment</option>
                </select>
              </Field>

              <Field label="Search">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={inputStyle}
                />
              </Field>
            </div>
          </Section>

          <Section title="Requests" collapsible defaultOpen>
            <RequestsTable rows={filteredRequests} />

            {filteredRequests.length > 0 ? (
              <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {filteredRequests.map((request) => (
                  <div key={request.id} style={statusCardStyle}>
                    <div style={{ fontWeight: 700, color: "#f5f5f5" }}>
                      {request.jobNumber || "No Job"} • {request.requestedBy || "-"}
                    </div>
                    <div style={{ color: "#d1d5db", fontSize: 13, marginTop: 4 }}>
                      {(request.lines || []).map((line) => line.itemName).join(", ")}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      <button
                        type="button"
                        style={smallActionButtonStyle}
                        onClick={() => updateRequestStatus(request.id, "Approved")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        style={smallActionButtonStyle}
                        onClick={() => updateRequestStatus(request.id, "In Progress")}
                      >
                        In Progress
                      </button>
                      <button
                        type="button"
                        style={smallActionButtonStyle}
                        onClick={() => updateRequestStatus(request.id, "Ordered")}
                      >
                        Ordered
                      </button>
                      <button
                        type="button"
                        style={smallActionButtonStyle}
                        onClick={() => markAssignedToJob(request.id)}
                      >
                        Assigned
                      </button>
                      <button
                        type="button"
                        style={{
                          ...smallActionButtonStyle,
                          background: "#7f1d1d",
                          border: "1px solid #991b1b",
                        }}
                        onClick={() => updateRequestStatus(request.id, "Rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Section>
        </div>
      </div>
    </main>
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
          fontSize: 13,
          fontWeight: 700,
          color: "#d1d5db",
          marginBottom: 6,
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

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const actionButtonStyle: React.CSSProperties = {
  background: "#c2410c",
  color: "white",
  border: "1px solid #ea580c",
  borderRadius: 10,
  padding: "12px 16px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "#2a2a2a",
  color: "white",
  border: "1px solid #3a3a3a",
  borderRadius: 10,
  padding: "12px 16px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
};

const smallActionButtonStyle: React.CSSProperties = {
  background: "#c2410c",
  color: "white",
  border: "1px solid #ea580c",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
};

const cardStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 12,
  padding: 16,
  display: "grid",
  gap: 12,
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const lineNoteStyle: React.CSSProperties = {
  background: "#141414",
  border: "1px solid #2f2f2f",
  borderRadius: 10,
  padding: 10,
  color: "#d1d5db",
};

const statusCardStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 12,
  padding: 14,
  display: "grid",
  gap: 6,
};