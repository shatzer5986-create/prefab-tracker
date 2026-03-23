import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("GET /api/employees failed:", error);
    return NextResponse.json(
      { error: "Failed to load employees" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const title = String(body.title ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const isActive = body.isActive !== false;

    if (!name) {
      return NextResponse.json(
        { error: "Employee name is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.employee.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Employee "${name}" already exists` },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        title,
        email,
        phone,
        isActive,
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error("POST /api/employees failed:", error);

    const message =
      error instanceof Error ? error.message : "Failed to create employee";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}