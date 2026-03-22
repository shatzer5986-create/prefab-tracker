export type POStatus = "Open" | "Ordered" | "Partial" | "Delivered" | "Cancelled";

export type JobStatus = "Active" | "On Hold" | "Complete";

export type MaterialStatus = "Ordered" | "Partial" | "Received";

export type PrefabStatus = "Not Started" | "In Progress" | "Complete";

export type PrefabType = "Assembly" | "Spool" | "Rack" | "Device" | "Other";

export type RequestType = "Tool" | "Equipment" | "Material" | "Prefab";

export type RequestStatus =
  | "Open"
  | "Approved"
  | "Ordered"
  | "In Progress"
  | "Complete"
  | "Rejected";

export type RequestWorkflowStatus =
  | "Request Submitted"
  | "Request Approved"
  | "Pick Ticket Created"
  | "Pick Ticket Complete"
  | "Transfer Ticket Created"
  | "Delivered to Site"
  | "Transfer Ticket Complete"
  | "Assigned to Job";

export type RequestDestinationType = "Job" | "Person" | "General";

export type RequestFlow = "To Job" | "From Job";

export type TicketType = "Pick" | "Transfer";

export type TicketStatus =
  | "Open"
  | "Approved"
  | "In Progress"
  | "Ready"
  | "Complete"
  | "Cancelled";

export type TicketItemType =
  | "Tool"
  | "Trailer"
  | "Vehicle"
  | "Equipment"
  | "Material"
  | "Prefab";

export type ToolAssignmentType =
  | "Job"
  | "Person"
  | "Tool Room"
  | "Shop"
  | "Yard"
  | "WH1"
  | "WH2";

export type EquipmentAssignmentType =
  | "Job"
  | "Person"
  | "Tool Room"
  | "Shop"
  | "Yard"
  | "WH1"
  | "WH2";

export type NotificationType =
  | "Request Submitted"
  | "Request Approved"
  | "Request Ordered"
  | "Request In Progress"
  | "Request Complete"
  | "Request Rejected";

export type MaterialMovementType =
  | "Receive"
  | "Issue"
  | "Transfer"
  | "Return"
  | "Adjust"
  | "Delivered to Site";

export type Job = {
  id: number;
  jobNumber: string;
  name: string;
  customer: string;
  status: JobStatus;
};

export type Material = {
  id: number;
  job: string;
  item: string;
  category: string;
  orderedQty: number;
  receivedQty: number;
  stockQty: number;
  allocatedQty: number;
  unit: string;
  vendor: string;
  status: MaterialStatus;
  location: string;
  poNumber: string;
};

export type PrefabItem = {
  id: number;
  job: string;
  assembly: string;
  type: PrefabType | string;
  area: string;
  qtyPlanned: number;
  qtyBuilt: number;
  assignedTo: string;
  materialReady: boolean;
  status: PrefabStatus | string;
};

export type PurchaseOrder = {
  id: number;
  job: string;
  poNumber: string;
  vendor: string;
  amount: number;
  status: POStatus;
  orderDate: string;
  expectedDate: string;
  receivedDate: string;
  notes: string;
};

export type Assembly = {
  id: number;
  job: string;
  name: string;
  type: PrefabType;
  description: string;
};

export type AssemblyBomItem = {
  id: number;
  assemblyId: number;
  item: string;
  qtyPerAssembly: number;
  unit: string;
};

export type RegularInventoryItem = {
  id: number;
  job: string;
  materialName: string;
  item: string;
  category: string;
  qty: number;
  qtyOnHand: number;
  unit: string;
  location: string;
  vendor: string;
  poNumber: string;
  status: string;
  dateReceived: string;
  notes: string;
};

export type MaterialMovement = {
  id: number;
  materialId: number | null;
  materialName: string;
  movementType: MaterialMovementType;
  qty: number;
  unit: string;
  job: string;
  source: string;
  fromLocation: string;
  toLocation: string;
  reference: string;
  notes: string;
  date: string;
  handledBy: string;
};

