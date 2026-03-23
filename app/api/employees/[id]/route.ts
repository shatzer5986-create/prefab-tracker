import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const employeeId = Number(id);

    if (!Number.isFinite(employeeId)) {
      return NextResponse.json({ error: "Invalid employee id" }, { status: 400 });
    }

    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const title = String(body.title ?? "").trim();
    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : true;

    if (!name) {
      return NextResponse.json(
        { error: "Employee name is required" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        name,
        title,
        isActive,
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error("PUT /api/employees/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const employeeId = Number(id);

    if (!Number.isFinite(employeeId)) {
      return NextResponse.json({ error: "Invalid employee id" }, { status: 400 });
    }

    await prisma.employee.delete({
      where: { id: employeeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/employees/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}