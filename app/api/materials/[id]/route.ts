import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const materialId = Number(id);

    if (Number.isNaN(materialId)) {
      return NextResponse.json({ error: "Invalid material id" }, { status: 400 });
    }

    const body = await req.json();

    const updated = await prisma.material.update({
      where: { id: materialId },
      data: {
        job: String(body.job ?? "").trim(),
        item: String(body.item ?? "").trim(),
        category: String(body.category ?? "").trim(),
        orderedQty: Number(body.orderedQty ?? 0) || 0,
        receivedQty: Number(body.receivedQty ?? 0) || 0,
        allocatedQty: Number(body.allocatedQty ?? 0) || 0,
        unit: String(body.unit ?? "").trim() || "ea",
        vendor: String(body.vendor ?? "").trim(),
        status: String(body.status ?? "Ordered").trim(),
        location: String(body.location ?? "").trim(),
        poNumber: String(body.poNumber ?? "").trim() || null,
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

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const materialId = Number(id);

    if (Number.isNaN(materialId)) {
      return NextResponse.json({ error: "Invalid material id" }, { status: 400 });
    }

    await prisma.material.delete({
      where: { id: materialId },
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