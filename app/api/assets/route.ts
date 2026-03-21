import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EquipmentAssignmentType, EquipmentItem } from "@/types";

function normalizeAssignmentType(value: unknown): EquipmentAssignmentType {
  return value === "Job" ||
    value === "Person" ||
    value === "Tool Room" ||
    value === "Shop" ||
    value === "Yard" ||
    value === "WH1" ||
    value === "WH2"
    ? value
    : "Job";
}

function normalizeAssetType(value: unknown): EquipmentItem["assetType"] {
  return value === "Trailer" || value === "Vehicle" ? value : "Equipment";
}

function normalizeStatus(value: unknown): "Working" | "Damaged" {
  return value === "Damaged" ? "Damaged" : "Working";
}

function toEquipmentItem(row: any): EquipmentItem {
  return {
    id: row.id,
    assetType: normalizeAssetType(row.assetType),
    quantityAvailable: Number(row.quantityAvailable ?? 1),
    assetNumber: row.assetNumber ?? "",
    jobNumber: row.jobNumber ?? "",
    assignedTo: row.assignedTo ?? "",
    assignmentType: normalizeAssignmentType(row.assignmentType),
    toolRoomLocation: row.toolRoomLocation ?? "",
    year: row.year ?? "",
    manufacturer: row.manufacturer ?? "",
    model: row.model ?? "",
    modelNumber: row.modelNumber ?? "",
    description: row.description ?? "",
    category: row.category ?? "",
    itemNumber: row.itemNumber ?? "",
    barcode: row.barcode ?? "",
    serialNumber: row.serialNumber ?? "",
    licensePlate: row.licensePlate ?? "",
    vinSerial: row.vinSerial ?? "",
    engineSerialNumber: row.engineSerialNumber ?? "",
    ein: row.ein ?? "",
    gvwr: row.gvwr ?? "",
    driverProject: row.driverProject ?? "",
    indexNumber: row.indexNumber ?? "",
    purchaseCost: row.purchaseCost ?? "",
    purchaseDate: row.purchaseDate ?? "",
    tier: row.tier ?? "",
    lowUse: row.lowUse ?? "",
    samsara: row.samsara ?? "",
    powered: row.powered ?? "",
    hourMeterStart2026: row.hourMeterStart2026 ?? "",
    hourMeterUpdate: row.hourMeterUpdate ?? "",
    dateOfUpdate: row.dateOfUpdate ?? "",
    hourMeterEnd2026: row.hourMeterEnd2026 ?? "",
    currentYtd: row.currentYtd ?? "",
    lessThan200Hours: row.lessThan200Hours ?? "",
    transferDateIn: row.transferDateIn ?? "",
    transferDateOut: row.transferDateOut ?? "",
    status: normalizeStatus(row.status),
    notes: row.notes ?? "",
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assetType = String(searchParams.get("assetType") ?? "").trim();

    const rows = await prisma.asset.findMany({
      where: assetType ? { assetType } : undefined,
      orderBy: [{ assetType: "asc" }, { assetNumber: "asc" }, { id: "asc" }],
    });

    return NextResponse.json(rows.map(toEquipmentItem));
  } catch (error) {
    console.error("GET /api/assets failed:", error);
    return NextResponse.json(
      {
        error: "Failed to load assets",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const created = await prisma.asset.create({
      data: {
        assetType: normalizeAssetType(body.assetType),
        quantityAvailable: Number(body.quantityAvailable ?? 1) || 1,
        assetNumber: String(body.assetNumber ?? "").trim() || null,
        jobNumber: String(body.jobNumber ?? "").trim() || null,
        assignedTo: String(body.assignedTo ?? "").trim() || null,
        assignmentType: normalizeAssignmentType(body.assignmentType),
        toolRoomLocation: String(body.toolRoomLocation ?? "").trim() || null,
        year: String(body.year ?? "").trim() || null,
        manufacturer: String(body.manufacturer ?? "").trim() || null,
        model: String(body.model ?? "").trim() || null,
        modelNumber: String(body.modelNumber ?? "").trim() || null,
        description: String(body.description ?? "").trim() || null,
        category: String(body.category ?? "").trim() || null,
        itemNumber: String(body.itemNumber ?? "").trim() || null,
        barcode: String(body.barcode ?? "").trim() || null,
        serialNumber: String(body.serialNumber ?? "").trim() || null,
        licensePlate: String(body.licensePlate ?? "").trim() || null,
        vinSerial: String(body.vinSerial ?? "").trim() || null,
        engineSerialNumber: String(body.engineSerialNumber ?? "").trim() || null,
        ein: String(body.ein ?? "").trim() || null,
        gvwr: String(body.gvwr ?? "").trim() || null,
        driverProject: String(body.driverProject ?? "").trim() || null,
        indexNumber: String(body.indexNumber ?? "").trim() || null,
        purchaseCost: String(body.purchaseCost ?? "").trim() || null,
        purchaseDate: String(body.purchaseDate ?? "").trim() || null,
        tier: String(body.tier ?? "").trim() || null,
        lowUse: String(body.lowUse ?? "").trim() || null,
        samsara: String(body.samsara ?? "").trim() || null,
        powered: String(body.powered ?? "").trim() || null,
        hourMeterStart2026: String(body.hourMeterStart2026 ?? "").trim() || null,
        hourMeterUpdate: String(body.hourMeterUpdate ?? "").trim() || null,
        dateOfUpdate: String(body.dateOfUpdate ?? "").trim() || null,
        hourMeterEnd2026: String(body.hourMeterEnd2026 ?? "").trim() || null,
        currentYtd: String(body.currentYtd ?? "").trim() || null,
        lessThan200Hours: String(body.lessThan200Hours ?? "").trim() || null,
        transferDateIn: String(body.transferDateIn ?? "").trim() || null,
        transferDateOut: String(body.transferDateOut ?? "").trim() || null,
        status: normalizeStatus(body.status),
        notes: String(body.notes ?? "").trim() || null,
      },
    });

    return NextResponse.json(toEquipmentItem(created), { status: 201 });
  } catch (error) {
    console.error("POST /api/assets failed:", error);
    return NextResponse.json(
      {
        error: "Failed to create asset",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}