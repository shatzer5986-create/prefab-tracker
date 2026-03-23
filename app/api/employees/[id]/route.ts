import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const employeeId = Number(id);
    const body = await req.json();

    if (!employeeId) {
      return NextResponse.json(
        { error: "Invalid employee id" },
        { status: 400 }
      );
    }

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

    const employee = await prisma.employee.update({
      where: { id: employeeId },
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
    console.error("PUT /api/employees/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const employeeId = Number(id);

    if (!employeeId) {
      return NextResponse.json(
        { error: "Invalid employee id" },
        { status: 400 }
      );
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