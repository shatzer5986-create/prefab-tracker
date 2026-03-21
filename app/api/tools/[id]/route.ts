import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ToolAssignmentType, ToolItem } from "@/types";

function normalizeAssignmentType(value: unknown): ToolAssignmentType {
  return value === "Job" ||
    value === "Person" ||
    value === "Tool Room" ||
    value === "Shop" ||
    value === "Yard" ||
    value === "WH1" ||
    value === "WH2"
    ? value
    : "Shop";
}

function normalizeStatus(value: unknown): "Working" | "Damaged" {
  return value === "Damaged" ? "Damaged" : "Working";
}

function toToolItem(row: {
  id: number;
  category: string | null;
  barcode: string | null;
  itemNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  description: string | null;
  quantityAvailable: number;
  jobNumber: string | null;
  assignmentType: string;
  assignedTo: string | null;
  toolRoomLocation: string | null;
  serialNumber: string | null;
  transferDateIn: string | null;
  transferDateOut: string | null;
  status: string;
}): ToolItem {
  return {
    id: row.id,
    category: row.category ?? "",
    barcode: row.barcode ?? "",
    itemNumber: row.itemNumber ?? "",
    manufacturer: row.manufacturer ?? "",
    model: row.model ?? "",
    description: row.description ?? "",
    quantityAvailable: Number(row.quantityAvailable ?? 0),
    jobNumber: row.jobNumber ?? "",
    assignmentType: normalizeAssignmentType(row.assignmentType),
    assignedTo: row.assignedTo ?? "",
    toolRoomLocation: row.toolRoomLocation ?? "",
    serialNumber: row.serialNumber ?? "",
    transferDateIn: row.transferDateIn ?? "",
    transferDateOut: row.transferDateOut ?? "",
    status: normalizeStatus(row.status),
  };
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
      return NextResponse.json({ error: "Invalid tool id" }, { status: 400 });
    }

    const body = await req.json();

    const category = String(body.category ?? "").trim() || null;
    const barcode = String(body.barcode ?? "").trim() || null;
    const itemNumber = String(body.itemNumber ?? "").trim() || null;
    const manufacturer = String(body.manufacturer ?? "").trim() || null;
    const model = String(body.model ?? "").trim() || null;
    const description = String(body.description ?? "").trim() || null;
    const quantityAvailable = Number(body.quantityAvailable ?? 0) || 0;
    const jobNumber = String(body.jobNumber ?? "").trim() || null;
    const assignmentType = normalizeAssignmentType(body.assignmentType);
    const assignedTo = String(body.assignedTo ?? "").trim() || null;
    const toolRoomLocation = String(body.toolRoomLocation ?? "").trim() || null;
    const serialNumber = String(body.serialNumber ?? "").trim() || null;
    const transferDateIn = String(body.transferDateIn ?? "").trim() || null;
    const transferDateOut = String(body.transferDateOut ?? "").trim() || null;
    const status = normalizeStatus(body.status);

    const updated = await prisma.tool.update({
      where: { id },
      data: {
        category,
        barcode,
        itemNumber,
        manufacturer,
        model,
        description,
        quantityAvailable,
        jobNumber,
        assignmentType,
        assignedTo,
        toolRoomLocation,
        serialNumber,
        transferDateIn,
        transferDateOut,
        status,
      },
    });

    return NextResponse.json(toToolItem(updated));
  } catch (error) {
    console.error("PUT /api/tools/[id] failed:", error);

    return NextResponse.json(
      {
        error: "Failed to update tool",
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
      return NextResponse.json({ error: "Invalid tool id" }, { status: 400 });
    }

    await prisma.tool.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tools/[id] failed:", error);

    return NextResponse.json(
      {
        error: "Failed to delete tool",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}