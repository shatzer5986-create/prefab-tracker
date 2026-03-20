"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "prefab-tracker-v7";

type Material = {
  id: number;
  item?: string;
  job?: string;
  receivedQty?: number;
  allocatedQty?: number;
};

type PrefabItem = {
  id: number;
  assembly?: string;
  assemblyId?: number | null;
  area?: string;
  job?: string;
  qtyPlanned?: number;
};

type Assembly = {
  id: number;
  name?: string;
};

type AssemblyBomItem = {
  id: number;
  assemblyId?: number;
  materialItem?: string;
  material?: string;
  item?: string;
  materialName?: string;
  materialLabel?: string;
  qtyPerAssembly?: number;
  unit?: string;
};

type AppData = {
  materials?: Material[];
  prefab?: PrefabItem[];
  assemblies?: Assembly[];
  assemblyBom?: AssemblyBomItem[];
};

function safeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeKey(value: unknown) {
  return safeText(value).toLowerCase();
}

function getBomMaterialName(row: AssemblyBomItem) {
  return (
    safeText(row.materialItem) ||
    safeText(row.material) ||
    safeText(row.item) ||
    safeText(row.materialName) ||
    safeText(row.materialLabel)
  );
}

export default function PrefabAutoAllocate() {
  const [prefabId, setPrefabId] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [prefabItems, setPrefabItems] = useState<PrefabItem[]>([]);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [assemblyBom, setAssemblyBom] = useState<AssemblyBomItem[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed: AppData = JSON.parse(raw);
      setMaterials(Array.isArray(parsed.materials) ? parsed.materials : []);
      setPrefabItems(Array.isArray(parsed.prefab) ? parsed.prefab : []);
      setAssemblies(Array.isArray(parsed.assemblies) ? parsed.assemblies : []);
      setAssemblyBom(Array.isArray(parsed.assemblyBom) ? parsed.assemblyBom : []);
    } catch (err) {
      console.error("Failed to read app data:", err);
    }
  }

  const selectedPrefab = useMemo(() => {
    return prefabItems.find((p) => Number(p.id) === Number(prefabId)) || null;
  }, [prefabItems, prefabId]);

  const selectedAssembly = useMemo(() => {
    if (!selectedPrefab) return null;

    if (selectedPrefab.assemblyId != null) {
      const byId = assemblies.find(
        (a) => Number(a.id) === Number(selectedPrefab.assemblyId)
      );
      if (byId) return byId;
    }

    const prefabAssemblyName = safeKey(selectedPrefab.assembly);
    if (!prefabAssemblyName) return null;

    const byName = assemblies.find(
      (a) => safeKey(a.name) === prefabAssemblyName
    );

    return byName || null;
  }, [selectedPrefab, assemblies]);

  const bomRowsForSelectedAssembly = useMemo(() => {
    if (!selectedAssembly) return [];
    return assemblyBom.filter(
      (row) => Number(row.assemblyId) === Number(selectedAssembly.id)
    );
  }, [assemblyBom, selectedAssembly]);

  async function handleAutoAllocate() {
    setMessage("");

    if (!selectedPrefab) {
      alert("Select a prefab first.");
      return;
    }

    if (!selectedAssembly) {
      alert("No linked assembly found for this prefab.");
      return;
    }

    if (bomRowsForSelectedAssembly.length === 0) {
      alert("No BOM rows found for this assembly.");
      return;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      alert("No tracker data found.");
      return;
    }

    let data: AppData & { materials?: Material[] };

    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("Failed to parse tracker data:", err);
      alert("Tracker data is invalid.");
      return;
    }

    if (!Array.isArray(data.materials)) {
      alert("No materials found in tracker data.");
      return;
    }

const qtyPlanned = Number(selectedPrefab.qtyPlanned) || 0;
const qtyBuilt = Number((selectedPrefab as any).qtyBuilt) || 0;

const qtyRemaining = qtyPlanned - qtyBuilt;

