"use client";

import Papa from "papaparse";
import { useEffect, useMemo, useState } from "react";

import { buttonStyle } from "@/components/TableBits";
import AppShell from "@/components/AppShell";
import Section from "@/components/Section";
import StatCard from "@/components/StatCard";
import EquipmentForm from "@/components/EquipmentForm";
import EquipmentTable from "@/components/EquipmentTable";

import type { AppData, Employee, EquipmentItem } from "@/types";

const EXTRA_JOB_OPTIONS = ["Yard", "Tool Room", "Shop", "WH1", "WH2"];

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dedupeStrings(values: string[]) {
  return values.filter((value, index, arr) => arr.indexOf(value) === index);
}

function isStorageLocation(value: string) {
  const normalized = safeString(value).toLowerCase();
  return ["tool room", "shop", "yard", "wh1", "wh2"].includes(normalized);
}

function normalizeAssignmentType(
  jobNumber: string,
  assignedTo = "",
  currentAssignmentType = ""
): EquipmentItem["assignmentType"] {
  const normalizedJob = safeString(jobNumber);
  const normalizedAssignedTo = safeString(assignedTo);
  const normalizedType = safeString(currentAssignmentType);

  if (normalizedAssignedTo) return "Person";
  if (normalizedJob === "Tool Room") return "Tool Room";
  if (normalizedJob === "Shop") return "Shop";
  if (normalizedJob === "Yard") return "Yard";
  if (normalizedJob === "WH1") return "WH1";
  if (normalizedJob === "WH2") return "WH2";
  if (normalizedType === "Person") return "Person";
  return "Job";
}

function normalizeHeader(value: unknown) {
  return safeString(value).toLowerCase().replace(/\s+/g, " ");
}

function getCell(row: Record<string, unknown>, header: string) {
  const normalizedTarget = normalizeHeader(header);
  const foundKey = Object.keys(row).find(
    (key) => normalizeHeader(key) === normalizedTarget
  );
  return foundKey ? row[foundKey] : "";
}

