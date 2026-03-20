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
    const body = await req.json();

    const job = await prisma.job.update({
      where: {
        id: Number(id),
      },
      data: {
        jobNumber: String(body.jobNumber || "").trim(),
        name: String(body.name || "").trim(),
        customer: String(body.customer || "").trim(),
        status: String(body.status || "Active").trim(),
      },
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error("PUT /api/jobs/[id] failed:", error);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    await prisma.job.delete({
      where: {
        id: Number(id),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/jobs/[id] failed:", error);
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}