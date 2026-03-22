import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const materials = await prisma.material.findMany({
      orderBy: [{ job: "asc" }, { item: "asc" }],
    });

    return NextResponse.json(materials);
  } catch (error) {
    console.error("GET /api/materials failed:", error);
    return NextResponse.json(
      { error: "Failed to load materials" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const created = await prisma.material.create({
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

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/materials failed:", error);
    return NextResponse.json(
      { error: "Failed to create material" },
      { status: 500 }
    );
  }
}