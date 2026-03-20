"use client";

import { useEffect, useMemo, useState } from "react";

import AppSidebar from "@/components/AppSidebar";
import Section from "@/components/Section";
import StatCard from "@/components/StatCard";
import MaterialForm from "@/components/MaterialForm";
import InventoryLogTable from "@/components/InventoryLogTable";
import RequestsBoardTable from "@/components/RequestsBoardTable";
import NotificationsTable from "@/components/NotificationsTable";

import type {
  AppData,
  AppNotification,
  InventoryLog,
  JobRequest,
  Material,
  MaterialStatus,
  PrefabItem,
  PurchaseOrder,
  RequestStatus,
  ShopTicket,
  TicketItemType,
} from "@/types";

const STORAGE_KEY = "prefab-tracker-v7";

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
    };
  } catch {
    return defaultData;
  }
}

function makeTicketNumber(type: "Pick" | "Transfer", existing: ShopTicket[]) {
  const prefix = type === "Pick" ? "PT" : "TT";
  const count = existing.filter((t) => t.type === type).length + 1;
  return `${prefix}-${String(count).padStart(4, "0")}`;
}

function ticketDateValue(ticket: ShopTicket) {
  return ticket.requestDate;
}

export default function Home() {
  const [hasHydrated, setHasHydrated] = useState(false);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [prefab, setPrefab] = useState<PrefabItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [tickets, setTickets] = useState<ShopTicket[]>([]);
  const [jobOptions, setJobOptions] = useState<string[]>([]);

  const [materialForm, setMaterialForm] = useState({
    job: "",
    item: "",
    category: "",
    orderedQty: "",
    receivedQty: "",
    allocatedQty: "",
    unit: "ea",
    vendor: "",
    status: "Ordered" as MaterialStatus,
    location: "",
    poNumber: "",
  });

  useEffect(() => {
    const parsed = loadStoredAppData();
    setMaterials(parsed.materials);
    setPrefab(parsed.prefab);
    setPurchaseOrders(parsed.purchaseOrders);
    setInventoryLogs(parsed.inventoryLogs);
    setRequests(parsed.requests);
    setNotifications(parsed.notifications);
    setTickets(parsed.tickets ?? []);
    setJobOptions((parsed.jobs ?? []).map((job) => job.jobNumber).sort());
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    async function loadJobs() {
      try {
        const response = await fetch("/api/jobs", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load jobs");
        const dbJobs = await response.json();
        if (Array.isArray(dbJobs)) {
          setJobOptions(dbJobs.map((job) => job.jobNumber).sort());
        }
      } catch (error) {
        console.error("Loading jobs failed:", error);
      }
    }

    async function loadMaterials() {
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
    loadMaterials();
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    const current = loadStoredAppData();

    const dataToSave: AppData = {
      ...current,
      materials,
      prefab,
      purchaseOrders,
      inventoryLogs,
      requests,
      notifications,
      tickets,
      jobs: current.jobs ?? [],
      assemblies: current.assemblies ?? [],
      assemblyBom: current.assemblyBom ?? [],
      regularInventory: current.regularInventory ?? [],
      materialMovements: current.materialMovements ?? [],
      toolInventory: current.toolInventory ?? [],
      equipmentInventory: current.equipmentInventory ?? [],
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [
    hasHydrated,
    materials,
    prefab,
    purchaseOrders,
    inventoryLogs,
    requests,
    notifications,
    tickets,
  ]);

  const activeRequests = useMemo(() => {
    return [...requests]
      .filter((item) => item.status !== "Complete" && item.status !== "Rejected")
      .sort((a, b) => {
        const aDate = new Date(a.requestDate || 0).getTime();
        const bDate = new Date(b.requestDate || 0).getTime();
        return bDate - aDate;
      });
  }, [requests]);

  const requestHistory = useMemo(() => {
    return [...requests]
      .filter((item) => item.status === "Complete" || item.status === "Rejected")
      .sort((a, b) => {
        const aDate = new Date(a.requestDate || 0).getTime();
        const bDate = new Date(b.requestDate || 0).getTime();
        return bDate - aDate;
      });
  }, [requests]);

  const filteredNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return bDate - aDate;
    });
  }, [notifications]);

  const openPickTickets = useMemo(() => {
    return tickets.filter(
      (ticket) =>
        ticket.type === "Pick" &&
        ticket.status !== "Complete" &&
        ticket.status !== "Cancelled"
    );
  }, [tickets]);

  const openTransferTickets = useMemo(() => {
    return tickets.filter(
      (ticket) =>
        ticket.type === "Transfer" &&
        ticket.status !== "Complete" &&
        ticket.status !== "Cancelled"
    );
  }, [tickets]);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  function addNotification(
    jobNumber: string,
    requestId: number | null,
    type: AppNotification["type"],
    title: string,
    message: string
  ) {
    const newNotification: AppNotification = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      jobNumber,
      requestId,
      type,
      title,
      message,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    setNotifications((prev) => [newNotification, ...prev]);
  }

  function updateRequestStatus(id: number, status: RequestStatus) {
    const request = requests.find((r) => r.id === id);
    if (!request) return;

    setRequests((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              workflowStatus:
                status === "Approved"
                  ? "Request Approved"
                  : status === "Complete"
                  ? item.workflowStatus || "Assigned to Job"
                  : item.workflowStatus,
            }
          : item
      )
    );

    const titleMap: Record<RequestStatus, string> = {
      Open: "Request opened",
      Approved: "Request approved",
      Ordered: "Request ordered",
      "In Progress": "Request in progress",
      Complete: "Request complete",
      Rejected: "Request rejected",
    };

    const notificationTypeMap: Record<
      Exclude<RequestStatus, "Open">,
      AppNotification["type"]
    > = {
      Approved: "Request Approved",
      Ordered: "Request Ordered",
      "In Progress": "Request In Progress",
      Complete: "Request Complete",
      Rejected: "Request Rejected",
    };

    if (status !== "Open") {
      addNotification(
        request.jobNumber,
        request.id,
        notificationTypeMap[status],
        titleMap[status],
        `${request.lines?.[0]?.type || "Request"} request for ${
  request.lines?.map((line) => line.itemName).filter(Boolean).join(", ") || "item"
} on ${request.jobNumber} marked ${status}.`
      );
    }
  }

  function handleStartRequest(requestId: number) {
    const latest = loadStoredAppData();
    const request = (latest.requests || []).find((r) => r.id === requestId);
    if (!request) return;

    const existingTickets = latest.tickets || [];

    if (request.pickTicketId || request.pickTicketNumber) {
      window.location.href = "/pick-tickets";
      return;
    }

    const ticketNumber = makeTicketNumber("Pick", existingTickets);

    const itemType: TicketItemType =
  request.lines?.[0]?.type === "Tool"
    ? "Tool"
    : request.lines?.[0]?.type === "Material"
    ? "Material"
    : request.lines?.[0]?.type === "Prefab"
    ? "Prefab"
    : "Equipment";

    const newTicket: ShopTicket = {
      id: Date.now(),
      ticketNumber,
      type: "Pick",
      jobNumber: request.jobNumber,
      requestedBy: request.requestedBy || "",
      assignedTo: "",
      requestDate: new Date().toISOString(),
      neededBy: request.neededBy || "",
      status: "Open",
      notes: request.notes || "",
      sourceRequestId: request.id,
      lines: [
  {
    id: Date.now() + 1,
    itemType,
    itemId: request.lines?.[0]?.inventoryItemId ?? null,
    itemName: request.lines?.[0]?.itemName || "",
    qty: Number(request.lines?.[0]?.quantity) || 1,
    unit: request.lines?.[0]?.unit || "ea",
    fromLocation: "",
    toLocation: request.jobNumber,
    notes: request.lines?.[0]?.description || "",
  },
],
    };

    const nextRequests = (latest.requests || []).map((item) =>
      item.id === request.id
        ? {
            ...item,
            status: "In Progress" as const,
            workflowStatus: "Pick Ticket Created" as const,
            pickTicketId: newTicket.id,
            pickTicketNumber: newTicket.ticketNumber,
          }
        : item
    );

    const nextTickets = [newTicket, ...existingTickets];

    setRequests(nextRequests);
    setTickets(nextTickets);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...latest,
        requests: nextRequests,
        tickets: nextTickets,
        notifications,
      })
    );

   addNotification(
  request.jobNumber,
  request.id,
  "Request In Progress",
  "Pick ticket created",
  `${newTicket.ticketNumber} created for ${request.lines?.[0]?.itemName || "item"}.`
);

    window.location.href = "/pick-tickets";
  }

  function markNotificationRead(id: number) {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
  }

  function markNotificationUnread(id: number) {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: false } : item))
    );
  }

  async function addOrUpdateMaterial() {
    if (!materialForm.job.trim() || !materialForm.item.trim()) return;

    const payload = {
      job: materialForm.job.trim(),
      item: materialForm.item.trim(),
      category: materialForm.category.trim(),
      orderedQty: Number(materialForm.orderedQty) || 0,
      receivedQty: Number(materialForm.receivedQty) || 0,
      allocatedQty: Number(materialForm.allocatedQty) || 0,
      unit: materialForm.unit.trim() || "ea",
      vendor: materialForm.vendor.trim(),
      status: materialForm.status,
      location: materialForm.location.trim(),
      poNumber: materialForm.poNumber.trim(),
    };

    try {
      const response = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to create material");
      const newMaterial = await response.json();

      setMaterials((prev) => [newMaterial, ...prev]);

      setMaterialForm({
        job: "",
        item: "",
        category: "",
        orderedQty: "",
        receivedQty: "",
        allocatedQty: "",
        unit: "ea",
        vendor: "",
        status: "Ordered",
        location: "",
        poNumber: "",
      });
    } catch (error) {
      console.error("Saving material failed:", error);
      alert("Failed to save material.");
    }
  }

  function exportData() {
    const stored = loadStoredAppData();

    const data: AppData = {
      ...stored,
      materials,
      prefab,
      purchaseOrders,
      inventoryLogs,
      requests,
      notifications,
      tickets,
      jobs: stored.jobs ?? [],
      assemblies: stored.assemblies ?? [],
      assemblyBom: stored.assemblyBom ?? [],
      regularInventory: stored.regularInventory ?? [],
      materialMovements: stored.materialMovements ?? [],
      toolInventory: stored.toolInventory ?? [],
      equipmentInventory: stored.equipmentInventory ?? [],
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prefab-tracker-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={pageStyle}>
      <div style={layoutStyle}>
        <AppSidebar active="dashboard" />

        <div style={mainStyle}>
         <div style={topBarStyle}>
  <div>
    <h1 style={{ fontSize: 30, margin: 0 }}>SiteOps</h1>
    <p style={{ color: "#d1d5db", margin: "6px 0 0 0" }}>
      Construction Operations & Tracking
    </p>
  </div>

  <button onClick={exportData} style={actionButtonStyle}>
    Export Data
  </button>
</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <StatCard title="Open Requests" value={String(activeRequests.length)} />
            <StatCard title="Unread Notifications" value={String(unreadNotificationCount)} />
            <StatCard title="Open Pick Tickets" value={String(openPickTickets.length)} />
            <StatCard
              title="Open Transfer Tickets"
              value={String(openTransferTickets.length)}
            />
          </div>

          <Section title="Notifications" collapsible defaultOpen>
            <NotificationsTable
              rows={filteredNotifications}
              onMarkRead={markNotificationRead}
              onMarkUnread={markNotificationUnread}
            />
          </Section>

          <Section title="Open Requests" collapsible defaultOpen>
            <RequestsBoardTable
              rows={activeRequests}
              onUpdateStatus={updateRequestStatus}
              onStartRequest={handleStartRequest}
            />
          </Section>

          <Section title="Quick Add Material" collapsible defaultOpen>
            <MaterialForm
              materials={materials}
              materialForm={materialForm}
              setMaterialForm={setMaterialForm}
              jobOptions={jobOptions}
              editingMaterialId={null}
              onSave={addOrUpdateMaterial}
              onCancel={() =>
                setMaterialForm({
                  job: "",
                  item: "",
                  category: "",
                  orderedQty: "",
                  receivedQty: "",
                  allocatedQty: "",
                  unit: "ea",
                  vendor: "",
                  status: "Ordered",
                  location: "",
                  poNumber: "",
                })
              }
            />
          </Section>

          <Section title="Inventory History" collapsible defaultOpen={false}>
            <InventoryLogTable rows={inventoryLogs} />
          </Section>

          <Section title="Request History" collapsible defaultOpen={false}>
            <RequestsBoardTable
              rows={requestHistory}
              onUpdateStatus={updateRequestStatus}
              onStartRequest={handleStartRequest}
            />
          </Section>
        </div>
      </div>
    </main>
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
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
};