"use client";

import { useEffect, useMemo, useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import { inputStyle } from "@/components/InputBlock";
import Section from "@/components/Section";
import StatCard from "@/components/StatCard";
import RequestsTable from "@/components/RequestsTable";

import type {
  AppData,
  AppNotification,
  Employee,
  EquipmentItem,
  Job,
  JobRequest,
  JobRequestLine,
  Material,
  PrefabItem,
  RequestDestinationType,
  RequestStatus,
  RequestType,
  ShopTicket,
  ToolItem,
} from "@/types";

const STORAGE_KEY = "prefab-tracker-v7";
const MASTER_TOOLS_KEY = "master-tool-inventory-v1";
const MASTER_EQUIPMENT_KEY = "master-equipment-inventory-v1";
const SHOP_LOCATIONS = ["Shop", "Tool Room", "Yard", "WH1", "WH2"] as const;

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

type RequestHeaderForm = {
  destinationType: RequestDestinationType;
  jobNumber: string;
  requestedForPerson: string;
  requestedBy: string;
  neededBy: string;
  notes: string;
  requestFlow: "To Job" | "From Job";
  fromLocation: string;
  toLocation: string;
};

type RequestLineForm = {
  type: RequestType;
  category: string;
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  inventoryItemId: number | null;
};

type ItemOption = {
  value: string;
  label: string;
  description: string;
  category: string;
  inventoryItemId: number | null;
};

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function requestDateSafe(value: unknown) {
  const text = safeString(value);
  return text || "1970-01-01";
}

function getNumericId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mergeUniqueById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  const result: T[] = [];

  for (const item of items) {
    if (!item || typeof item.id !== "number") continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }

  return result;
}

function loadStoredAppData(): AppData {
  if (typeof window === "undefined") return defaultData;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;

    const parsed = JSON.parse(raw) as Partial<AppData>;

    return {
      ...defaultData,
      ...parsed,
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
      materials: Array.isArray(parsed.materials) ? parsed.materials : [],
      prefab: Array.isArray(parsed.prefab) ? parsed.prefab : [],
      toolInventory: Array.isArray(parsed.toolInventory) ? parsed.toolInventory : [],
      equipmentInventory: Array.isArray(parsed.equipmentInventory)
        ? parsed.equipmentInventory
        : [],
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      notifications: Array.isArray(parsed.notifications)
        ? parsed.notifications
        : [],
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
    const appRaw = localStorage.getItem(STORAGE_KEY);
    const masterRaw = localStorage.getItem(MASTER_TOOLS_KEY);

    const appParsed = appRaw ? JSON.parse(appRaw) : null;
    const masterParsed = masterRaw ? JSON.parse(masterRaw) : null;

    const appTools = Array.isArray(appParsed?.toolInventory)
      ? appParsed.toolInventory
      : [];

    const masterTools = Array.isArray(masterParsed) ? masterParsed : [];

    const normalized = [...appTools, ...masterTools]
      .map((item) => {
        const id = getNumericId(item?.id);
        if (id === null) return null;
        return { ...item, id } as ToolItem;
      })
      .filter((item): item is ToolItem => item !== null);

    return mergeUniqueById(normalized);
  } catch {
    return [];
  }
}

function loadStoredEquipment(): EquipmentItem[] {
  if (typeof window === "undefined") return [];

  try {
    const appRaw = localStorage.getItem(STORAGE_KEY);
    const masterRaw = localStorage.getItem(MASTER_EQUIPMENT_KEY);

    const appParsed = appRaw ? JSON.parse(appRaw) : null;
    const masterParsed = masterRaw ? JSON.parse(masterRaw) : null;

    const appEquipment = Array.isArray(appParsed?.equipmentInventory)
      ? appParsed.equipmentInventory
      : [];

    const masterEquipment = Array.isArray(masterParsed) ? masterParsed : [];

    const normalized = [...appEquipment, ...masterEquipment]
      .map((item) => {
        const id = getNumericId(item?.id);
        if (id === null) return null;
        return { ...item, id } as EquipmentItem;
      })
      .filter((item): item is EquipmentItem => item !== null);

    return mergeUniqueById(normalized);
  } catch {
    return [];
  }
}

function saveToolInventory(nextTools: ToolItem[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(MASTER_TOOLS_KEY, JSON.stringify(nextTools));

  const current = loadStoredAppData();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...current,
      toolInventory: nextTools,
    })
  );
}

function saveEquipmentInventory(nextEquipment: EquipmentItem[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(MASTER_EQUIPMENT_KEY, JSON.stringify(nextEquipment));

  const current = loadStoredAppData();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...current,
      equipmentInventory: nextEquipment,
    })
  );
}

function saveMaterialInventory(nextMaterials: Material[]) {
  if (typeof window === "undefined") return;

  const current = loadStoredAppData();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...current,
      materials: nextMaterials,
    })
  );
}

function emptyHeaderForm(): RequestHeaderForm {
  return {
    destinationType: "Job",
    jobNumber: "",
    requestedForPerson: "",
    requestedBy: "",
    neededBy: "",
    notes: "",
    requestFlow: "To Job",
    fromLocation: "Shop",
    toLocation: "",
  };
}

function emptyLineForm(): RequestLineForm {
  return {
    type: "Tool",
    category: "",
    itemName: "",
    description: "",
    quantity: 1,
    unit: "ea",
    inventoryItemId: null,
  };
}

