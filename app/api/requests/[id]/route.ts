import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const requestId = Number(id);

    if (!Number.isFinite(requestId) || requestId <= 0) {
      return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
    }

    const body = await req.json();

    const existing = await prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: {
        destinationType:
          body.destinationType !== undefined
            ? safeString(body.destinationType) || null
            : undefined,
        requestFlow:
          body.requestFlow !== undefined
            ? safeString(body.requestFlow) || null
            : undefined,
        jobNumber:
          body.jobNumber !== undefined ? safeString(body.jobNumber) : undefined,
        requestedForPerson:
          body.requestedForPerson !== undefined
            ? safeString(body.requestedForPerson) || null
            : undefined,
        requestedBy:
          body.requestedBy !== undefined ? safeString(body.requestedBy) : undefined,
        requestDate:
          body.requestDate !== undefined ? safeString(body.requestDate) : undefined,
        neededBy:
          body.neededBy !== undefined ? safeString(body.neededBy) : undefined,
        status:
          body.status !== undefined ? safeString(body.status) : undefined,
        notes:
          body.notes !== undefined ? safeString(body.notes) : undefined,
        fromLocation:
          body.fromLocation !== undefined
            ? safeString(body.fromLocation) || null
            : undefined,
        toLocation:
          body.toLocation !== undefined
            ? safeString(body.toLocation) || null
            : undefined,
        workflowStatus:
          body.workflowStatus !== undefined
            ? safeString(body.workflowStatus) || null
            : undefined,
        pickTicketId:
          body.pickTicketId !== undefined ? body.pickTicketId ?? null : undefined,
        pickTicketNumber:
          body.pickTicketNumber !== undefined
            ? safeString(body.pickTicketNumber) || null
            : undefined,
        transferTicketId:
          body.transferTicketId !== undefined
            ? body.transferTicketId ?? null
            : undefined,
        transferTicketNumber:
          body.transferTicketNumber !== undefined
            ? safeString(body.transferTicketNumber) || null
            : undefined,
        deliveredToSiteAt:
          body.deliveredToSiteAt !== undefined
            ? safeString(body.deliveredToSiteAt) || null
            : undefined,
        assignedToJobAt:
          body.assignedToJobAt !== undefined
            ? safeString(body.assignedToJobAt) || null
            : undefined,
      },
      include: {
        lines: {
          orderBy: { id: "asc" },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/requests/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Failed to update request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const requestId = Number(id);

    if (!Number.isFinite(requestId) || requestId <= 0) {
      return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
    }

    await prisma.request.delete({
      where: { id: requestId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/requests/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Failed to delete request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}