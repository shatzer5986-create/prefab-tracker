import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid material id" }, { status: 400 });
    }

    const body = await req.json();

    const job = String(body.job ?? "").trim();
    const item = String(body.item ?? "").trim();
    const category = String(body.category ?? "").trim();
    const orderedQty = Number(body.orderedQty ?? 0) || 0;
    const receivedQty = Number(body.receivedQty ?? 0) || 0;
    const stockQty = Number(body.stockQty ?? 0) || 0;
    const allocatedQty = Number(body.allocatedQty ?? 0) || 0;
    const unit = String(body.unit ?? "").trim() || "ea";
    const vendor = String(body.vendor ?? "").trim();
    const status = String(body.status ?? "Ordered").trim();
    const location = String(body.location ?? "").trim();
    const poNumber = String(body.poNumber ?? "").trim();

    if (!job || !item) {
      return NextResponse.json(
        { error: "job and item are required" },
        { status: 400 }
      );
    }

    const updated = await prisma.material.update({
      where: { id },
      data: {
        job,
        item,
        category,
        orderedQty,
        receivedQty,
        stockQty,
        allocatedQty,
        unit,
        vendor,
        status,
        location,
        poNumber: poNumber || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/materials/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to update material" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid material id" }, { status: 400 });
    }

    await prisma.material.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/materials/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete material" },
      { status: 500 }
    );
  }
}