function makeTicketNumber(type: "Pick" | "Transfer", existing: ShopTicket[]) {
  const prefix = type === "Pick" ? "PT" : "TT";
  const count = existing.filter((t) => t.type === type).length + 1;
  return `${prefix}-${String(count).padStart(4, "0")}`;
}

function isShopLocation(location: string) {
  const normalized = safeString(location).toLowerCase();
  return SHOP_LOCATIONS.some((value) => value.toLowerCase() === normalized);
}

function isKnownShopLocation(location: string) {
  return SHOP_LOCATIONS.includes(location as (typeof SHOP_LOCATIONS)[number]);
}

function isPersonLocation(location: string, employees: Employee[]) {
  const normalized = safeString(location).toLowerCase();
  return employees.some(
    (employee) =>
      employee.isActive && safeString(employee.name).toLowerCase() === normalized
  );
}

function makeToolDescription(item: ToolItem) {
  return [
    safeString(item.category),
    safeString(item.description),
    safeString(item.manufacturer),
    safeString(item.model),
    safeString(item.itemNumber),
    safeString(item.barcode),
    safeString(item.serialNumber),
    safeString(item.assignmentType),
    safeString(item.jobNumber),
    safeString(item.assignedTo),
    safeString(item.toolRoomLocation),
  ]
    .filter(Boolean)
    .join(" • ");
}

function makeEquipmentDescription(item: EquipmentItem) {
  return [
    safeString(item.assetType),
    safeString(item.category),
    safeString(item.description),
    safeString(item.manufacturer),
    safeString(item.model),
    safeString(item.assetNumber),
    safeString(item.serialNumber),
    safeString(item.vinSerial),
    safeString(item.licensePlate),
    safeString(item.assignmentType),
    safeString(item.jobNumber),
    safeString(item.assignedTo),
    safeString(item.toolRoomLocation),
  ]
    .filter(Boolean)
    .join(" • ");
}

function makeMaterialDescription(item: Material) {
  return [
    safeString(item.category),
    safeString(item.item),
    safeString(item.vendor),
    safeString(item.poNumber),
    safeString(item.location),
    safeString(item.job),
  ]
    .filter(Boolean)
    .join(" • ");
}

function makePrefabDescription(item: PrefabItem) {
  return [
    safeString(item.type),
    safeString(item.assembly),
    safeString(item.job),
    safeString(item.area),
    safeString(item.assignedTo),
    safeString(item.status),
  ]
    .filter(Boolean)
    .join(" • ");
}

function resolveEquipmentCategory(
  item: EquipmentItem
): "Equipment" | "Trailer" | "Vehicle" {
  const assetType = safeString(item.assetType).toLowerCase();
  const category = safeString(item.category).toLowerCase();
  const description = safeString(item.description).toLowerCase();
  const assetNumber = safeString(item.assetNumber).toLowerCase();
  const manufacturer = safeString(item.manufacturer).toLowerCase();
  const model = safeString(item.model).toLowerCase();

  const combined = [
    assetType,
    category,
    description,
    assetNumber,
    manufacturer,
    model,
  ]
    .filter(Boolean)
    .join(" ");

  if (assetType === "trailer" || category === "trailer") return "Trailer";
  if (assetType === "vehicle" || category === "vehicle") return "Vehicle";
  if (assetType === "equipment" || category === "equipment") return "Equipment";

  if (
    combined.includes("trailer") ||
    combined.includes("trailers") ||
    combined.includes("gooseneck") ||
    combined.includes("flatbed trailer") ||
    combined.includes("enclosed trailer") ||
    combined.includes("dump trailer") ||
    combined.includes("equipment trailer") ||
    combined.includes("utility trailer")
  ) {
    return "Trailer";
  }

  if (
    combined.includes("vehicle") ||
    combined.includes("truck") ||
    combined.includes("van") ||
    combined.includes("pickup") ||
    combined.includes("car") ||
    combined.includes("f150") ||
    combined.includes("f250") ||
    combined.includes("f350") ||
    combined.includes("silverado") ||
    combined.includes("ram 1500") ||
    combined.includes("ram 2500") ||
    combined.includes("ram 3500") ||
    combined.includes("tahoe")
  ) {
    return "Vehicle";
  }

  return "Equipment";
}