function parseQty(value: unknown, fallback = 1) {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const parsed = Number(String(value ?? "").trim());
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseCsvDate(value: unknown) {
  const raw = safeString(value);
  if (!raw) return "";

  const asDate = new Date(raw);
  if (!Number.isNaN(asDate.getTime())) {
    const yyyy = asDate.getFullYear();
    const mm = String(asDate.getMonth() + 1).padStart(2, "0");
    const dd = String(asDate.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return raw;
}

function buildRowObjectFromHeaders(
  headers: string[],
  values: unknown[]
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  headers.forEach((header, index) => {
    row[header] = values[index] ?? "";
  });

  return row;
}

function parseFleetCsvRows(fileRows: unknown[][]) {
  const cleanedRows = fileRows.filter(
    (row) =>
      Array.isArray(row) &&
      row.some((cell) => String(cell ?? "").trim() !== "")
  );

  if (cleanedRows.length < 3) return [];

  const headerRow = cleanedRows[1].map((cell) => String(cell ?? "").trim());
  const dataRows = cleanedRows.slice(2);

  return dataRows.map((row) => buildRowObjectFromHeaders(headerRow, row));
}

function buildEquipmentMatchKey(
  item: Pick<
    EquipmentItem,
    "assetType" | "assetNumber" | "licensePlate" | "vinSerial" | "manufacturer" | "model"
  >
) {
  return [
    safeString(item.assetType).toLowerCase(),
    safeString(item.assetNumber).toLowerCase(),
    safeString(item.licensePlate).toLowerCase(),
    safeString(item.vinSerial).toLowerCase(),
    safeString(item.manufacturer).toLowerCase(),
    safeString(item.model).toLowerCase(),
  ].join("||");
}

function mergeImportedEquipment(
  existing: EquipmentItem[],
  imported: Omit<EquipmentItem, "id">[]
) {
  const existingByKey = new Map<string, EquipmentItem>();

  for (const item of existing) {
    existingByKey.set(buildEquipmentMatchKey(item), item);
  }

  const toCreate: Omit<EquipmentItem, "id">[] = [];
  const toUpdate: EquipmentItem[] = [];

  for (const item of imported) {
    const key = buildEquipmentMatchKey(item);
    const existingMatch = existingByKey.get(key);

    if (existingMatch) {
      toUpdate.push({
        ...existingMatch,
        ...item,
        id: existingMatch.id,
      });
    } else {
      toCreate.push(item);
    }
  }

  return { toCreate, toUpdate };
}

function makeEmptyEquipmentForm(
  assetType: EquipmentItem["assetType"]
): Omit<EquipmentItem, "id"> {
  return {
    assetType,
    quantityAvailable: 1,
    assetNumber: "",
    jobNumber: "",
    assignedTo: "",
    assignmentType: "Job",
    toolRoomLocation: "",
    year: "",
    manufacturer: "",
    model: "",
    modelNumber: "",
    description: assetType,
    category: assetType,
    itemNumber: "",
    barcode: "",
    serialNumber: "",
    licensePlate: "",
    vinSerial: "",
    engineSerialNumber: "",
    ein: "",
    gvwr: "",
    driverProject: "",
    indexNumber: "",
    purchaseCost: "",
    purchaseDate: "",
    tier: "",
    lowUse: "",
    samsara: "",
    powered: "",
    hourMeterStart2026: "",
    hourMeterUpdate: "",
    dateOfUpdate: "",
    hourMeterEnd2026: "",
    currentYtd: "",
    lessThan200Hours: "",
    transferDateIn: "",
    transferDateOut: "",
    status: "Working",
    notes: "",
  };
}

function parseImportedFleetEquipmentRow(
  row: Record<string, unknown>,
  assetType: EquipmentItem["assetType"]
): Omit<EquipmentItem, "id"> {
  if (assetType === "Trailer") {
    const jobNumber = safeString(getCell(row, "PROJECT"));
    const assignedTo = "";
    const assignmentType = normalizeAssignmentType(jobNumber, assignedTo);

    return {
      ...makeEmptyEquipmentForm("Trailer"),
      assetType: "Trailer",
      quantityAvailable: parseQty(getCell(row, "QTY"), 1),
      assetNumber: safeString(getCell(row, "TRAILER #")),
      jobNumber: assignmentType === "Job" ? jobNumber : "",
      assignedTo,
      assignmentType,
      toolRoomLocation: isStorageLocation(jobNumber) ? jobNumber : "",
      year: safeString(getCell(row, "YEAR")),
      manufacturer: safeString(getCell(row, "MANUFACTURE")),
      model: safeString(getCell(row, "MODEL")),
      gvwr: safeString(getCell(row, "GVWR")),
      licensePlate: safeString(getCell(row, "LICENSE PLATE")),
      vinSerial: safeString(getCell(row, "VIN")),
      samsara: safeString(getCell(row, "SAMSARA")),
      powered: safeString(getCell(row, "POWERED")),
      description: "Trailer",
      category: "Trailer",
      status: "Working",
    };
  }

  if (assetType === "Vehicle") {
    const rawDriverProject = safeString(getCell(row, "DRIVER/ PROJECT"));
    const assignmentType = normalizeAssignmentType(rawDriverProject, "");
    const assignedTo = assignmentType === "Person" ? rawDriverProject : "";

    return {
      ...makeEmptyEquipmentForm("Vehicle"),
      assetType: "Vehicle",
      quantityAvailable: parseQty(getCell(row, "QTY"), 1),
      assetNumber: safeString(getCell(row, "VEHICLE #")),
      jobNumber: assignmentType === "Job" ? rawDriverProject : "",
      assignedTo,
      assignmentType,
      toolRoomLocation: isStorageLocation(rawDriverProject) ? rawDriverProject : "",
      driverProject: rawDriverProject,
      year: safeString(getCell(row, "YEAR")),
      manufacturer: safeString(getCell(row, "MANUFACTURE")),
      model: safeString(getCell(row, "MODEL")),
      licensePlate: safeString(getCell(row, "LICENSE PLATE")),
      vinSerial: safeString(getCell(row, "VIN")),
      indexNumber: safeString(getCell(row, "INDEX")),
      description: "Vehicle",
      category: "Vehicle",
      status: "Working",
    };
  }

  const jobNumber = safeString(getCell(row, "PROJECT"));
  const assignedTo = "";
  const assignmentType = normalizeAssignmentType(jobNumber, assignedTo);

  return {
    ...makeEmptyEquipmentForm("Equipment"),
    assetType: "Equipment",
    quantityAvailable: parseQty(getCell(row, "QTY"), 1),
    assetNumber: safeString(getCell(row, "EQUIPMENT #")),
    jobNumber: assignmentType === "Job" ? jobNumber : "",
    assignedTo,
    assignmentType,
    toolRoomLocation: isStorageLocation(jobNumber) ? jobNumber : "",
    year: safeString(getCell(row, "YEAR")),
    manufacturer: safeString(getCell(row, "MANUFACTURE")),
    model: safeString(getCell(row, "MODEL")),
    modelNumber: safeString(getCell(row, "MODEL #")),
    licensePlate: safeString(getCell(row, "LICENSE")),
    vinSerial: safeString(getCell(row, "VIN/SERIAL")),
    engineSerialNumber: safeString(getCell(row, "Engine Serial #")),
    ein: safeString(getCell(row, "EIN")),
    purchaseCost: safeString(getCell(row, "PURCHASE COST")),
    purchaseDate: parseCsvDate(getCell(row, "PURCHASE DATE")),
    tier: safeString(getCell(row, "Tier")),
    lowUse: safeString(getCell(row, "Low Use")),
    samsara: safeString(getCell(row, "SAMSARA?")),
    powered: safeString(getCell(row, "POWERED")),
    hourMeterStart2026: safeString(getCell(row, "Hour Meter Start 2026")),
    hourMeterUpdate: safeString(getCell(row, "Hour meter update?")),
    dateOfUpdate: parseCsvDate(getCell(row, "Date of Update")),
    hourMeterEnd2026: safeString(getCell(row, "Hour meter end 2026")),
    currentYtd: safeString(getCell(row, "Current YTD")),
    lessThan200Hours: safeString(getCell(row, "Less Than 200hrs")),
    description: "Equipment",
    category: "Equipment",
    status: "Working",
  };
}

export default function AssetManagerPage({
  assetType,
  title,
  description,
}: {
  assetType: EquipmentItem["assetType"];
  title: string;
  description: string;
}) {
  const [jobs, setJobs] = useState<AppData["jobs"]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allAssets, setAllAssets] = useState<EquipmentItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<EquipmentItem, "id">>(
    makeEmptyEquipmentForm(assetType)
  );
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [jobsRes, assetsRes] = await Promise.all([
          fetch("/api/jobs", { cache: "no-store" }),
          fetch(`/api/assets?assetType=${encodeURIComponent(assetType)}`, {
            cache: "no-store",
          }),
        ]);

        const jobsData = jobsRes.ok ? await jobsRes.json() : [];
        const assetsData = assetsRes.ok ? await assetsRes.json() : [];

        setJobs(Array.isArray(jobsData) ? jobsData : []);
        setAllAssets(Array.isArray(assetsData) ? assetsData : []);
      } catch (error) {
        console.error("Loading assets failed:", error);
        setJobs([]);
        setAllAssets([]);
      }
    }

    loadData();
  }, [assetType]);

  const jobOptions = useMemo(() => {
    return dedupeStrings([
      ...jobs.map((job) => job.jobNumber).sort(),
      ...EXTRA_JOB_OPTIONS,
    ]).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const employeeOptions = useMemo(() => {
  return [...employees]
    .filter((employee) => employee.name?.trim())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((employee) => employee.name);
}, [employees]);

  const rows = useMemo(
    () => allAssets.filter((item) => item.assetType === assetType),
    [allAssets, assetType]
  );

  const assignedCount = useMemo(
    () =>
      rows.filter(
        (x) =>
          safeString(x.jobNumber) !== "" ||
          safeString(x.assignedTo) !== "" ||
          isStorageLocation(x.toolRoomLocation)
      ).length,
    [rows]
  );

  const damagedCount = useMemo(
    () => rows.filter((x) => x.status === "Damaged").length,
    [rows]
  );

  function resetForm() {
    setForm(makeEmptyEquipmentForm(assetType));
    setEditingId(null);
  }

  async function reloadAssets() {
    const response = await fetch(`/api/assets?assetType=${encodeURIComponent(assetType)}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Failed to load assets");
    const data = await response.json();
    setAllAssets(Array.isArray(data) ? data : []);
  }

  async function handleSave() {
    const hasMinimumData =
      safeString(form.assetNumber) ||
      safeString(form.description) ||
      safeString(form.licensePlate) ||
      safeString(form.vinSerial) ||
      safeString(form.manufacturer) ||
      safeString(form.model);

    if (!hasMinimumData) {
      alert(
        "Enter at least an asset number, description, plate, VIN/serial, manufacturer, or model."
      );
      return;
    }

    const nextAssignmentType = normalizeAssignmentType(
      safeString(form.jobNumber),
      safeString(form.assignedTo),
      safeString(form.assignmentType)
    );

    const payload: Omit<EquipmentItem, "id"> = {
      ...form,
      assetType,
      jobNumber: nextAssignmentType === "Job" ? safeString(form.jobNumber) : "",
      assignedTo: nextAssignmentType === "Person" ? safeString(form.assignedTo) : "",
      assignmentType: nextAssignmentType,
      toolRoomLocation: isStorageLocation(safeString(form.jobNumber))
        ? safeString(form.jobNumber)
        : nextAssignmentType === "Tool Room" ||
          nextAssignmentType === "Shop" ||
          nextAssignmentType === "Yard" ||
          nextAssignmentType === "WH1" ||
          nextAssignmentType === "WH2"
        ? nextAssignmentType
        : "",
      description: form.description || assetType,
      category: form.category || assetType,
      status: form.status === "Damaged" ? "Damaged" : "Working",
    };

    try {
      setIsBusy(true);

      const response =
        editingId !== null
          ? await fetch(`/api/assets/${editingId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/assets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      if (!response.ok) {
        throw new Error(editingId !== null ? "Failed to update asset" : "Failed to create asset");
      }

      await reloadAssets();
      resetForm();
    } catch (error) {
      console.error("Saving asset failed:", error);
      alert("Failed to save asset.");
    } finally {
      setIsBusy(false);
    }
  }

  function handleEdit(row: EquipmentItem) {
    const editLocation =
      row.assignmentType === "Job"
        ? safeString(row.jobNumber)
        : row.assignmentType === "Person"
        ? ""
        : safeString(row.toolRoomLocation) || safeString(row.assignmentType);

    setForm({
      assetType: row.assetType,
      quantityAvailable: Number(row.quantityAvailable) || 0,
      assetNumber: safeString(row.assetNumber),
      jobNumber: editLocation,
      assignedTo: safeString(row.assignedTo),
      assignmentType: row.assignmentType,
      toolRoomLocation: safeString(row.toolRoomLocation),
      year: safeString(row.year),
      manufacturer: safeString(row.manufacturer),
      model: safeString(row.model),
      modelNumber: safeString(row.modelNumber),
      description: safeString(row.description),
      category: safeString(row.category),
      itemNumber: safeString(row.itemNumber),
      barcode: safeString(row.barcode),
      serialNumber: safeString(row.serialNumber),
      licensePlate: safeString(row.licensePlate),
      vinSerial: safeString(row.vinSerial),
      engineSerialNumber: safeString(row.engineSerialNumber),
      ein: safeString(row.ein),
      gvwr: safeString(row.gvwr),
      driverProject: safeString(row.driverProject),
      indexNumber: safeString(row.indexNumber),
      purchaseCost: safeString(row.purchaseCost),
      purchaseDate: safeString(row.purchaseDate),
      tier: safeString(row.tier),
      lowUse: safeString(row.lowUse),
      samsara: safeString(row.samsara),
      powered: safeString(row.powered),
      hourMeterStart2026: safeString(row.hourMeterStart2026),
      hourMeterUpdate: safeString(row.hourMeterUpdate),
      dateOfUpdate: safeString(row.dateOfUpdate),
      hourMeterEnd2026: safeString(row.hourMeterEnd2026),
      currentYtd: safeString(row.currentYtd),
      lessThan200Hours: safeString(row.lessThan200Hours),
      transferDateIn: safeString(row.transferDateIn),
      transferDateOut: safeString(row.transferDateOut),
      status: row.status === "Damaged" ? "Damaged" : "Working",
      notes: safeString(row.notes),
    });

    setEditingId(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    try {
      setIsBusy(true);

      const response = await fetch(`/api/assets/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete asset");
      }

      await reloadAssets();

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error("Deleting asset failed:", error);
      alert("Failed to delete asset.");
    } finally {
      setIsBusy(false);
    }
  }

  function importFleetCsv(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<unknown[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          setIsBusy(true);

          const rawMatrix = Array.isArray(results.data) ? results.data : [];
          const parsedRows = parseFleetCsvRows(rawMatrix);

          if (!parsedRows.length) {
            alert(`No valid ${assetType.toLowerCase()} rows found in the CSV file.`);
            return;
          }

          const imported = parsedRows
            .filter((row) => {
              if (assetType === "Trailer") {
                return (
                  safeString(getCell(row, "TRAILER #")) ||
                  safeString(getCell(row, "VIN")) ||
                  safeString(getCell(row, "LICENSE PLATE"))
                );
              }

              if (assetType === "Vehicle") {
                return (
                  safeString(getCell(row, "VEHICLE #")) ||
                  safeString(getCell(row, "VIN")) ||
                  safeString(getCell(row, "LICENSE PLATE"))
                );
              }

              return (
                safeString(getCell(row, "EQUIPMENT #")) ||
                safeString(getCell(row, "VIN/SERIAL")) ||
                safeString(getCell(row, "LICENSE"))
              );
            })
            .map((row) => parseImportedFleetEquipmentRow(row, assetType));

          if (!imported.length) {
            alert(`No usable ${assetType.toLowerCase()} rows found after parsing.`);
            return;
          }

          const { toCreate, toUpdate } = mergeImportedEquipment(rows, imported);

          for (const row of toUpdate) {
            const response = await fetch(`/api/assets/${row.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...row,
              }),
            });

            if (!response.ok) {
              throw new Error(`Failed to update asset ${row.assetNumber || row.id}`);
            }
          }

          for (const row of toCreate) {
            const response = await fetch("/api/assets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(row),
            });

            if (!response.ok) {
              throw new Error(`Failed to create asset ${row.assetNumber || ""}`);
            }
          }

          await reloadAssets();

          alert(
            `Imported ${imported.length} ${assetType.toLowerCase()} row(s). Created ${toCreate.length}, updated ${toUpdate.length}.`
          );
        } catch (error) {
          console.error(`${assetType} CSV import failed:`, error);
          alert(`Failed to import ${assetType.toLowerCase()} CSV file.`);
        } finally {
          setIsBusy(false);
        }
      },
      error: (error) => {
        console.error(`${assetType} CSV parse failed:`, error);
        alert(`Failed to read ${assetType.toLowerCase()} CSV file.`);
      },
    });

    event.target.value = "";
  }

  function exportAssetsReport() {
    const csvRows = [
      [
        "Asset Type",
        "Asset Number",
        "Job / Project",
        "Assigned To",
        "Assignment Type",
        "Location",
        "Driver / Project",
        "Year",
        "Manufacturer",
        "Model",
        "License Plate",
        "VIN / Serial",
        "Status",
        "Notes",
      ],
      ...rows.map((item) => [
        item.assetType,
        item.assetNumber,
        item.jobNumber,
        item.assignedTo,
        item.assignmentType,
        item.toolRoomLocation,
        item.driverProject,
        item.year,
        item.manufacturer,
        item.model,
        item.licensePlate,
        item.vinSerial,
        item.status,
        item.notes,
      ]),
    ];

    const csv = csvRows
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asset-report-${assetType.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const activeKey =
    assetType === "Trailer"
      ? "trailers"
      : assetType === "Vehicle"
      ? "vehicles"
      : "equipment";

  return (
    <AppShell
      title={title}
      subtitle={description}
      active={activeKey}
      actions={
        <>
          <label
            style={{
              ...buttonStyle,
              opacity: isBusy ? 0.7 : 1,
              cursor: isBusy ? "not-allowed" : "pointer",
            }}
          >
            {isBusy ? "Working..." : `Import ${title} CSV`}
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={importFleetCsv}
              style={{ display: "none" }}
              disabled={isBusy}
            />
          </label>

          <button
            type="button"
            onClick={exportAssetsReport}
            style={buttonStyle}
            disabled={isBusy}
          >
            Export {title} Report
          </button>
        </>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <StatCard title={title} value={String(rows.length)} />
        <StatCard title="Assigned" value={String(assignedCount)} />
        <StatCard title="Damaged" value={String(damagedCount)} />
      </div>

      <Section
        title={editingId !== null ? `Edit ${assetType}` : `Add ${assetType}`}
        collapsible
        defaultOpen={false}
      >
        <EquipmentForm
          form={form}
          setForm={setForm}
          editingId={editingId}
          onSave={handleSave}
          onCancel={resetForm}
          existingEquipment={rows}
          jobOptions={jobOptions}
          employeeOptions={employeeOptions}
        />
      </Section>

      <Section title={`${title} List`} collapsible defaultOpen>
        <EquipmentTable rows={rows} onEdit={handleEdit} onDelete={handleDelete} />
      </Section>
    </AppShell>
  );
}