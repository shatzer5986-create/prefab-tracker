import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type JobStockPayload = {
  jobNumber: string;
  materialName: string;
  description?: string;
  unit: string;
  quantity: number | string;
  vendor?: string;
  poNumber?: string;
  location?: string;
  status?: string;
};

export async function GET(req: NextRequest) {
  try {
    const jobNumber = req.nextUrl.searchParams.get("jobNumber");

    if (!jobNumber) {
      return NextResponse.json(
        { error: "jobNumber is required" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
      SELECT
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
      FROM job_stock
      WHERE job_number = $1
      ORDER BY material_name ASC, id ASC
      `,
      [jobNumber]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("GET /api/job-stock error:", error);
    return NextResponse.json(
      { error: "Failed to load job stock" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as JobStockPayload;

    const jobNumber = body.jobNumber?.trim();
    const materialName = body.materialName?.trim();
    const description = body.description?.trim() || "";
    const unit = body.unit?.trim();
    const quantity = Number(body.quantity ?? 0);
    const vendor = body.vendor?.trim() || "";
    const poNumber = body.poNumber?.trim() || "";
    const location = body.location?.trim() || "";
    const status = body.status?.trim() || "available";

    if (!jobNumber || !materialName || !unit) {
      return NextResponse.json(
        { error: "jobNumber, materialName, and unit are required" },
        { status: 400 }
      );
    }

    if (Number.isNaN(quantity)) {
      return NextResponse.json(
        { error: "quantity must be a valid number" },
        { status: 400 }
      );
    }

    const existing = await db.query(
      `
      SELECT id, quantity
      FROM job_stock
      WHERE job_number = $1
        AND material_name = $2
        AND unit = $3
        AND COALESCE(po_number, '') = $4
      LIMIT 1
      `,
      [jobNumber, materialName, unit, poNumber]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      const updatedQty = Number(row.quantity) + quantity;

      const updated = await db.query(
        `
        UPDATE job_stock
        SET
          quantity = $1,
          description = $2,
          vendor = $3,
          po_number = $4,
          location = $5,
          status = $6,
          updated_at = NOW()
        WHERE id = $7
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
        [updatedQty, description, vendor, poNumber, location, status, row.id]
      );

      return NextResponse.json(updated.rows[0]);
    }

    const inserted = await db.query(
      `
      INSERT INTO job_stock (
        job_number,
        material_name,
        description,
        unit,
        quantity,
        vendor,
        po_number,
        location,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
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
      [
        jobNumber,
        materialName,
        description,
        unit,
        quantity,
        vendor,
        poNumber,
        location,
        status,
      ]
    );

    return NextResponse.json(inserted.rows[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/job-stock error:", error);
    return NextResponse.json(
      { error: "Failed to save job stock" },
      { status: 500 }
    );
  }
}