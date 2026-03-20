import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const materials = await prisma.$queryRawUnsafe(`
      SELECT
        id,
        name,
        category,
        default_unit AS "defaultUnit",
        default_vendor AS "defaultVendor",
        description,
        active
      FROM material_catalog
      WHERE active = TRUE
      ORDER BY name ASC
    `);

    return NextResponse.json(materials);
  } catch (error) {
    console.error("GET /api/material-catalog failed:", error);
    return NextResponse.json(
      { error: "Failed to load material catalog" },
      { status: 500 }
    );
  }
}