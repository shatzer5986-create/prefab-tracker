-- CreateTable
CREATE TABLE "Job" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "status" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Material" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobNumber" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "orderedQty" REAL NOT NULL,
    "receivedQty" REAL NOT NULL,
    "allocatedQty" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    CONSTRAINT "Material_jobNumber_fkey" FOREIGN KEY ("jobNumber") REFERENCES "Job" ("jobNumber") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrefabItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobNumber" TEXT NOT NULL,
    "assemblyId" INTEGER,
    "assembly" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "qtyPlanned" INTEGER NOT NULL,
    "qtyBuilt" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "materialReady" BOOLEAN NOT NULL,
    CONSTRAINT "PrefabItem_jobNumber_fkey" FOREIGN KEY ("jobNumber") REFERENCES "Job" ("jobNumber") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobNumber" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "orderDate" TEXT NOT NULL,
    "expectedDate" TEXT NOT NULL,
    "receivedDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "notes" TEXT NOT NULL,
    CONSTRAINT "PurchaseOrder_jobNumber_fkey" FOREIGN KEY ("jobNumber") REFERENCES "Job" ("jobNumber") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assembly" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "Assembly_jobNumber_fkey" FOREIGN KEY ("jobNumber") REFERENCES "Job" ("jobNumber") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssemblyBomItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assemblyId" INTEGER NOT NULL,
    "item" TEXT NOT NULL,
    "qtyPerAssembly" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    CONSTRAINT "AssemblyBomItem_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "Assembly" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegularInventoryItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobNumber" TEXT NOT NULL,
    "materialId" INTEGER,
    "materialName" TEXT NOT NULL,
    "qty" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "dateReceived" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    CONSTRAINT "RegularInventoryItem_jobNumber_fkey" FOREIGN KEY ("jobNumber") REFERENCES "Job" ("jobNumber") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaterialMovementItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobNumber" TEXT NOT NULL,
    "materialId" INTEGER,
    "materialName" TEXT NOT NULL,
    "qty" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "handledBy" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    CONSTRAINT "MaterialMovementItem_jobNumber_fkey" FOREIGN KEY ("jobNumber") REFERENCES "Job" ("jobNumber") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrefabAllocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "prefab_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "quantity_allocated" REAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_jobNumber_key" ON "Job"("jobNumber");
