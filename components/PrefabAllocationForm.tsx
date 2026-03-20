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

export default function PrefabAllocationForm() {
  const [prefabId, setPrefabId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [qty, setQty] = useState("");

  const [materials, setMaterials] = useState<Material[]>([]);
  const [prefabItems, setPrefabItems] = useState<PrefabItem[]>([]);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [assemblyBom, setAssemblyBom] = useState<AssemblyBomItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed: AppData = JSON.parse(raw);
      setMaterials(Array.isArray(parsed.materials) ? parsed.materials : []);
      setPrefabItems(Array.isArray(parsed.prefab) ? parsed.prefab : []);
      setAssemblies(Array.isArray(parsed.assemblies) ? parsed.assemblies : []);
      setAssemblyBom(Array.isArray(parsed.assemblyBom) ? parsed.assemblyBom : []);
    } catch (err) {
      console.error("Failed to read app data from localStorage:", err);
    }
  }, []);

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

  const bomMaterialNames = useMemo(() => {
    return bomRowsForSelectedAssembly
      .map((row) => getBomMaterialName(row))
      .filter((name) => name.length > 0);
  }, [bomRowsForSelectedAssembly]);

  const filteredMaterials = useMemo(() => {
    if (!selectedPrefab) return [];
    if (!selectedAssembly) return [];
    if (bomMaterialNames.length === 0) return [];

    return materials.filter((material) => {
      const materialName = safeKey(material.item);

      return bomMaterialNames.some((bomNameRaw) => {
        const bomName = safeKey(bomNameRaw);

        return (
          materialName === bomName ||
          materialName.includes(bomName) ||
          bomName.includes(materialName)
        );
      });
    });
  }, [materials, selectedPrefab, selectedAssembly, bomMaterialNames]);

  const selectedMaterial = useMemo(() => {
    return materials.find((m) => Number(m.id) === Number(materialId)) || null;
  }, [materials, materialId]);

  const receivedQty = Number(selectedMaterial?.receivedQty) || 0;
  const allocatedQty = Number(selectedMaterial?.allocatedQty) || 0;
  const availableQty = receivedQty - allocatedQty;
  const qtyToAdd = Number(qty) || 0;

  const overAllocated =
    !!selectedMaterial && qtyToAdd > 0 && qtyToAdd > availableQty;

  function handlePrefabChange(value: string) {
    setPrefabId(value);
    setMaterialId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!prefabId || !materialId || qtyToAdd <= 0) {
      alert("Please select a prefab, material, and valid quantity.");
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

    const materialIndex = data.materials.findIndex(
      (m) => Number(m.id) === Number(materialId)
    );

    if (materialIndex === -1) {
      alert("Selected material was not found.");
      return;
    }

    const currentReceived = Number(data.materials[materialIndex].receivedQty) || 0;
    const currentAllocated = Number(data.materials[materialIndex].allocatedQty) || 0;
    const currentAvailable = currentReceived - currentAllocated;

    if (qtyToAdd > currentAvailable) {
      alert(
        `Cannot allocate ${qtyToAdd}. Only ${currentAvailable} available for ${safeText(
          data.materials[materialIndex].item
        ) || "this material"}.`
      );
      return;
    }

    data.materials[materialIndex].allocatedQty = currentAllocated + qtyToAdd;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    const res = await fetch("/api/prefabAllocation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prefab_id: Number(prefabId),
        material_id: Number(materialId),
        quantity_allocated: qtyToAdd,
      }),
    });

    if (!res.ok) {
      alert("Failed to save allocation");
      return;
    }

    window.location.reload();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <select
          value={prefabId}
          onChange={(e) => handlePrefabChange(e.target.value)}
          className="rounded border p-2 bg-white text-black"
          required
        >
          <option value="">Select Prefab</option>
          {prefabItems.map((prefab) => (
            <option key={prefab.id} value={prefab.id}>
              {safeText(prefab.job) || "No Job"} - {safeText(prefab.assembly) || "No Assembly"} - {safeText(prefab.area) || "No Area"}
            </option>
          ))}
        </select>

        <select
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
          className="rounded border p-2 bg-white text-black"
          required
          disabled={!prefabId}
        >
          <option value="">
            {prefabId ? "Select Material" : "Select Prefab First"}
          </option>
          {filteredMaterials.map((material) => (
            <option key={material.id} value={material.id}>
              {safeText(material.job) || "No Job"} - {safeText(material.item) || "Unnamed Material"}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Quantity"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="rounded border p-2 bg-white text-black"
          required
          min="1"
        />
      </div>

      {selectedPrefab && (
        <div className="rounded border p-3 bg-gray-50 text-black space-y-2">
          <div>
            <strong>Prefab:</strong> {safeText(selectedPrefab.job) || "No Job"} - {safeText(selectedPrefab.assembly) || "No Assembly"} - {safeText(selectedPrefab.area) || "No Area"}
          </div>
          <div>
            <strong>Linked Assembly:</strong>{" "}
            {selectedAssembly
              ? `${safeText(selectedAssembly.name) || "Unnamed Assembly"} (ID ${selectedAssembly.id})`
              : "No linked assembly found"}
          </div>
          <div>
            <strong>BOM Rows Found:</strong> {bomRowsForSelectedAssembly.length}
          </div>
          <div>
            <strong>Allowed Materials:</strong> {filteredMaterials.length}
          </div>

          <div>
            <strong>BOM Material Names:</strong>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              {bomMaterialNames.length > 0 ? bomMaterialNames.join(" | ") : "None"}
            </div>
          </div>

          <div>
            <strong>Matched Material Names:</strong>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              {filteredMaterials.length > 0
                ? filteredMaterials.map((m) => safeText(m.item) || "Unnamed").join(" | ")
                : "None"}
            </div>
          </div>
        </div>
      )}

      {selectedMaterial && (
        <div className="rounded border p-3 bg-gray-50 text-black">
          <div><strong>Material:</strong> {safeText(selectedMaterial.job) || "No Job"} - {safeText(selectedMaterial.item) || "Unnamed Material"}</div>
          <div><strong>Received:</strong> {receivedQty}</div>
          <div><strong>Allocated:</strong> {allocatedQty}</div>
          <div>
            <strong>Available:</strong>{" "}
            <span style={{ color: availableQty < 0 ? "#b91c1c" : "#111827" }}>
              {availableQty}
            </span>
          </div>

          {qtyToAdd > 0 && (
            <div style={{ marginTop: "8px" }}>
              <strong>After this allocation:</strong>{" "}
              <span
                style={{
                  color: availableQty - qtyToAdd < 0 ? "#b91c1c" : "#111827",
                }}
              >
                {availableQty - qtyToAdd}
              </span>
            </div>
          )}

          {overAllocated && (
            <div
              style={{
                marginTop: "10px",
                color: "#b91c1c",
                fontWeight: 700,
              }}
            >
              Cannot allocate {qtyToAdd}. Only {availableQty} available.
            </div>
          )}
        </div>
      )}

      <button
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        type="submit"
        disabled={!prefabId || !materialId || qtyToAdd <= 0 || overAllocated}
      >
        Allocate
      </button>
    </form>
  );
}