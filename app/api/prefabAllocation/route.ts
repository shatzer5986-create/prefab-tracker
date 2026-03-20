import { NextResponse } from "next/server";

let allocations: any[] = [];

export async function GET() {
  return NextResponse.json(allocations);
}

export async function POST(req: Request) {
  const body = await req.json();

  const prefabId = Number(body.prefab_id);
  const materialId = Number(body.material_id);
  const qty = Number(body.quantity_allocated);

  const existingIndex = allocations.findIndex(
    (row) =>
      Number(row.prefab_id) === prefabId &&
      Number(row.material_id) === materialId
  );

  if (existingIndex !== -1) {
    allocations[existingIndex].quantity_allocated += qty;
    return NextResponse.json(allocations[existingIndex]);
  }

  const newAllocation = {
    id: Date.now() + Math.random(),
    prefab_id: prefabId,
    material_id: materialId,
    quantity_allocated: qty,
  };

  allocations.push(newAllocation);

  return NextResponse.json(newAllocation);
}

export async function DELETE(req: Request) {
  const body = await req.json();
  const prefabId = Number(body.prefab_id);

  if (!prefabId) {
    return NextResponse.json(
      { error: "prefab_id is required" },
      { status: 400 }
    );
  }

  const removedAllocations = allocations.filter(
    (row) => Number(row.prefab_id) === prefabId
  );

  allocations = allocations.filter(
    (row) => Number(row.prefab_id) !== prefabId
  );

  return NextResponse.json({
    success: true,
    removed: removedAllocations,
  });
}