function isToolAvailable(item: ToolItem) {
  const assignmentType = safeString(item.assignmentType);

  if (
    assignmentType === "Tool Room" ||
    assignmentType === "Shop" ||
    assignmentType === "Yard" ||
    assignmentType === "WH1" ||
    assignmentType === "WH2"
  ) {
    return true;
  }

  if (isShopLocation(safeString(item.toolRoomLocation))) return true;

  return !safeString(item.jobNumber) && !safeString(item.assignedTo);
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

function applyToolRequestCompletion(
  item: ToolItem,
  request: JobRequest,
  employees: Employee[]
): ToolItem {
  const isPickupFlow = request.requestFlow === "From Job";
  const toLocation = safeString(request.toLocation);
  const fromLocation = safeString(request.fromLocation);
  const today = new Date().toISOString().slice(0, 10);

  if (!isPickupFlow) {
    if (request.destinationType === "Job") {
      return {
        ...item,
        assignmentType: "Job",
        jobNumber: safeString(request.jobNumber),
        assignedTo: "",
        toolRoomLocation: "",
        transferDateOut: today,
        transferDateIn: "",
      };
    }

    if (request.destinationType === "Person") {
      return {
        ...item,
        assignmentType: "Person",
        jobNumber: "",
        assignedTo: safeString(request.requestedForPerson),
        toolRoomLocation: "",
        transferDateOut: today,
        transferDateIn: "",
      };
    }

    return {
      ...item,
      assignmentType: "Shop",
      jobNumber: "",
      assignedTo: "",
      toolRoomLocation: "Shop",
      transferDateOut: today,
      transferDateIn: "",
    };
  }

  if (isKnownShopLocation(toLocation)) {
    return {
      ...item,
      assignmentType: toLocation as ToolItem["assignmentType"],
      jobNumber: "",
      assignedTo: "",
      toolRoomLocation: toLocation,
      transferDateIn: today,
    };
  }

  if (isPersonLocation(toLocation, employees)) {
    return {
      ...item,
      assignmentType: "Person",
      jobNumber: "",
      assignedTo: toLocation,
      toolRoomLocation: "",
      transferDateIn: today,
    };
  }

  return {
    ...item,
    assignmentType: "Job",
    jobNumber: toLocation || fromLocation,
    assignedTo: "",
    toolRoomLocation: "",
    transferDateIn: today,
  };
}

function applyEquipmentRequestCompletion(
  item: EquipmentItem,
  request: JobRequest,
  employees: Employee[]
): EquipmentItem {
  const isPickupFlow = request.requestFlow === "From Job";
  const toLocation = safeString(request.toLocation);
  const fromLocation = safeString(request.fromLocation);
  const today = new Date().toISOString().slice(0, 10);

  if (!isPickupFlow) {
    if (request.destinationType === "Job") {
      return {
        ...item,
        assignmentType: "Job",
        jobNumber: safeString(request.jobNumber),
        assignedTo: "",
        toolRoomLocation: "",
        transferDateOut: today,
        transferDateIn: "",
      };
    }

    if (request.destinationType === "Person") {
      return {
        ...item,
        assignmentType: "Person",
        jobNumber: "",
        assignedTo: safeString(request.requestedForPerson),
        toolRoomLocation: "",
        transferDateOut: today,
        transferDateIn: "",
      };
    }

    return {
      ...item,
      assignmentType: "Shop",
      jobNumber: "",
      assignedTo: "",
      toolRoomLocation: "Shop",
      transferDateOut: today,
      transferDateIn: "",
    };
  }

  if (isKnownShopLocation(toLocation)) {
    return {
      ...item,
      assignmentType: toLocation as EquipmentItem["assignmentType"],
      jobNumber: "",
      assignedTo: "",
      toolRoomLocation: toLocation,
      transferDateIn: today,
    };
  }

  if (isPersonLocation(toLocation, employees)) {
    return {
      ...item,
      assignmentType: "Person",
      jobNumber: "",
      assignedTo: toLocation,
      toolRoomLocation: "",
      transferDateIn: today,
    };
  }

  return {
    ...item,
    assignmentType: "Job",
    jobNumber: toLocation || fromLocation,
    assignedTo: "",
    toolRoomLocation: "",
    transferDateIn: today,
  };
}

function applyMaterialRequestCompletion(
  item: Material,
  request: JobRequest,
  employees: Employee[]
): Material {
  const isPickupFlow = request.requestFlow === "From Job";
  const toLocation = safeString(request.toLocation);
  const fromLocation = safeString(request.fromLocation);

  if (!isPickupFlow) {
    if (request.destinationType === "Job") {
      return {
        ...item,
        job: safeString(request.jobNumber),
        location: safeString(request.jobNumber),
      };
    }

    if (request.destinationType === "Person") {
      return {
        ...item,
        job: "",
        location: safeString(request.requestedForPerson),
      };
    }

    return {
      ...item,
      job: "",
      location: "Shop",
    };
  }

  if (isKnownShopLocation(toLocation)) {
    return {
      ...item,
      job: "",
      location: toLocation,
    };
  }

  if (isPersonLocation(toLocation, employees)) {
    return {
      ...item,
      job: "",
      location: toLocation,
    };
  }

  return {
    ...item,
    job: toLocation || fromLocation,
    location: toLocation || fromLocation,
  };
}

export default function RequestsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [tickets, setTickets] = useState<ShopTicket[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [prefab, setPrefab] = useState<PrefabItem[]>([]);
  const [toolInventory, setToolInventory] = useState<ToolItem[]>([]);
  const [equipmentInventory, setEquipmentInventory] = useState<EquipmentItem[]>(
    []
  );

  const [headerForm, setHeaderForm] =
    useState<RequestHeaderForm>(emptyHeaderForm());
  const [lineForm, setLineForm] = useState<RequestLineForm>(emptyLineForm());
  const [requestLines, setRequestLines] = useState<JobRequestLine[]>([]);

  function refreshFromStorage() {
    const parsed = loadStoredAppData();
    setRequests(parsed.requests || []);
    setNotifications(parsed.notifications || []);
    setTickets(parsed.tickets || []);
    setEmployees(parsed.employees || []);
    setMaterials(parsed.materials || []);
    setPrefab(parsed.prefab || []);
    setToolInventory(loadStoredTools());
    setEquipmentInventory(loadStoredEquipment());
  }

  useEffect(() => {
    const parsed = loadStoredAppData();

    async function loadJobsFromApi() {
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

    refreshFromStorage();
    loadJobsFromApi();

    const handleFocus = () => refreshFromStorage();
    const handleStorage = () => refreshFromStorage();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const jobOptions = useMemo(
    () =>
      jobs
        .map((job) => safeString(job.jobNumber))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [jobs]
  );

  const employeeOptions = useMemo(() => {
    return [...employees]
      .filter((employee) => employee.isActive)
      .map((employee) => safeString(employee.name))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const locationOptions = useMemo(
    () => uniqueSorted([...SHOP_LOCATIONS, ...jobOptions, ...employeeOptions]),
    [jobOptions, employeeOptions]
  );

  const reservedToolIds = useMemo(() => {
    const ids = new Set<number>();

    for (const request of requests) {
      if (request.status === "Complete" || request.status === "Rejected") continue;
      if (request.requestFlow === "From Job") continue;

      for (const line of request.lines || []) {
        if (line.type === "Tool" && typeof line.inventoryItemId === "number") {
          ids.add(line.inventoryItemId);
        }
      }
    }

    for (const line of requestLines) {
      if (line.type === "Tool" && typeof line.inventoryItemId === "number") {
        ids.add(line.inventoryItemId);
      }
    }

    return ids;
  }, [requests, requestLines]);

  const reservedEquipmentIds = useMemo(() => {
    const ids = new Set<number>();

    for (const request of requests) {
      if (request.status === "Complete" || request.status === "Rejected") continue;
      if (request.requestFlow === "From Job") continue;

      for (const line of request.lines || []) {
        if (line.type === "Equipment" && typeof line.inventoryItemId === "number") {
          ids.add(line.inventoryItemId);
        }
      }
    }

    for (const line of requestLines) {
      if (line.type === "Equipment" && typeof line.inventoryItemId === "number") {
        ids.add(line.inventoryItemId);
      }
    }

    return ids;
  }, [requests, requestLines]);

  const toolItemOptions = useMemo<ItemOption[]>(() => {
    const isPickupFlow = headerForm.requestFlow === "From Job";
    const source = safeString(headerForm.fromLocation);

    return toolInventory
      .filter((item) =>
        isPickupFlow
          ? matchesFromLocationTool(item, source, employees)
          : isToolAvailable(item)
      )
      .filter((item) => (isPickupFlow ? true : !reservedToolIds.has(item.id)))
      .map((item) => ({
        value: String(item.id),
        label:
          [
            safeString(item.description),
            safeString(item.itemNumber),
            safeString(item.barcode),
            safeString(item.serialNumber),
            safeString(item.manufacturer),
            safeString(item.model),
          ]
            .filter(Boolean)
            .join(" • ") || `Tool ${item.id}`,
        description: makeToolDescription(item),
        category: safeString(item.category) || "Tool",
        inventoryItemId: item.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [
    toolInventory,
    reservedToolIds,
    headerForm.requestFlow,
    headerForm.fromLocation,
    employees,
  ]);

  const equipmentItemOptions = useMemo<ItemOption[]>(() => {
    const isPickupFlow = headerForm.requestFlow === "From Job";
    const source = safeString(headerForm.fromLocation);

    return equipmentInventory
      .filter((item) => {
        if (isPickupFlow) {
          return matchesFromLocationEquipment(item, source, employees);
        }
        return true;
      })
      .filter((item) => (isPickupFlow ? true : !reservedEquipmentIds.has(item.id)))
      .map((item) => ({
        value: String(item.id),
        label:
          [
            safeString(item.assetNumber),
            safeString(item.description),
            safeString(item.manufacturer),
            safeString(item.model),
            safeString(item.licensePlate),
            safeString(item.serialNumber),
            safeString(item.vinSerial),
          ]
            .filter(Boolean)
            .join(" • ") || `Asset ${item.id}`,
        description: makeEquipmentDescription(item),
        category: resolveEquipmentCategory(item),
        inventoryItemId: item.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [
    equipmentInventory,
    reservedEquipmentIds,
    headerForm.requestFlow,
    headerForm.fromLocation,
    employees,
  ]);

  const materialItemOptions = useMemo<ItemOption[]>(() => {
    const isPickupFlow = headerForm.requestFlow === "From Job";
    const source = safeString(headerForm.fromLocation).toLowerCase();

    return materials
      .filter((item) => {
        if (!isPickupFlow || !source) return true;

        return (
          safeString(item.job).toLowerCase() === source ||
          safeString(item.location).toLowerCase() === source
        );
      })
      .map((item) => ({
        value: String(item.id),
        label:
          [
            safeString(item.item),
            safeString(item.poNumber),
            safeString(item.location),
            safeString(item.vendor),
          ]
            .filter(Boolean)
            .join(" • ") || `Material ${item.id}`,
        description: makeMaterialDescription(item),
        category: safeString(item.category) || "Material",
        inventoryItemId: item.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [materials, headerForm.requestFlow, headerForm.fromLocation]);

  const prefabItemOptions = useMemo<ItemOption[]>(() => {
    const isPickupFlow = headerForm.requestFlow === "From Job";
    const source = safeString(headerForm.fromLocation).toLowerCase();

    return prefab
      .filter((item) => {
        if (!isPickupFlow || !source) return true;
        return safeString(item.job).toLowerCase() === source;
      })
      .map((item) => ({
        value: String(item.id),
        label:
          [
            safeString(item.assembly),
            safeString(item.job),
            safeString(item.area),
            safeString(item.type),
          ]
            .filter(Boolean)
            .join(" • ") || `Prefab ${item.id}`,
        description: makePrefabDescription(item),
        category: safeString(item.type) || "Prefab",
        inventoryItemId: item.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [prefab, headerForm.requestFlow, headerForm.fromLocation]);

  function getItemOptions(type: RequestType): ItemOption[] {
    switch (type) {
      case "Tool":
        return toolItemOptions;
      case "Equipment":
        return equipmentItemOptions;
      case "Material":
        return materialItemOptions;
      case "Prefab":
        return prefabItemOptions;
      default:
        return [];
    }
  }

  const categoryOptions = useMemo(() => {
    if (lineForm.type === "Equipment") {
      return uniqueSorted(
        equipmentInventory.map((item) => resolveEquipmentCategory(item))
      );
    }

    if (lineForm.type === "Tool") {
      return uniqueSorted(
        toolInventory.map((item) => safeString(item.category) || "Tool")
      );
    }

    if (lineForm.type === "Material") {
      return uniqueSorted(
        materials.map((item) => safeString(item.category) || "Material")
      );
    }

    if (lineForm.type === "Prefab") {
      return uniqueSorted(
        prefab.map((item) => safeString(item.type) || "Prefab")
      );
    }

    return [];
  }, [lineForm.type, equipmentInventory, toolInventory, materials, prefab]);

  const filteredItemOptions = useMemo(() => {
    const options = getItemOptions(lineForm.type);
    if (!lineForm.category) return [];

    return options.filter((item) => item.category === lineForm.category);
  }, [
    lineForm.type,
    lineForm.category,
    toolItemOptions,
    equipmentItemOptions,
    materialItemOptions,
    prefabItemOptions,
  ]);

  function getSelectedItem(
    type: RequestType,
    category: string,
    selectedValue: string
  ) {
    return getItemOptions(type).find(
      (item) => item.category === category && item.value === selectedValue
    );
  }

  const openRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status !== "Complete" && request.status !== "Rejected"
      ),
    [requests]
  );

  const requestHistory = useMemo(() => {
    return [...requests]
      .filter(
        (request) =>
          request.status === "Complete" || request.status === "Rejected"
      )
      .sort((a, b) => {
        const aDate = new Date(requestDateSafe(a.requestDate)).getTime();
        const bDate = new Date(requestDateSafe(b.requestDate)).getTime();
        return bDate - aDate;
      });
  }, [requests]);

  const pickupRequests = useMemo(
    () => openRequests.filter((request) => request.requestFlow === "From Job"),
    [openRequests]
  );

  const standardRequests = useMemo(
    () => openRequests.filter((request) => request.requestFlow !== "From Job"),
    [openRequests]
  );

  const openCount = openRequests.length;
  const approvedCount = requests.filter(
    (request) => request.status === "Approved"
  ).length;
  const inProgressCount = requests.filter(
    (request) => request.status === "In Progress"
  ).length;
  const completeCount = requests.filter(
    (request) => request.status === "Complete"
  ).length;

  function saveAll(args: {
    nextRequests?: JobRequest[];
    nextNotifications?: AppNotification[];
    nextTickets?: ShopTicket[];
  }) {
    const nextRequests = args.nextRequests ?? requests;
    const nextNotifications = args.nextNotifications ?? notifications;
    const nextTickets = args.nextTickets ?? tickets;

    setRequests(nextRequests);
    setNotifications(nextNotifications);
    setTickets(nextTickets);

    const current = loadStoredAppData();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...current,
        requests: nextRequests,
        notifications: nextNotifications,
        tickets: nextTickets,
      })
    );
  }

  function createNotification(newRequest: JobRequest, nextRequests: JobRequest[]) {
    const destinationText =
      newRequest.destinationType === "Job"
        ? safeString(newRequest.jobNumber)
        : newRequest.destinationType === "Person"
        ? safeString(newRequest.requestedForPerson)
        : "general request";

    const itemSummary = (newRequest.lines || [])
      .map((line) => line.itemName)
      .filter(Boolean)
      .join(", ");

    const newNotification: AppNotification = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      jobNumber: newRequest.jobNumber,
      requestId: newRequest.id,
      type: "Request Submitted",
      title:
        newRequest.requestFlow === "From Job"
          ? "Pickup request submitted"
          : "Request submitted",
      message: `${itemSummary || "Items"} requested for ${
        destinationText || "general request"
      }.`,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    const nextNotifications = [newNotification, ...notifications];
    saveAll({ nextRequests, nextNotifications });
  }

  function addLineItem() {
    if (!safeString(lineForm.itemName)) {
      alert("Select an item.");
      return;
    }

    const newLine: JobRequestLine = {
      id: Date.now(),
      type: lineForm.type,
      category: safeString(lineForm.category),
      itemName: safeString(lineForm.itemName),
      description: safeString(lineForm.description),
      quantity: Number(lineForm.quantity) || 1,
      unit: safeString(lineForm.unit) || "ea",
      inventoryItemId: lineForm.inventoryItemId,
      inventorySnapshot: "",
    };

    setRequestLines((prev) => [...prev, newLine]);
    setLineForm({
      ...emptyLineForm(),
      type: lineForm.type,
    });
  }

  function removeLineItem(id: number) {
    setRequestLines((prev) => prev.filter((line) => line.id !== id));
  }

  function handleCreateRequest() {
    if (!requestLines.length) {
      alert("Add at least one line item.");
      return;
    }

    if (!safeString(headerForm.requestedBy)) {
      alert("Select Requested By.");
      return;
    }

    if (
      headerForm.requestFlow === "From Job" &&
      !safeString(headerForm.fromLocation)
    ) {
      alert("Select From Location.");
      return;
    }

    if (
      headerForm.requestFlow === "From Job" &&
      !safeString(headerForm.toLocation)
    ) {
      alert("Select To Location.");
      return;
    }

    if (
      headerForm.requestFlow !== "From Job" &&
      headerForm.destinationType === "Job" &&
      !safeString(headerForm.jobNumber)
    ) {
      alert("Select a job.");
      return;
    }

    if (
      headerForm.requestFlow !== "From Job" &&
      headerForm.destinationType === "Person" &&
      !safeString(headerForm.requestedForPerson)
    ) {
      alert("Select Requested For.");
      return;
    }

    const resolvedToLocation =
      headerForm.requestFlow === "From Job"
        ? safeString(headerForm.toLocation)
        : headerForm.destinationType === "Job"
        ? safeString(headerForm.jobNumber)
        : headerForm.destinationType === "Person"
        ? safeString(headerForm.requestedForPerson)
        : "";

    const newRequest: JobRequest = {
      id: Date.now(),
      destinationType:
        headerForm.requestFlow === "From Job"
          ? "Job"
          : headerForm.destinationType,
      requestFlow: headerForm.requestFlow,
      jobNumber:
        headerForm.requestFlow === "From Job"
          ? safeString(headerForm.fromLocation)
          : headerForm.destinationType === "Job"
          ? safeString(headerForm.jobNumber)
          : "",
      requestedForPerson:
        headerForm.requestFlow === "From Job"
          ? ""
          : headerForm.destinationType === "Person"
          ? safeString(headerForm.requestedForPerson)
          : "",
      requestedBy: safeString(headerForm.requestedBy),
      requestDate: new Date().toISOString().slice(0, 10),
      neededBy: headerForm.neededBy,
      status: "Open",
      notes: safeString(headerForm.notes),
      fromLocation:
        headerForm.requestFlow === "From Job"
          ? safeString(headerForm.fromLocation)
          : "Shop",
      toLocation: resolvedToLocation,
      lines: requestLines,
      workflowStatus: "Request Submitted",
      pickTicketId: null,
      pickTicketNumber: "",
      transferTicketId: null,
      transferTicketNumber: "",
      deliveredToSiteAt: "",
      assignedToJobAt: "",
    };

    const nextRequests = [newRequest, ...requests];
    createNotification(newRequest, nextRequests);

    setHeaderForm(emptyHeaderForm());
    setLineForm(emptyLineForm());
    setRequestLines([]);
  }

  function updateRequestStatus(id: number, status: RequestStatus) {
    const current = loadStoredAppData();
    const currentRequests = current.requests || [];
    const currentTickets = current.tickets || [];
    const request = currentRequests.find((r) => r.id === id);

    if (!request) return;

    if (status === "In Progress") {
      if (request.requestFlow === "From Job") {
        if (request.transferTicketId || request.transferTicketNumber) {
          const nextRequests = currentRequests.map((item) =>
            item.id === id ? { ...item, status: "In Progress" as const } : item
          );

          saveAll({
            nextRequests,
            nextNotifications: notifications,
            nextTickets: currentTickets,
          });
          return;
        }

        const transferTicketNumber = makeTicketNumber("Transfer", currentTickets);

        const newTransferTicket: ShopTicket = {
          id: Date.now(),
          ticketNumber: transferTicketNumber,
          type: "Transfer",
          jobNumber: request.jobNumber,
          requestedBy: request.requestedBy,
          assignedTo: safeString(request.requestedForPerson),
          requestDate: new Date().toISOString(),
          neededBy: request.neededBy,
          status: "Open",
          notes: request.notes,
          sourceRequestId: request.id,
          lines: (request.lines || []).map((line, index) => ({
            id: Date.now() + index + 1,
            itemType: line.type,
            itemId: line.inventoryItemId ?? null,
            itemName: line.itemName,
            qty: Number(line.quantity) || 1,
            unit: line.unit || "ea",
            fromLocation: request.fromLocation || request.jobNumber || "",
            toLocation: request.toLocation || "Shop",
            notes: line.description || request.notes || "",
          })),
        };

        const nextTickets = [newTransferTicket, ...currentTickets];

        const nextRequests = currentRequests.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "In Progress" as const,
                workflowStatus: "Transfer Ticket Created" as const,
                transferTicketId: newTransferTicket.id,
                transferTicketNumber: newTransferTicket.ticketNumber,
              }
            : item
        );

        saveAll({
          nextRequests,
          nextNotifications: notifications,
          nextTickets,
        });
        return;
      }

      if (request.pickTicketId || request.pickTicketNumber) {
        const nextRequests = currentRequests.map((item) =>
          item.id === id ? { ...item, status: "In Progress" as const } : item
        );

        saveAll({
          nextRequests,
          nextNotifications: notifications,
          nextTickets: currentTickets,
        });
        return;
      }

      const pickTicketNumber = makeTicketNumber("Pick", currentTickets);

      const destination =
        request.destinationType === "Job"
          ? safeString(request.jobNumber)
          : request.destinationType === "Person"
          ? safeString(request.requestedForPerson)
          : "";

      const newPickTicket: ShopTicket = {
        id: Date.now(),
        ticketNumber: pickTicketNumber,
        type: "Pick",
        jobNumber: request.jobNumber,
        requestedBy: request.requestedBy,
        assignedTo: safeString(request.requestedForPerson),
        requestDate: new Date().toISOString(),
        neededBy: request.neededBy,
        status: "Open",
        notes: request.notes,
        sourceRequestId: request.id,
        lines: (request.lines || []).map((line, index) => ({
          id: Date.now() + index + 1,
          itemType: line.type,
          itemId: line.inventoryItemId ?? null,
          itemName: line.itemName,
          qty: Number(line.quantity) || 1,
          unit: line.unit || "ea",
          fromLocation: "Shop",
          toLocation: destination,
          notes: line.description || request.notes || "",
        })),
      };

      const nextTickets = [newPickTicket, ...currentTickets];

      const nextRequests = currentRequests.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "In Progress" as const,
              workflowStatus: "Pick Ticket Created" as const,
              pickTicketId: newPickTicket.id,
              pickTicketNumber: newPickTicket.ticketNumber,
            }
          : item
      );

      saveAll({
        nextRequests,
        nextNotifications: notifications,
        nextTickets,
      });
      return;
    }

    const nextRequests = currentRequests.map((item) => {
      if (item.id !== id) return item;

      let workflowStatus = item.workflowStatus;

      if (status === "Approved") workflowStatus = "Request Approved";
      if (status === "Complete") {
        workflowStatus =
          item.requestFlow === "From Job"
            ? "Transfer Ticket Complete"
            : "Assigned to Job";
      }

      return {
        ...item,
        status,
        workflowStatus,
      };
    });

    if (status === "Complete") {
      let nextToolInventory = [...toolInventory];
      let nextEquipmentInventory = [...equipmentInventory];
      let nextMaterials = [...materials];

      for (const line of request.lines || []) {
        if (typeof line.inventoryItemId !== "number") continue;

        if (line.type === "Tool") {
          nextToolInventory = nextToolInventory.map((tool) =>
            tool.id === line.inventoryItemId
              ? applyToolRequestCompletion(tool, request, employees)
              : tool
          );
        }

        if (line.type === "Equipment") {
          nextEquipmentInventory = nextEquipmentInventory.map((equipment) =>
            equipment.id === line.inventoryItemId
              ? applyEquipmentRequestCompletion(equipment, request, employees)
              : equipment
          );
        }

        if (line.type === "Material") {
          nextMaterials = nextMaterials.map((material) =>
            material.id === line.inventoryItemId
              ? applyMaterialRequestCompletion(material, request, employees)
              : material
          );
        }
      }

      saveToolInventory(nextToolInventory);
      saveEquipmentInventory(nextEquipmentInventory);
      saveMaterialInventory(nextMaterials);

      setToolInventory(nextToolInventory);
      setEquipmentInventory(nextEquipmentInventory);
      setMaterials(nextMaterials);
    }

    saveAll({
      nextRequests,
      nextNotifications: notifications,
      nextTickets: currentTickets,
    });
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
                Create shop issue requests or pickup and return requests.
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
            <StatCard title="Open Requests" value={String(openCount)} />
            <StatCard title="Approved" value={String(approvedCount)} />
            <StatCard title="In Progress" value={String(inProgressCount)} />
            <StatCard title="Complete" value={String(completeCount)} />
          </div>

          <Section title="Request Header" collapsible defaultOpen>
            <div style={{ display: "grid", gap: 20 }}>
              <div style={formGridStyle}>
                <Field label="Request Flow">
                  <select
                    value={headerForm.requestFlow}
                    onChange={(e) =>
                      setHeaderForm((prev) => ({
                        ...prev,
                        requestFlow: e.target.value as "To Job" | "From Job",
                        fromLocation:
                          e.target.value === "From Job" ? prev.fromLocation : "Shop",
                        toLocation: "",
                        destinationType:
                          e.target.value === "From Job" ? "Job" : prev.destinationType,
                        jobNumber: "",
                        requestedForPerson: "",
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="To Job">To Job</option>
                    <option value="From Job">From Job / Pickup</option>
                  </select>
                </Field>

                <Field label="Destination Type">
                  <select
                    value={headerForm.destinationType}
                    onChange={(e) =>
                      setHeaderForm((prev) => ({
                        ...prev,
                        destinationType: e.target.value as RequestDestinationType,
                        jobNumber: "",
                        requestedForPerson: "",
                        toLocation: "",
                      }))
                    }
                    style={inputStyle}
                    disabled={headerForm.requestFlow === "From Job"}
                  >
                    <option value="Job">Job</option>
                    <option value="Person">Person</option>
                    <option value="General">General</option>
                  </select>
                </Field>

                {headerForm.requestFlow === "From Job" ? (
                  <>
                    <Field label="From Location">
                      <select
                        value={headerForm.fromLocation}
                        onChange={(e) =>
                          setHeaderForm((prev) => ({
                            ...prev,
                            fromLocation: e.target.value,
                          }))
                        }
                        style={inputStyle}
                      >
                        <option value="">Select source</option>
                        {locationOptions.map((location) => (
                          <option key={`from-${location}`} value={location}>
                            {location}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="To Location">
                      <select
                        value={headerForm.toLocation}
                        onChange={(e) =>
                          setHeaderForm((prev) => ({
                            ...prev,
                            toLocation: e.target.value,
                          }))
                        }
                        style={inputStyle}
                      >
                        <option value="">Select destination</option>
                        {locationOptions.map((location) => (
                          <option key={`to-${location}`} value={location}>
                            {location}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </>
                ) : headerForm.destinationType === "Job" ? (
                  <Field label="Job#">
                    <select
                      value={headerForm.jobNumber}
                      onChange={(e) =>
                        setHeaderForm((prev) => ({
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
                ) : headerForm.destinationType === "Person" ? (
                  <Field label="Requested For">
                    <select
                      value={headerForm.requestedForPerson}
                      onChange={(e) =>
                        setHeaderForm((prev) => ({
                          ...prev,
                          requestedForPerson: e.target.value,
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
                ) : (
                  <Field label="General Request">
                    <input
                      value="No job / no person"
                      readOnly
                      style={{ ...inputStyle, background: "#1f1f1f", color: "#d1d5db" }}
                    />
                  </Field>
                )}

                <Field label="Requested By">
                  <select
                    value={headerForm.requestedBy}
                    onChange={(e) =>
                      setHeaderForm((prev) => ({
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

                <Field label="Needed By">
                  <input
                    type="date"
                    value={headerForm.neededBy}
                    onChange={(e) =>
                      setHeaderForm((prev) => ({
                        ...prev,
                        neededBy: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </Field>

                <Field label="Notes">
                  <input
                    value={headerForm.notes}
                    onChange={(e) =>
                      setHeaderForm((prev) => ({
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

          <Section title="Add Request Line" collapsible defaultOpen>
            <div style={{ display: "grid", gap: 20 }}>
              <div style={formGridStyle}>
                <Field label="Request Type">
                  <select
                    value={lineForm.type}
                    onChange={(e) =>
                      setLineForm({
                        ...emptyLineForm(),
                        type: e.target.value as RequestType,
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="Tool">Tool</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Material">Material</option>
                    <option value="Prefab">Prefab</option>
                  </select>
                </Field>

                <Field label="Category">
                  <select
                    value={lineForm.category}
                    onChange={(e) =>
                      setLineForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                        itemName: "",
                        description: "",
                        inventoryItemId: null,
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
                </Field>

                <Field label="Item Name">
                  <select
                    value={
                      lineForm.inventoryItemId !== null
                        ? String(lineForm.inventoryItemId)
                        : ""
                    }
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      const selected = getSelectedItem(
                        lineForm.type,
                        lineForm.category,
                        selectedValue
                      );

                      setLineForm((prev) => ({
                        ...prev,
                        itemName: selected?.label || "",
                        description: selected?.description || "",
                        inventoryItemId: selected?.inventoryItemId ?? null,
                      }));
                    }}
                    style={inputStyle}
                  >
                    <option value="">Select item</option>
                    {filteredItemOptions.map((item) => (
                      <option
                        key={`${lineForm.type}-${lineForm.category}-${item.value}`}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>
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
                    value={String(lineForm.quantity)}
                    onChange={(e) =>
                      setLineForm((prev) => ({
                        ...prev,
                        quantity: Number(e.target.value) || 0,
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

              <div>
                <button type="button" onClick={addLineItem} style={actionButtonStyle}>
                  Add Line Item
                </button>
              </div>
            </div>
          </Section>

          <Section title="Request Lines" collapsible defaultOpen>
            {requestLines.length === 0 ? (
              <div style={{ color: "#a3a3a3" }}>No line items added yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {requestLines.map((line) => (
                  <div key={line.id} style={cardStyle}>
                    <div style={cardHeaderStyle}>
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
                        <div style={{ fontSize: 14, color: "#d1d5db" }}>
                          {line.type} • {line.category}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeLineItem(line.id)}
                        style={{ ...smallActionButtonStyle, background: "#7f1d1d", border: "1px solid #991b1b" }}
                      >
                        Remove
                      </button>
                    </div>

                    <div style={detailsGridStyle}>
                      <Detail label="Qty" value={`${line.quantity} ${line.unit}`} />
                      <Detail
                        label="Inventory ID"
                        value={String(line.inventoryItemId ?? "-")}
                      />
                    </div>

                    {!!line.description && (
                      <div style={noteBoxStyle}>
                        <strong>Description:</strong> {line.description}
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
              onClick={handleCreateRequest}
              style={actionButtonStyle}
            >
              Submit Request
            </button>
          </div>

          <Section title="Open Standard Requests" collapsible defaultOpen>
            <RequestsTable
              rows={standardRequests}
              onUpdateStatus={updateRequestStatus}
            />
          </Section>

          <Section title="Open Pickup / Return Requests" collapsible defaultOpen>
            <RequestsTable
              rows={pickupRequests}
              onUpdateStatus={updateRequestStatus}
            />
          </Section>

          <Section title="Request History" collapsible defaultOpen={false}>
            <RequestsTable
              rows={requestHistory}
              onUpdateStatus={updateRequestStatus}
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailCardStyle}>
      <div style={{ fontSize: 12, color: "#a3a3a3", marginBottom: 4 }}>
        {label}
      </div>
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
  gap: 14,
  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
};

const detailCardStyle: React.CSSProperties = {
  background: "#141414",
  border: "1px solid #2f2f2f",
  borderRadius: 10,
  padding: 10,
};

const noteBoxStyle: React.CSSProperties = {
  background: "#141414",
  border: "1px solid #2f2f2f",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  color: "#d1d5db",
};