export type MaterialMovementItem = MaterialMovement;

export type ToolItem = {
  id: number;
  category: string;
  barcode: string;
  itemNumber: string;
  manufacturer: string;
  model: string;
  description: string;
  quantityAvailable: number;
  jobNumber: string;
  assignmentType: ToolAssignmentType;
  assignedTo: string;
  toolRoomLocation: string;
  serialNumber: string;
  transferDateIn: string;
  transferDateOut: string;
  status: "Working" | "Damaged";
};

export type EquipmentItem = {
  id: number;
  assetType: "Trailer" | "Vehicle" | "Equipment";
  quantityAvailable: number;
  assetNumber: string;
  jobNumber: string;
  assignedTo: string;
  assignmentType: EquipmentAssignmentType;
  toolRoomLocation: string;
  year: string;
  manufacturer: string;
  model: string;
  modelNumber: string;
  description: string;
  category: string;
  itemNumber: string;
  barcode: string;
  serialNumber: string;
  licensePlate: string;
  vinSerial: string;
  engineSerialNumber: string;
  ein: string;
  gvwr: string;
  driverProject: string;
  indexNumber: string;
  purchaseCost: string;
  purchaseDate: string;
  tier: string;
  lowUse: string;
  samsara: string;
  powered: string;
  hourMeterStart2026: string;
  hourMeterUpdate: string;
  dateOfUpdate: string;
  hourMeterEnd2026: string;
  currentYtd: string;
  lessThan200Hours: string;
  transferDateIn: string;
  transferDateOut: string;
  status: "Working" | "Damaged";
  notes: string;
};

export type InventoryLog = {
  id: number;
  date: string;
  itemType: TicketItemType | "Inventory";
  itemName: string;
  action: string;
  qty: number;
  job: string;
  assignedTo: string;
  notes: string;
};

export type JobRequestLine = {
  id: number;
  type: RequestType;
  category: string;
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  inventoryItemId?: number | null;
  inventorySnapshot?: string;
};

export type JobRequest = {
  id: number;
  destinationType?: RequestDestinationType;
  requestFlow?: RequestFlow;
  jobNumber: string;
  requestedForPerson?: string;
  requestedBy: string;
  requestDate: string;
  neededBy: string;
  status: RequestStatus;
  notes: string;
  fromLocation?: string;
  toLocation?: string;
  lines: JobRequestLine[];
  workflowStatus?: RequestWorkflowStatus;
  pickTicketId?: number | null;
  pickTicketNumber?: string;
  transferTicketId?: number | null;
  transferTicketNumber?: string;
  deliveredToSiteAt?: string;
  assignedToJobAt?: string;
};

export type AppNotification = {
  id: number;
  jobNumber: string;
  requestId: number | null;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
};

export type TicketLine = {
  id: number;
  itemType: TicketItemType;
  itemId: number | null;
  itemName: string;
  qty: number;
  unit: string;
  fromLocation: string;
  toLocation: string;
  notes: string;
};

export type ShopTicket = {
  id: number;
  ticketNumber: string;
  type: TicketType;
  jobNumber: string;
  requestedBy: string;
  assignedTo: string;
  requestDate: string;
  neededBy: string;
  status: TicketStatus;
  notes: string;
  sourceRequestId?: number | null;
  lines: TicketLine[];
};

export type Employee = {
  id: number;
  name: string;
  title: string;
  isActive: boolean;
};

export type AppData = {
  jobs: Job[];
  materials: Material[];
  prefab: PrefabItem[];
  purchaseOrders: PurchaseOrder[];
  assemblies: Assembly[];
  assemblyBom: AssemblyBomItem[];
  regularInventory: RegularInventoryItem[];
  materialMovements: MaterialMovement[];
  toolInventory: ToolItem[];
  equipmentInventory: EquipmentItem[];
  inventoryLogs: InventoryLog[];
  requests: JobRequest[];
  notifications: AppNotification[];
  tickets: ShopTicket[];
  employees: Employee[];
};