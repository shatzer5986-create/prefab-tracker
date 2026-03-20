import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type UpdateJobStockPayload = {
  materialName: string;
  description?: string;
  unit: string;
  quantity: number | string;
  vendor?: string;
  poNumber?: string;
  location?: string;
  status?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const rowId = Number(id);

    if (Number.isNaN(rowId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = (await req.json()) as UpdateJobStockPayload;

    const materialName = body.materialName?.trim();
    const description = body.description?.trim() || "";
    const unit = body.unit?.trim();
    const quantity = Number(body.quantity ?? 0);
    const vendor = body.vendor?.trim() || "";
    const poNumber = body.poNumber?.trim() || "";
    const location = body.location?.trim() || "";
    const status = body.status?.trim() || "available";

    if (!materialName || !unit) {
      return NextResponse.json(
        { error: "materialName and unit are required" },
        { status: 400 }
      );
    }

    if (Number.isNaN(quantity)) {
      return NextResponse.json(
        { error: "quantity must be a valid number" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
      UPDATE job_stock
      SET
        material_name = $1,
        description = $2,
        unit = $3,
        quantity = $4,
        vendor = $5,
        po_number = $6,
        location = $7,
        status = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING
        id,
        job_number AS "jobNumber",
        material_name AS "materialName",
        description,
        unit,
        quantity,
        vendor,
        po_number AS "poNumber",
        location,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [materialName, description, unit, quantity, vendor, poNumber, location, status, rowId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("PUT /api/job-stock/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update job stock" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const rowId = Number(id);

    if (Number.isNaN(rowId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const result = await db.query(
      `
      DELETE FROM job_stock
      WHERE id = $1
      RETURNING id
      `,
      [rowId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/job-stock/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete job stock" },
      { status: 500 }
    );
  }
}