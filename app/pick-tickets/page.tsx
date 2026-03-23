"use client";

import { useEffect, useMemo, useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import { inputStyle } from "@/components/InputBlock";
import Section from "@/components/Section";
import StatCard from "@/components/StatCard";

import type {
  AppData,
  Employee,
  EquipmentItem,
  Job,
  JobRequest,
  Material,
  PrefabItem,
  ShopTicket,
  TicketItemType,
  TicketLine,
  TicketStatus,
  ToolItem,
} from "@/types";

const STORAGE_KEY = "prefab-tracker-v7";
const MASTER_TOOLS_KEY = "master-tool-inventory-v1";
const MASTER_EQUIPMENT_KEY = "master-equipment-inventory-v1";

const SHOP_LOCATIONS = ["Tool Room", "Shop", "Yard", "WH1", "WH2"] as const;

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

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

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
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
      employees: Array.isArray(parsed.employees) ? parsed.employees : [],
    };
  } catch {
    return defaultData;
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

function makePickTicketNumber(existing: ShopTicket[]) {
  const count = existing.filter((t) => t.type === "Pick").length + 1;
  return `PT-${String(count).padStart(4, "0")}`;
}

function makeTransferTicketNumber(existing: ShopTicket[]) {
  const count = existing.filter((t) => t.type === "Transfer").length + 1;
  return `TT-${String(count).padStart(4, "0")}`;
}

function assetTypeOf(item: EquipmentItem) {
  return safeString(item.assetType);
}

function normalizeLocation(location: string) {
  const trimmed = safeString(location);
  if (!trimmed) return "";
  const match = SHOP_LOCATIONS.find(
    (value) => value.toLowerCase() === trimmed.toLowerCase()
  );
  return match || trimmed;
}

function emptyLineForm() {
  return {
    itemType: "Material" as TicketItemType,
    itemId: "",
    itemName: "",
    qty: "1",
    unit: "ea",
    fromLocation: "",
    toLocation: "",
    lineNotes: "",
  };
}

export default function PickTicketsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [prefab, setPrefab] = useState<PrefabItem[]>([]);
  const [toolInventory, setToolInventory] = useState<ToolItem[]>([]);
  const [equipmentInventory, setEquipmentInventory] = useState<EquipmentItem[]>([]);
  const [tickets, setTickets] = useState<ShopTicket[]>([]);
  const [requests, setRequests] = useState<JobRequest[]>([]);

  const [pickTicketForm, setPickTicketForm] = useState({
    jobNumber: "",
    requestedBy: "",
    assignedTo: "",
    neededBy: "",
    notes: "",
  });

  const [lineForm, setLineForm] = useState(emptyLineForm());
  const [draftLines, setDraftLines] = useState<TicketLine[]>([]);

  useEffect(() => {
    const parsed = loadStoredAppData();
    setEmployees(parsed.employees || []);
    setMaterials(parsed.materials);
    setPrefab(parsed.prefab);
    setTickets(parsed.tickets ?? []);
    setRequests(parsed.requests ?? []);
    setToolInventory(loadStoredTools());
    setEquipmentInventory(loadStoredEquipment());

    async function loadJobs() {
      try {
        const response = await fetch("/api/jobs", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load jobs");
        const dbJobs = await response.json();
        setJobs(Array.isArray(dbJobs) ? dbJobs : []);
      } catch (error) {
        console.error("Loading jobs failed:", error);
        setJobs(parsed.jobs || []);
      }
    }

    async function loadMaterialsApi() {
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
    loadMaterialsApi();
  }, []);

  const jobOptions = useMemo(
    () => jobs.map((job) => job.jobNumber).sort((a, b) => a.localeCompare(b)),
    [jobs]
  );

  const employeeOptions = useMemo(() => {
  return [...employees]
    .filter((employee) => employee.name?.trim())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((employee) => employee.name);
}, [employees]);

  const locationOptions = useMemo(() => {
    const values = [...SHOP_LOCATIONS, ...jobOptions, ...employeeOptions];
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [jobOptions, employeeOptions]);

  const toolItemOptions = useMemo(() => {
    return toolInventory
      .map((item) => ({
        value: String(item.id),
        label:
          [
            safeString(item.description),
            safeString(item.itemNumber),
            safeString(item.model),
            safeString(item.barcode),
            safeString(item.assignedTo),
            safeString(item.jobNumber),
            safeString(item.toolRoomLocation),
          ]
            .filter(Boolean)
            .join(" • ") || `Tool ${item.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [toolInventory]);

  const trailerItemOptions = useMemo(() => {
    return equipmentInventory
      .filter((item) => assetTypeOf(item) === "Trailer")
      .map((item) => ({
        value: String(item.id),
        label:
          [
            safeString(item.assetNumber),
            safeString(item.year),
            safeString(item.manufacturer),
            safeString(item.model),
            safeString(item.licensePlate),
            safeString(item.assignedTo),
            safeString(item.jobNumber),
            safeString(item.toolRoomLocation),
          ]
            .filter(Boolean)
            .join(" • ") || `Trailer ${item.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [equipmentInventory]);

  const vehicleItemOptions = useMemo(() => {
    return equipmentInventory
      .filter((item) => assetTypeOf(item) === "Vehicle")
      .map((item) => ({
        value: String(item.id),
        label:
          [
            safeString(item.assetNumber),
            safeString(item.year),
            safeString(item.manufacturer),
            safeString(item.model),
            safeString(item.licensePlate),
            safeString(item.assignedTo),
            safeString(item.jobNumber),
            safeString(item.toolRoomLocation),
          ]
            .filter(Boolean)
            .join(" • ") || `Vehicle ${item.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [equipmentInventory]);

  const equipmentOnlyItemOptions = useMemo(() => {
    return equipmentInventory
      .filter((item) => assetTypeOf(item) === "Equipment")
      .map((item) => ({
        value: String(item.id),
        label:
          [
            safeString(item.assetNumber),
            safeString(item.year),
            safeString(item.manufacturer),
            safeString(item.model),
            safeString(item.vinSerial),
            safeString(item.assignedTo),
            safeString(item.jobNumber),
            safeString(item.toolRoomLocation),
          ]
            .filter(Boolean)
            .join(" • ") || `Equipment ${item.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [equipmentInventory]);

  const materialItemOptions = useMemo(() => {
    return materials
      .map((item) => ({
        value: String(item.id),
        label:
          [
            safeString(item.item),
            safeString(item.job),
            safeString(item.poNumber),
            safeString(item.location),
          ]
            .filter(Boolean)
            .join(" • ") || `Material ${item.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [materials]);

  const prefabItemOptions = useMemo(() => {
    return prefab
      .map((item) => ({
        value: String(item.id),
        label:
          [
            safeString(item.assembly),
            safeString(item.job),
            safeString(item.area),
          ]
            .filter(Boolean)
            .join(" • ") || `Prefab ${item.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [prefab]);

  function getOptionsForItemType(itemType: TicketItemType) {
    switch (itemType) {
      case "Tool":
        return toolItemOptions;
      case "Trailer":
        return trailerItemOptions;
      case "Vehicle":
        return vehicleItemOptions;
      case "Equipment":
        return equipmentOnlyItemOptions;
      case "Material":
        return materialItemOptions;
      case "Prefab":
        return prefabItemOptions;
      default:
        return [];
    }
  }

  const openPickTickets = useMemo(() => {
    return tickets.filter(
      (ticket) =>
        ticket.type === "Pick" &&
        ticket.status !== "Complete" &&
        ticket.status !== "Cancelled"
    );
  }, [tickets]);

  const pickTicketHistory = useMemo(() => {
    return [...tickets]
      .filter(
        (ticket) =>
          ticket.type === "Pick" &&
          (ticket.status === "Complete" || ticket.status === "Cancelled")
      )
      .sort((a, b) => {
        const aDate = new Date(a.requestDate || 0).getTime();
        const bDate = new Date(b.requestDate || 0).getTime();
        return bDate - aDate;
      });
  }, [tickets]);

  function saveData(nextTickets: ShopTicket[], nextRequests = requests) {
    setTickets(nextTickets);
    setRequests(nextRequests);

    const current = loadStoredAppData();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...current,
        tickets: nextTickets,
        requests: nextRequests,
      })
    );
  }

  function addDraftLine() {
    if (!lineForm.itemName.trim()) {
      alert("Select an item.");
      return;
    }

    const newLine: TicketLine = {
      id: Date.now(),
      itemType: lineForm.itemType,
      itemId: lineForm.itemId ? Number(lineForm.itemId) : null,
      itemName: lineForm.itemName.trim(),
      qty: Number(lineForm.qty) || 1,
      unit: lineForm.unit.trim() || "ea",
      fromLocation: normalizeLocation(lineForm.fromLocation),
      toLocation: normalizeLocation(lineForm.toLocation),
      notes: lineForm.lineNotes.trim(),
    };

    setDraftLines((prev) => [...prev, newLine]);
    setLineForm((prev) => ({
      ...emptyLineForm(),
      fromLocation: prev.fromLocation,
      toLocation: prev.toLocation,
    }));
  }

  function removeDraftLine(id: number) {
    setDraftLines((prev) => prev.filter((line) => line.id !== id));
  }

  function createPickTicket() {
    if (draftLines.length === 0) {
      alert("Add at least one line item to the pick ticket.");
      return;
    }

    const current = loadStoredAppData();
    const existing = current.tickets ?? [];
    const ticketNumber = makePickTicketNumber(existing);

    const newTicket: ShopTicket = {
      id: Date.now(),
      ticketNumber,
      type: "Pick",
      jobNumber: pickTicketForm.jobNumber.trim(),
      requestedBy: pickTicketForm.requestedBy.trim(),
      assignedTo: pickTicketForm.assignedTo.trim(),
      requestDate: new Date().toISOString(),
      neededBy: pickTicketForm.neededBy,
      status: "Open",
      notes: pickTicketForm.notes.trim(),
      lines: draftLines.map((line, index) => ({
        ...line,
        id: Date.now() + index + 1,
      })),
    };

    saveData([newTicket, ...existing], requests);

    setPickTicketForm({
      jobNumber: "",
      requestedBy: "",
      assignedTo: "",
      neededBy: "",
      notes: "",
    });
    setLineForm(emptyLineForm());
    setDraftLines([]);
  }

  function updateRequestAfterTransferCreated(
    request: JobRequest,
    transferTicket: ShopTicket
  ): JobRequest {
    return {
      ...request,
      status: "In Progress",
      workflowStatus: "Transfer Ticket Created",
      transferTicketId: transferTicket.id,
      transferTicketNumber: transferTicket.ticketNumber,
    };
  }

  function updateTicketStatus(id: number, status: TicketStatus) {
    const current = loadStoredAppData();
    const currentTickets = current.tickets ?? [];
    const currentRequests = current.requests ?? [];

    const ticket = currentTickets.find((t) => t.id === id);
    if (!ticket) return;

    if (status !== "Complete") {
      const nextTickets = currentTickets.map((t) =>
        t.id === id ? { ...t, status } : t
      );
      saveData(nextTickets, currentRequests);
      return;
    }

    if (ticket.status === "Complete") return;

    const completedTickets = currentTickets.map((t) =>
      t.id === id ? { ...t, status: "Complete" as const } : t
    );

    if (ticket.type !== "Pick") {
      saveData(completedTickets, currentRequests);
      return;
    }

    const linkedRequest = ticket.sourceRequestId
      ? currentRequests.find((r) => r.id === ticket.sourceRequestId)
      : null;

    if (
      linkedRequest &&
      (linkedRequest.transferTicketId || linkedRequest.transferTicketNumber)
    ) {
      saveData(completedTickets, currentRequests);
      return;
    }

    const transferTicketNumber = makeTransferTicketNumber(completedTickets);

    const newTransferTicket: ShopTicket = {
      id: Date.now(),
      ticketNumber: transferTicketNumber,
      type: "Transfer",
      jobNumber: ticket.jobNumber,
      requestedBy: ticket.requestedBy,
      assignedTo: ticket.assignedTo,
      requestDate: new Date().toISOString(),
      neededBy: ticket.neededBy,
      status: "Open",
      notes: ticket.notes,
      sourceRequestId: ticket.sourceRequestId ?? null,
      lines: ticket.lines.map((line, index) => ({
        ...line,
        id: Date.now() + index + 1,
        fromLocation: safeString(line.fromLocation) || "Shop",
        toLocation: safeString(line.toLocation) || safeString(ticket.jobNumber),
      })),
    };

    const nextTickets = [newTransferTicket, ...completedTickets];

    let nextRequests = currentRequests;
    if (linkedRequest) {
      nextRequests = currentRequests.map((request) =>
        request.id === linkedRequest.id
          ? updateRequestAfterTransferCreated(request, newTransferTicket)
          : request
      );
    }

    saveData(nextTickets, nextRequests);
  }

  return (
    <main style={pageStyle}>
      <div style={layoutStyle}>
        <AppSidebar active="pickTickets" />

        <div style={mainStyle}>
          <div style={topBarStyle}>
            <div>
              <h1 style={{ fontSize: 30, margin: 0, color: "#f5f5f5" }}>
                Pick Tickets
              </h1>
              <p style={{ color: "#d1d5db", margin: "6px 0 0 0" }}>
                Create, track, and close pick tickets.
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
            <StatCard title="Open Pick Tickets" value={String(openPickTickets.length)} />
            <StatCard title="Pick Ticket History" value={String(pickTicketHistory.length)} />
          </div>

          <Section title="Pick Ticket Header" collapsible defaultOpen>
            <div style={{ display: "grid", gap: 20 }}>
              <div style={ticketFormGridStyle}>
                <Field label="Job#">
                  <select
                    value={pickTicketForm.jobNumber}
                    onChange={(e) =>
                      setPickTicketForm((prev) => ({ ...prev, jobNumber: e.target.value }))
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
                    value={pickTicketForm.requestedBy}
                    onChange={(e) =>
                      setPickTicketForm((prev) => ({
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

                <Field label="Assigned To Person">
                  <select
                    value={pickTicketForm.assignedTo}
                    onChange={(e) =>
                      setPickTicketForm((prev) => ({
                        ...prev,
                        assignedTo: e.target.value,
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
                    value={pickTicketForm.neededBy}
                    onChange={(e) =>
                      setPickTicketForm((prev) => ({
                        ...prev,
                        neededBy: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </Field>

                <Field label="Ticket Notes">
                  <input
                    value={pickTicketForm.notes}
                    onChange={(e) =>
                      setPickTicketForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Add Pick Line Item" collapsible defaultOpen>
            <div style={{ display: "grid", gap: 20 }}>
              <div style={ticketFormGridStyle}>
                <Field label="Item Type">
                  <select
                    value={lineForm.itemType}
                    onChange={(e) =>
                      setLineForm((prev) => ({
                        ...prev,
                        itemType: e.target.value as TicketItemType,
                        itemId: "",
                        itemName: "",
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="Tool">Tool</option>
                    <option value="Trailer">Trailer</option>
                    <option value="Vehicle">Vehicle</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Material">Material</option>
                    <option value="Prefab">Prefab</option>
                  </select>
                </Field>

                <Field label="From Location">
                  <select
                    value={lineForm.fromLocation}
                    onChange={(e) =>
                      setLineForm((prev) => ({
                        ...prev,
                        fromLocation: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="">Select from location</option>
                    {locationOptions.map((location) => (
                      <option key={`pick-from-${location}`} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="To Location">
                  <select
                    value={lineForm.toLocation}
                    onChange={(e) =>
                      setLineForm((prev) => ({
                        ...prev,
                        toLocation: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="">Select to location</option>
                    {locationOptions.map((location) => (
                      <option key={`pick-to-${location}`} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Item Name">
                  <select
                    value={lineForm.itemId}
                    onChange={(e) => {
                      const selected = getOptionsForItemType(lineForm.itemType).find(
                        (option) => option.value === e.target.value
                      );

                      setLineForm((prev) => ({
                        ...prev,
                        itemId: e.target.value,
                        itemName: selected?.label || "",
                      }));
                    }}
                    style={inputStyle}
                  >
                    <option value="">Select item</option>
                    {getOptionsForItemType(lineForm.itemType).map((option) => (
                      <option
                        key={`pick-${lineForm.itemType}-${option.value}`}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Qty">
                  <input
                    type="number"
                    value={lineForm.qty}
                    onChange={(e) =>
                      setLineForm((prev) => ({ ...prev, qty: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </Field>

                <Field label="Unit">
                  <input
                    value={lineForm.unit}
                    onChange={(e) =>
                      setLineForm((prev) => ({ ...prev, unit: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </Field>

                <Field label="Line Notes">
                  <input
                    value={lineForm.lineNotes}
                    onChange={(e) =>
                      setLineForm((prev) => ({
                        ...prev,
                        lineNotes: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </Field>
              </div>

              <div>
                <button type="button" onClick={addDraftLine} style={actionButtonStyle}>
                  Add Line Item
                </button>
              </div>
            </div>
          </Section>

          <Section title="Draft Pick Lines" collapsible defaultOpen>
            {draftLines.length === 0 ? (
              <div style={{ color: "#a3a3a3" }}>No line items added yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {draftLines.map((line) => (
                  <div key={line.id} style={ticketCardStyle}>
                    <div style={ticketHeaderStyle}>
                      <div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: "#f5f5f5",
                          }}
                        >
                          {line.itemName}
                        </div>
                        <div style={{ color: "#d1d5db", fontSize: 14 }}>
                          {line.itemType} • Qty {line.qty} {line.unit}
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
                      {line.fromLocation ? `From: ${line.fromLocation}` : ""}
                      {line.fromLocation && line.toLocation ? " • " : ""}
                      {line.toLocation ? `To: ${line.toLocation}` : ""}
                    </div>

                    {!!line.notes && (
                      <div style={ticketLineStyle}>
                        <strong>Notes:</strong> {line.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <div>
            <button type="button" onClick={createPickTicket} style={actionButtonStyle}>
              Create Pick Ticket
            </button>
          </div>

          <Section title="Open Pick Tickets" collapsible defaultOpen>
            <TicketTable rows={openPickTickets} onUpdateStatus={updateTicketStatus} />
          </Section>

          <Section title="Pick Ticket History" collapsible defaultOpen={false}>
            <TicketTable rows={pickTicketHistory} onUpdateStatus={updateTicketStatus} />
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

function TicketTable({
  rows,
  onUpdateStatus,
}: {
  rows: ShopTicket[];
  onUpdateStatus: (id: number, status: TicketStatus) => void;
}) {
  if (!rows.length) {
    return <div style={{ color: "#a3a3a3" }}>No tickets found.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {rows.map((ticket) => (
        <div key={ticket.id} style={ticketCardStyle}>
          <div style={ticketHeaderStyle}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>
                {ticket.ticketNumber}
              </div>
              <div style={{ color: "#d1d5db", fontSize: 14 }}>
                {ticket.type} • {ticket.jobNumber || "No Job"}
              </div>
            </div>

            <div style={ticketBadgeStyle(ticket.status)}>{ticket.status}</div>
          </div>

          <div style={ticketGridStyle}>
            <TicketDetail label="Requested By" value={ticket.requestedBy} />
            <TicketDetail label="Assigned To" value={ticket.assignedTo} />
            <TicketDetail label="Needed By" value={ticket.neededBy} />
            <TicketDetail label="Line Count" value={String(ticket.lines.length)} />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {ticket.lines.map((line) => (
              <div key={line.id} style={ticketLineStyle}>
                <div style={{ fontWeight: 700, color: "#f5f5f5" }}>{line.itemName}</div>
                <div style={{ color: "#d1d5db", fontSize: 14 }}>
                  {line.itemType} • Qty {line.qty} {line.unit}
                </div>
                <div style={{ color: "#a3a3a3", fontSize: 13 }}>
                  {line.fromLocation ? `From: ${line.fromLocation}` : ""}
                  {line.fromLocation && line.toLocation ? " • " : ""}
                  {line.toLocation ? `To: ${line.toLocation}` : ""}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={smallActionButtonStyle}
              onClick={() => onUpdateStatus(ticket.id, "Approved")}
            >
              Approve
            </button>
            <button
              type="button"
              style={smallActionButtonStyle}
              onClick={() => onUpdateStatus(ticket.id, "In Progress")}
            >
              In Progress
            </button>
            <button
              type="button"
              style={smallActionButtonStyle}
              onClick={() => onUpdateStatus(ticket.id, "Ready")}
            >
              Ready
            </button>
            <button
              type="button"
              style={smallActionButtonStyle}
              onClick={() => onUpdateStatus(ticket.id, "Complete")}
            >
              Complete
            </button>
            <button
              type="button"
              style={{
                ...smallActionButtonStyle,
                background: "#7f1d1d",
                border: "1px solid #991b1b",
              }}
              onClick={() => onUpdateStatus(ticket.id, "Cancelled")}
            >
              Cancel
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TicketDetail({ label, value }: { label: string; value: string }) {
  return (
    <div style={ticketDetailStyle}>
      <div style={{ fontSize: 12, color: "#a3a3a3", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#f5f5f5" }}>
        {value || "-"}
      </div>
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

const ticketFormGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const ticketCardStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 12,
  padding: 16,
  display: "grid",
  gap: 14,
  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
};

const ticketHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const ticketGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
};

const ticketDetailStyle: React.CSSProperties = {
  background: "#141414",
  border: "1px solid #2f2f2f",
  borderRadius: 10,
  padding: 10,
};

const ticketLineStyle: React.CSSProperties = {
  background: "#141414",
  border: "1px solid #2f2f2f",
  borderRadius: 10,
  padding: 10,
  color: "#d1d5db",
};

function ticketBadgeStyle(status: TicketStatus): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid transparent",
  };

  if (status === "Complete") {
    return {
      ...base,
      background: "#14532d",
      color: "#dcfce7",
      border: "1px solid #166534",
    };
  }

  if (status === "Cancelled") {
    return {
      ...base,
      background: "#7f1d1d",
      color: "#fecaca",
      border: "1px solid #991b1b",
    };
  }

  if (status === "Ready") {
    return {
      ...base,
      background: "#9a3412",
      color: "#ffedd5",
      border: "1px solid #ea580c",
    };
  }

  if (status === "In Progress") {
    return {
      ...base,
      background: "#7c2d12",
      color: "#fed7aa",
      border: "1px solid #c2410c",
    };
  }

  if (status === "Approved") {
    return {
      ...base,
      background: "#2a2a2a",
      color: "#f5f5f5",
      border: "1px solid #3a3a3a",
    };
  }

  return {
    ...base,
    background: "#2a2a2a",
    color: "#d1d5db",
    border: "1px solid #3a3a3a",
  };
}