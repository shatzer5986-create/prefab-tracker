import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    const requests = await prisma.request.findMany({
      include: {
        lines: {
          orderBy: { id: "asc" },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("GET /api/requests failed:", error);
    return NextResponse.json(
      { error: "Failed to load requests" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const destinationType =
      safeString(body.destinationType) === "Person"
        ? "Person"
        : safeString(body.destinationType) === "General"
        ? "General"
        : "Job";

    const jobNumber = safeString(body.jobNumber);
    const requestedForPerson = safeString(body.requestedForPerson);
    const requestedBy = safeString(body.requestedBy);
    const requestDate = safeString(body.requestDate);
    const neededBy = safeString(body.neededBy);
    const status = safeString(body.status);
    const notes = safeString(body.notes);

    const lines = Array.isArray(body.lines) ? body.lines : [];

    if (destinationType === "Job" && !jobNumber) {
      return NextResponse.json(
        { error: "Job number is required when destination type is Job" },
        { status: 400 }
      );
    }

    if (destinationType === "Person" && !requestedForPerson) {
      return NextResponse.json(
        { error: "Requested-for person is required when destination type is Person" },
        { status: 400 }
      );
    }

    if (!requestedBy) {
      return NextResponse.json(
        { error: "Requested by is required" },
        { status: 400 }
      );
    }

    if (!lines.length) {
      return NextResponse.json(
        { error: "At least one request line is required" },
        { status: 400 }
      );
    }

    const created = await prisma.request.create({
      data: {
        destinationType,
        requestFlow: safeString(body.requestFlow) || null,
        jobNumber: jobNumber || "",
requestedForPerson: requestedForPerson || null,
        requestedBy,
        requestDate: requestDate || new Date().toISOString(),
        neededBy,
        status: status || "Open",
        notes,
        fromLocation: safeString(body.fromLocation) || null,
        toLocation: safeString(body.toLocation) || null,
        workflowStatus: safeString(body.workflowStatus) || null,
        pickTicketId: body.pickTicketId ?? null,
        pickTicketNumber: safeString(body.pickTicketNumber) || null,
        transferTicketId: body.transferTicketId ?? null,
        transferTicketNumber: safeString(body.transferTicketNumber) || null,
        deliveredToSiteAt: safeString(body.deliveredToSiteAt) || null,
        assignedToJobAt: safeString(body.assignedToJobAt) || null,
        lines: {
          create: lines.map((line: any) => ({
            type: safeString(line.type),
            category: safeString(line.category),
            itemName: safeString(line.itemName),
            description: safeString(line.description),
            quantity: Number(line.quantity) || 0,
            unit: safeString(line.unit) || "ea",
            inventoryItemId: line.inventoryItemId ?? null,
            inventorySnapshot: safeString(line.inventorySnapshot) || null,
          })),
        },
      },
      include: {
        lines: {
          orderBy: { id: "asc" },
        },
      },
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error("POST /api/requests failed:", error);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 }
    );
  }
}