if (qtyRemaining <= 0) {
  alert("Nothing remaining to allocate for this prefab.");
  return;
}

    const allocationPlan: {
      materialId: number;
      materialName: string;
      qtyToAllocate: number;
    }[] = [];

    for (const bomRow of bomRowsForSelectedAssembly) {
      const bomMaterialName = getBomMaterialName(bomRow);
      const bomQty = Number(bomRow.qtyPerAssembly) || 0;

      if (!bomMaterialName || bomQty <= 0) continue;

      const matchedMaterial = data.materials.find((material) => {
        const materialName = safeKey(material.item);
        const bomName = safeKey(bomMaterialName);

        return (
          materialName === bomName ||
          materialName.includes(bomName) ||
          bomName.includes(materialName)
        );
      });

      if (!matchedMaterial) {
        alert(`Could not find material match for BOM item: ${bomMaterialName}`);
        return;
      }

      const qtyToAllocate = qtyRemaining * bomQty;
      const currentReceived = Number(matchedMaterial.receivedQty) || 0;
      const currentAllocated = Number(matchedMaterial.allocatedQty) || 0;
      const currentAvailable = currentReceived - currentAllocated;

      if (qtyToAllocate > currentAvailable) {
        alert(
          `Cannot auto allocate ${qtyToAllocate} of ${safeText(
            matchedMaterial.item
          )}. Only ${currentAvailable} available.`
        );
        return;
      }

      allocationPlan.push({
        materialId: Number(matchedMaterial.id),
        materialName: safeText(matchedMaterial.item),
        qtyToAllocate,
      });
    }

    for (const planRow of allocationPlan) {
      const materialIndex = data.materials.findIndex(
        (m) => Number(m.id) === Number(planRow.materialId)
      );

      if (materialIndex !== -1) {
        const currentAllocated =
          Number(data.materials[materialIndex].allocatedQty) || 0;

        data.materials[materialIndex].allocatedQty =
          currentAllocated + planRow.qtyToAllocate;
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    for (const planRow of allocationPlan) {
      const res = await fetch("/api/prefabAllocation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prefab_id: Number(selectedPrefab.id),
          material_id: Number(planRow.materialId),
          quantity_allocated: Number(planRow.qtyToAllocate),
        }),
      });

      if (!res.ok) {
        alert(`Failed to save allocation for ${planRow.materialName}`);
        return;
      }
    }

    setMessage(
      `Auto allocated ${allocationPlan.length} material rows for ${safeText(
        selectedPrefab.assembly
      ) || "selected prefab"} in ${safeText(selectedPrefab.area) || "selected area"}.`
    );

    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={prefabId}
          onChange={(e) => setPrefabId(e.target.value)}
          className="rounded border p-2 bg-white text-black"
        >
          <option value="">Select Prefab to Auto Allocate</option>
          {prefabItems.map((prefab) => (
            <option key={prefab.id} value={prefab.id}>
              {safeText(prefab.job) || "No Job"} - {safeText(prefab.assembly) || "No Assembly"} - {safeText(prefab.area) || "No Area"} - Planned {Number(prefab.qtyPlanned) || 0}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleAutoAllocate}
          disabled={!prefabId}
          className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
        >
          Auto Allocate from BOM
        </button>
      </div>

      {selectedPrefab && (
        <div className="rounded border p-3 bg-gray-50 text-black space-y-1">
          <div>
            <strong>Prefab:</strong> {safeText(selectedPrefab.job)} - {safeText(selectedPrefab.assembly)} - {safeText(selectedPrefab.area)}
          </div>
          <div>
  <strong>Qty Planned:</strong> {Number(selectedPrefab.qtyPlanned) || 0}
</div>

<div>
  <strong>Qty Built:</strong> {Number((selectedPrefab as any).qtyBuilt) || 0}
</div>

<div>
  <strong>Qty Remaining:</strong>{" "}
  {(Number(selectedPrefab.qtyPlanned) || 0) -
    (Number((selectedPrefab as any).qtyBuilt) || 0)}
</div>
          <div>
            <strong>Linked Assembly:</strong>{" "}
            {selectedAssembly
              ? `${safeText(selectedAssembly.name)} (ID ${selectedAssembly.id})`
              : "No linked assembly found"}
          </div>
          <div>
            <strong>BOM Rows Found:</strong> {bomRowsForSelectedAssembly.length}
          </div>
          <div>
            <strong>BOM Items:</strong>{" "}
            {bomRowsForSelectedAssembly.length > 0
              ? bomRowsForSelectedAssembly
                  .map((row) => {
                    const name = getBomMaterialName(row);
                    const qtyEach = Number(row.qtyPerAssembly) || 0;
                    return `${name} x ${qtyEach}`;
                  })
                  .join(" | ")
              : "None"}
          </div>
        </div>
      )}

      {message && (
        <div className="rounded border p-3 bg-green-50 text-green-900">
          {message}
        </div>
      )}
    </div>
  );
}