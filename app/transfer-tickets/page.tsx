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
  TicketType,
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

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function isShopLocation(location: string) {
  const normalized = safeString(location).toLowerCase();
  return SHOP_LOCATIONS.some((value) => value.toLowerCase() === normalized);
}

function normalizeLocation(location: string) {
  const trimmed = safeString(location);
  if (!trimmed) return "";
  const shopMatch = SHOP_LOCATIONS.find(
    (value) => value.toLowerCase() === trimmed.toLowerCase()
  );
  return shopMatch || trimmed;
}

function isPersonLocation(location: string, employees: Employee[]) {
  const normalized = safeString(location).toLowerCase();
  return employees.some(
    (employee) => normalizeEmployeeName(employee.name) === normalized
  );
}

function locationToAssignmentType(location: string, employees: Employee[]) {
  const normalized = normalizeLocation(location);

  if (isPersonLocation(normalized, employees)) return "Person" as const;
  if (normalized === "Tool Room") return "Tool Room" as const;
  if (normalized === "Shop") return "Shop" as const;
  if (normalized === "Yard") return "Yard" as const;
  if (normalized === "WH1") return "WH1" as const;
  if (normalized === "WH2") return "WH2" as const;

  return "Job" as const;
}

function assetTypeOf(item: EquipmentItem) {
  return safeString(item.assetType);
}

