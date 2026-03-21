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

function parseId(value: string) {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json({ error: "Invalid asset id" }, { status: 400 });
    }

    const body = await req.json();

    const updated = await prisma.asset.update({
      where: { id },
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/assets/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Failed to update asset",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json({ error: "Invalid asset id" }, { status: 400 });
    }

    await prisma.asset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/assets/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Failed to delete asset",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}