function makeTicketNumber(type: TicketType, existing: ShopTicket[]) {
  const prefix = type === "Pick" ? "PT" : "TT";
  const count = existing.filter((t) => t.type === type).length + 1;
  return `${prefix}-${String(count).padStart(4, "0")}`;
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
      purchaseOrders: Array.isArray(parsed.purchaseOrders) ? parsed.purchaseOrders : [],
      assemblies: Array.isArray(parsed.assemblies) ? parsed.assemblies : [],
      assemblyBom: Array.isArray(parsed.assemblyBom) ? parsed.assemblyBom : [],
      regularInventory: Array.isArray(parsed.regularInventory) ? parsed.regularInventory : [],
      materialMovements: Array.isArray(parsed.materialMovements)
        ? parsed.materialMovements
        : [],
      toolInventory: Array.isArray(parsed.toolInventory) ? parsed.toolInventory : [],
      equipmentInventory: Array.isArray(parsed.equipmentInventory)
        ? parsed.equipmentInventory
        : [],
      inventoryLogs: Array.isArray(parsed.inventoryLogs) ? parsed.inventoryLogs : [],
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
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

function matchesFromLocationTool(
  item: ToolItem,
  fromLocation: string,
  employees: Employee[]
) {
  if (!fromLocation) return true;

  const normalizedFrom = safeString(fromLocation).toLowerCase();
  const assignmentType = safeString(item.assignmentType).toLowerCase();
  const toolRoomLocation = safeString(item.toolRoomLocation).toLowerCase();
  const jobNumber = safeString(item.jobNumber).toLowerCase();
  const assignedTo = safeString(item.assignedTo).toLowerCase();

  if (isPersonLocation(fromLocation, employees)) {
    return assignmentType === "person" && assignedTo === normalizedFrom;
  }

  if (isShopLocation(fromLocation)) {
    return (
      assignmentType === normalizedFrom ||
      toolRoomLocation === normalizedFrom ||
      jobNumber === normalizedFrom
    );
  }

  return jobNumber === normalizedFrom;
}

function matchesFromLocationEquipment(
  item: EquipmentItem,
  fromLocation: string,
  employees: Employee[]
) {
  if (!fromLocation) return true;

  const normalizedFrom = safeString(fromLocation).toLowerCase();
  const assignmentType = safeString(item.assignmentType).toLowerCase();
  const toolRoomLocation = safeString(item.toolRoomLocation).toLowerCase();
  const jobNumber = safeString(item.jobNumber).toLowerCase();
  const assignedTo = safeString(item.assignedTo).toLowerCase();

  if (isPersonLocation(fromLocation, employees)) {
    return assignmentType === "person" && assignedTo === normalizedFrom;
  }

  if (isShopLocation(fromLocation)) {
    return (
      assignmentType === normalizedFrom ||
      toolRoomLocation === normalizedFrom ||
      jobNumber === normalizedFrom
    );
  }

  return jobNumber === normalizedFrom;
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

function buildMaterialTargetKey(material: Material, location: string) {
  return [
    safeString(material.job).toLowerCase(),
    safeString(material.item).toLowerCase(),
    safeString(material.category).toLowerCase(),
    safeString(material.unit).toLowerCase(),
    safeString(material.vendor).toLowerCase(),
    safeString(material.poNumber).toLowerCase(),
    safeString(location).toLowerCase(),
  ].join("||");
}

export default function TransferTicketsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [prefab, setPrefab] = useState<PrefabItem[]>([]);
  const [toolInventory, setToolInventory] = useState<ToolItem[]>([]);
  const [equipmentInventory, setEquipmentInventory] = useState<EquipmentItem[]>([]);
  const [tickets, setTickets] = useState<ShopTicket[]>([]);
  const [requests, setRequests] = useState<JobRequest[]>([]);

  const [transferTicketForm, setTransferTicketForm] = useState({
    jobNumber: "",
    requestedBy: "",
    assignedTo: "",
    neededBy: "",
    notes: "",
  });

  const [lineForm, setLineForm] = useState(emptyLineForm());
  const [draftLines, setDraftLines] = useState<TicketLine[]>([]);

  function refreshFromStorage() {
    const parsed = loadStoredAppData();
    setMaterials(parsed.materials);
    setPrefab(parsed.prefab);
    setTickets(parsed.tickets ?? []);
    setRequests(parsed.requests ?? []);
    setToolInventory(loadStoredTools());
    setEquipmentInventory(loadStoredEquipment());
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

  useEffect(() => {
    const parsed = loadStoredAppData();

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

    async function init() {
      refreshFromStorage();
      await loadJobs();
      await loadMaterialsApi();
      await loadEmployeesFromApi();
    }

    init();

    const handleFocus = () => {
      refreshFromStorage();
      loadEmployeesFromApi();
    };

    const handleStorage = () => {
      refreshFromStorage();
      loadEmployeesFromApi();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  async function reloadMaterialsFromApi() {
    const response = await fetch("/api/materials", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to reload materials");
    const data = await response.json();
    const rows = Array.isArray(data) ? data : [];
    setMaterials(rows);
    return rows as Material[];
  }

  function saveAllData(args: {
    nextTickets?: ShopTicket[];
    nextRequests?: JobRequest[];
    nextToolInventory?: ToolItem[];
    nextEquipmentInventory?: EquipmentItem[];
    nextMaterials?: Material[];
    nextPrefab?: PrefabItem[];
  }) {
    const nextTickets = args.nextTickets ?? tickets;
    const nextRequests = args.nextRequests ?? requests;
    const nextToolInventory = args.nextToolInventory ?? toolInventory;
    const nextEquipmentInventory = args.nextEquipmentInventory ?? equipmentInventory;
    const nextMaterials = args.nextMaterials ?? materials;
    const nextPrefab = args.nextPrefab ?? prefab;

    setTickets(nextTickets);
    setRequests(nextRequests);
    setToolInventory(nextToolInventory);
    setEquipmentInventory(nextEquipmentInventory);
    setMaterials(nextMaterials);
    setPrefab(nextPrefab);

    const current = loadStoredAppData();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...current,
        tickets: nextTickets,
        requests: nextRequests,
        toolInventory: nextToolInventory,
        equipmentInventory: nextEquipmentInventory,
        materials: nextMaterials,
        prefab: nextPrefab,
      })
    );

    localStorage.setItem(MASTER_TOOLS_KEY, JSON.stringify(nextToolInventory));
    localStorage.setItem(MASTER_EQUIPMENT_KEY, JSON.stringify(nextEquipmentInventory));
  }

  const jobOptions = useMemo(
    () => jobs.map((job) => job.jobNumber).sort((a, b) => a.localeCompare(b)),
    [jobs]
  );

  const employeeOptions = useMemo(() => {
    return cleanEmployees(employees).map((employee) => safeString(employee.name));
  }, [employees]);

  const locationOptions = useMemo(() => {
    const values = [...SHOP_LOCATIONS, ...jobOptions, ...employeeOptions];
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [jobOptions, employeeOptions]);

  const filteredToolItemOptions = useMemo(() => {
    const fromLocation = lineForm.fromLocation;

    return toolInventory
      .filter((item) => matchesFromLocationTool(item, fromLocation, employees))
      .map((item) => ({
        value: String(item.id),
        label:
          [
            safeString(item.description),
            safeString(item.itemNumber),
            safeString(item.barcode),
            safeString(item.serialNumber),
            safeString(item.assignedTo),
            safeString(item.jobNumber),
            safeString(item.toolRoomLocation),
          ]
            .filter(Boolean)
            .join(" • ") || `Tool ${item.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [toolInventory, lineForm.fromLocation, employees]);

  const filteredTrailerItemOptions = useMemo(() => {
    const fromLocation = lineForm.fromLocation;

    return equipmentInventory
      .filter((item) => assetTypeOf(item) === "Trailer")
      .filter((item) => matchesFromLocationEquipment(item, fromLocation, employees))
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
  }, [equipmentInventory, lineForm.fromLocation, employees]);

  const filteredVehicleItemOptions = useMemo(() => {
    const fromLocation = lineForm.fromLocation;

    return equipmentInventory
      .filter((item) => assetTypeOf(item) === "Vehicle")
      .filter((item) => matchesFromLocationEquipment(item, fromLocation, employees))
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
  }, [equipmentInventory, lineForm.fromLocation, employees]);

  const filteredEquipmentOnlyItemOptions = useMemo(() => {
    const fromLocation = lineForm.fromLocation;

    return equipmentInventory
      .filter((item) => assetTypeOf(item) === "Equipment")
      .filter((item) => matchesFromLocationEquipment(item, fromLocation, employees))
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
  }, [equipmentInventory, lineForm.fromLocation, employees]);

  const filteredMaterialItemOptions = useMemo(() => {
    const fromLocation = safeString(lineForm.fromLocation).toLowerCase();

    return materials
      .filter((item) => {
        if (!fromLocation) return true;
        return safeString(item.location).toLowerCase() === fromLocation;
      })
      .map((item) => ({
        value: String(item.id),
        label:
          [
            safeString(item.item),
            safeString(item.job),
            safeString(item.poNumber),
            safeString(item.location),
            `Stock ${safeNumber((item as any).stockQty, 0)}`,
          ]
            .filter(Boolean)
            .join(" • ") || `Material ${item.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [materials, lineForm.fromLocation]);

  const filteredPrefabItemOptions = useMemo(() => {
    const fromLocation = safeString(lineForm.fromLocation).toLowerCase();

    return prefab
      .filter((item) => {
        if (!fromLocation) return true;
        return safeString(item.job).toLowerCase() === fromLocation;
      })
      .map((item) => ({
        value: String(item.id),
        label:
          [safeString(item.assembly), safeString(item.job), safeString(item.area)]
            .filter(Boolean)
            .join(" • ") || `Prefab ${item.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [prefab, lineForm.fromLocation]);

  function getOptionsForItemType(itemType: TicketItemType) {
    switch (itemType) {
      case "Tool":
        return filteredToolItemOptions;
      case "Trailer":
        return filteredTrailerItemOptions;
      case "Vehicle":
        return filteredVehicleItemOptions;
      case "Equipment":
        return filteredEquipmentOnlyItemOptions;
      case "Material":
        return filteredMaterialItemOptions;
      case "Prefab":
        return filteredPrefabItemOptions;
      default:
        return [];
    }
  }

  const openTransferTickets = useMemo(() => {
    return tickets.filter(
      (ticket) =>
        ticket.type === "Transfer" &&
        ticket.status !== "Complete" &&
        ticket.status !== "Cancelled"
    );
  }, [tickets]);

  const transferTicketHistory = useMemo(() => {
    return [...tickets]
      .filter(
        (ticket) =>
          ticket.type === "Transfer" &&
          (ticket.status === "Complete" || ticket.status === "Cancelled")
      )
      .sort((a, b) => {
        const aDate = new Date(a.requestDate || 0).getTime();
        const bDate = new Date(b.requestDate || 0).getTime();
        return bDate - aDate;
      });
  }, [tickets]);

  function addDraftLine() {
    if (!lineForm.itemName.trim()) {
      alert("Select an item.");
      return;
    }

    if (!lineForm.fromLocation.trim() || !lineForm.toLocation.trim()) {
      alert("Select both From Location and To Location.");
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

  function createTransferTicket() {
    if (draftLines.length === 0) {
      alert("Add at least one line item to the transfer ticket.");
      return;
    }

    const current = loadStoredAppData();
    const existing = current.tickets ?? [];
    const ticketNumber = makeTicketNumber("Transfer", existing);

    const newTicket: ShopTicket = {
      id: Date.now(),
      ticketNumber,
      type: "Transfer",
      jobNumber: transferTicketForm.jobNumber.trim(),
      requestedBy: transferTicketForm.requestedBy.trim(),
      assignedTo: transferTicketForm.assignedTo.trim(),
      requestDate: new Date().toISOString(),
      neededBy: transferTicketForm.neededBy,
      status: "Open",
      notes: transferTicketForm.notes.trim(),
      lines: draftLines.map((line, index) => ({
        ...line,
        id: Date.now() + index + 1,
      })),
    };

    saveAllData({
      nextTickets: [newTicket, ...existing],
    });

    setTransferTicketForm({
      jobNumber: "",
      requestedBy: "",
      assignedTo: "",
      neededBy: "",
      notes: "",
    });
    setLineForm(emptyLineForm());
    setDraftLines([]);
  }

  function markRequestComplete(request: JobRequest) {
    const completedAt = new Date().toISOString();

    return {
      ...request,
      status: "Complete" as const,
      workflowStatus: "Assigned to Job" as const,
      deliveredToSiteAt: completedAt,
      assignedToJobAt: completedAt,
    };
  }

  async function completeMaterialLine(
    line: TicketLine,
    availableMaterials: Material[]
  ) {
    if (line.itemType !== "Material" || line.itemId == null) return;

    const qty = Math.max(0, Number(line.qty) || 0);
    if (qty <= 0) return;

    const fromLocation = normalizeLocation(line.fromLocation);
    const toLocation = normalizeLocation(line.toLocation);

    const source = availableMaterials.find(
      (material) => Number(material.id) === Number(line.itemId)
    );
    if (!source) return;

    if (
      safeString(source.location).toLowerCase() !== safeString(fromLocation).toLowerCase()
    ) {
      return;
    }

    const sourceNextStock = Math.max(Number((source as any).stockQty || 0) - qty, 0);

    const sourceUpdateResponse = await fetch(`/api/materials/${source.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...source,
        stockQty: sourceNextStock,
      }),
    });

    if (!sourceUpdateResponse.ok) {
      throw new Error(`Failed updating source material row for ${source.item}`);
    }

    const targetKey = buildMaterialTargetKey(source, toLocation);

    const target = availableMaterials.find(
      (material) => buildMaterialTargetKey(material, safeString(material.location)) === targetKey
    );

    if (target) {
      const targetNextStock = Number((target as any).stockQty || 0) + qty;

      const targetUpdateResponse = await fetch(`/api/materials/${target.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...target,
          stockQty: targetNextStock,
        }),
      });

      if (!targetUpdateResponse.ok) {
        throw new Error(`Failed updating destination material row for ${source.item}`);
      }
    } else {
      const createResponse = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job: source.job,
          item: source.item,
          category: source.category,
          orderedQty: isShopLocation(toLocation) ? 0 : qty,
          receivedQty: isShopLocation(toLocation) ? 0 : qty,
          stockQty: qty,
          allocatedQty: 0,
          unit: source.unit,
          vendor: source.vendor,
          status: isShopLocation(toLocation) ? "Ordered" : "Received",
          location: toLocation,
          poNumber: source.poNumber,
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Failed creating destination material row for ${source.item}`);
      }
    }
  }

  async function updateTicketStatus(id: number, status: TicketStatus) {
    const current = loadStoredAppData();
    const currentTickets = current.tickets ?? [];
    const currentRequests = current.requests ?? [];
    const currentTools = loadStoredTools();
    const currentEquipment = loadStoredEquipment();
    const currentPrefab = current.prefab ?? [];

    const ticket = currentTickets.find((t) => t.id === id);
    if (!ticket) return;

    if (status !== "Complete") {
      const nextTickets = currentTickets.map((t) =>
        t.id === id ? { ...t, status } : t
      );
      saveAllData({ nextTickets });
      return;
    }

    if (ticket.status === "Complete") return;

    try {
      let apiMaterials = [...materials];

      for (const line of ticket.lines) {
        if (line.itemType === "Material") {
          await completeMaterialLine(line, apiMaterials);
          apiMaterials = await reloadMaterialsFromApi();
        }
      }

      const completedTickets = currentTickets.map((t) =>
        t.id === id ? { ...t, status: "Complete" as const } : t
      );

      const nextToolInventory = currentTools.map((tool) => {
        const matchingLine = ticket.lines.find(
          (line) => line.itemType === "Tool" && Number(line.itemId) === Number(tool.id)
        );
        if (!matchingLine) return tool;

        const toLocation = normalizeLocation(matchingLine.toLocation);
        const nextAssignmentType = locationToAssignmentType(toLocation, employees);
        const toIsShop = isShopLocation(toLocation);
        const toIsPerson = isPersonLocation(toLocation, employees);

        return {
          ...tool,
          jobNumber: nextAssignmentType === "Job" ? toLocation : "",
          assignmentType: nextAssignmentType,
          assignedTo: toIsPerson ? toLocation : "",
          toolRoomLocation: toIsShop ? toLocation : "",
          transferDateIn: toIsShop ? todayIsoDate() : tool.transferDateIn,
          transferDateOut: todayIsoDate(),
        };
      });

      const nextEquipmentInventory = currentEquipment.map((item) => {
        const matchingLine = ticket.lines.find(
          (line) =>
            (line.itemType === "Trailer" ||
              line.itemType === "Vehicle" ||
              line.itemType === "Equipment") &&
            Number(line.itemId) === Number(item.id)
        );
        if (!matchingLine) return item;

        const toLocation = normalizeLocation(matchingLine.toLocation);
        const nextAssignmentType = locationToAssignmentType(toLocation, employees);
        const toIsShop = isShopLocation(toLocation);
        const toIsPerson = isPersonLocation(toLocation, employees);

        return {
          ...item,
          jobNumber: nextAssignmentType === "Job" ? toLocation : "",
          assignmentType: nextAssignmentType,
          assignedTo: toIsPerson ? toLocation : "",
          toolRoomLocation: toIsShop ? toLocation : "",
          transferDateIn: toIsShop ? todayIsoDate() : item.transferDateIn,
          transferDateOut: todayIsoDate(),
        };
      });

      const nextPrefab = currentPrefab.map((item) => {
        const matchingLine = ticket.lines.find(
          (line) => line.itemType === "Prefab" && Number(line.itemId) === Number(item.id)
        );
        if (!matchingLine) return item;

        const toLocation = normalizeLocation(matchingLine.toLocation);
        const toIsShop = isShopLocation(toLocation);

        return {
          ...item,
          job: toIsShop || isPersonLocation(toLocation, employees) ? "" : toLocation,
        };
      });

      let nextRequests = currentRequests;

      if (ticket.sourceRequestId) {
        nextRequests = currentRequests.map((request) =>
          request.id === ticket.sourceRequestId ? markRequestComplete(request) : request
        );
      }

      saveAllData({
        nextTickets: completedTickets,
        nextRequests,
        nextToolInventory,
        nextEquipmentInventory,
        nextMaterials: apiMaterials,
        nextPrefab,
      });
    } catch (error) {
      console.error("Completing transfer ticket failed:", error);
      alert("Failed to complete transfer ticket.");
    }
  }

  return (
    <main style={pageStyle}>
      <div style={layoutStyle}>
        <AppSidebar active="transferTickets" />

        <div style={mainStyle}>
          <div style={topBarStyle}>
            <div>
              <h1 style={{ fontSize: 30, margin: 0, color: "#f5f5f5" }}>
                Transfer Tickets
              </h1>
              <p style={{ color: "#d1d5db", margin: "6px 0 0 0" }}>
                Move tools, equipment, materials, and prefab between shop, people, and jobs.
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
            <StatCard
              title="Open Transfer Tickets"
              value={String(openTransferTickets.length)}
            />
            <StatCard
              title="Transfer Ticket History"
              value={String(transferTicketHistory.length)}
            />
          </div>

          <Section title="Transfer Ticket Header" collapsible defaultOpen>
            <div style={{ display: "grid", gap: 20 }}>
              <div style={ticketFormGridStyle}>
                <Field label="Job#">
                  <select
                    value={transferTicketForm.jobNumber}
                    onChange={(e) =>
                      setTransferTicketForm((prev) => ({
                        ...prev,
                        jobNumber: e.target.value,
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
                    value={transferTicketForm.requestedBy}
                    onChange={(e) =>
                      setTransferTicketForm((prev) => ({
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
                    value={transferTicketForm.assignedTo}
                    onChange={(e) =>
                      setTransferTicketForm((prev) => ({
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
                    value={transferTicketForm.neededBy}
                    onChange={(e) =>
                      setTransferTicketForm((prev) => ({
                        ...prev,
                        neededBy: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </Field>

                <Field label="Ticket Notes">
                  <input
                    value={transferTicketForm.notes}
                    onChange={(e) =>
                      setTransferTicketForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Add Transfer Line Item" collapsible defaultOpen>
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
                        itemId: "",
                        itemName: "",
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
                      <option key={`to-${location}`} value={location}>
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
                        key={`transfer-${lineForm.itemType}-${option.value}`}
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
                      setLineForm((prev) => ({
                        ...prev,
                        qty: e.target.value,
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
                <button
                  type="button"
                  onClick={addDraftLine}
                  style={actionButtonStyle}
                >
                  Add Line Item
                </button>
              </div>
            </div>
          </Section>

          <Section title="Draft Transfer Lines" collapsible defaultOpen>
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
            <button
              type="button"
              onClick={createTransferTicket}
              style={actionButtonStyle}
            >
              Create Transfer Ticket
            </button>
          </div>

          <Section title="Open Transfer Tickets" collapsible defaultOpen>
            <TicketTable rows={openTransferTickets} onUpdateStatus={updateTicketStatus} />
          </Section>

          <Section title="Transfer Ticket History" collapsible defaultOpen={false}>
            <TicketTable
              rows={transferTicketHistory}
              onUpdateStatus={updateTicketStatus}
            />
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
  onUpdateStatus: (id: number, status: TicketStatus) => void | Promise<void>;
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