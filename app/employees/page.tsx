"use client";

import { useEffect, useMemo, useState } from "react";
import Section from "@/components/Section";
import InputBlock, { inputStyle } from "@/components/InputBlock";
import {
  buttonStyle,
  secondaryButtonStyle,
  formGrid,
  tableStyle,
  Th,
  Td,
  TableWrapper,
  ActionButtons,
} from "@/components/TableBits";
import type { Employee } from "@/types";

const STORAGE_KEY = "prefab-tracker-v7";

type AppDataShape = {
  employees?: Employee[];
  [key: string]: unknown;
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        setEmployees([]);
        setLoadError("");
        return;
      }

      const parsed: AppDataShape = JSON.parse(stored);
      const employeeRows = Array.isArray(parsed.employees) ? parsed.employees : [];

      const cleaned = employeeRows
        .filter((row) => row && typeof row === "object")
        .map((row) => ({
          id: Number(row.id) || Date.now() + Math.floor(Math.random() * 100000),
          name: String(row.name ?? "").trim(),
          email: String(row.email ?? "").trim(),
          phone: String(row.phone ?? "").trim(),
        }))
        .filter((row) => row.name);

      setEmployees(cleaned);
      setLoadError("");
    } catch (error) {
      console.error("Failed to load employees:", error);
      setEmployees([]);
      setLoadError("Failed to load employees");
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed: AppDataShape = stored ? JSON.parse(stored) : {};
      parsed.employees = employees;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch (error) {
      console.error("Failed to save employees:", error);
    }
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;

    return employees.filter((employee) => {
      return (
        employee.name.toLowerCase().includes(term) ||
        String(employee.email ?? "").toLowerCase().includes(term) ||
        String(employee.phone ?? "").toLowerCase().includes(term)
      );
    });
  }, [employees, search]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function handleSaveEmployee() {
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!name) {
      alert("Employee name is required.");
      return;
    }

    const duplicate = employees.find(
      (employee) =>
        employee.name.trim().toLowerCase() === name.toLowerCase() &&
        employee.id !== editingId
    );

    if (duplicate) {
      alert("An employee with that name already exists.");
      return;
    }

    if (editingId !== null) {
      setEmployees((prev) =>
        prev.map((employee) =>
          employee.id === editingId
            ? {
                ...employee,
                name,
                email,
                phone,
              }
            : employee
        )
      );
    } else {
      setEmployees((prev) => [
        ...prev,
        {
          id: Date.now(),
          name,
          email,
          phone,
        },
      ]);
    }

    resetForm();
  }

  function handleEditEmployee(employee: Employee) {
    setForm({
      name: employee.name ?? "",
      email: employee.email ?? "",
      phone: employee.phone ?? "",
    });
    setEditingId(employee.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDeleteEmployee(id: number) {
    const employee = employees.find((row) => row.id === id);
    const confirmed = window.confirm(
      `Delete employee${employee?.name ? ` "${employee.name}"` : ""}?`
    );
    if (!confirmed) return;

    setEmployees((prev) => prev.filter((employee) => employee.id !== id));

    if (editingId === id) {
      resetForm();
    }
  }

  function handleClearAllEmployees() {
    if (employees.length === 0) return;

    const confirmed = window.confirm(
      "Delete all employees? This will remove the employee list from the app."
    );
    if (!confirmed) return;

    setEmployees([]);
    resetForm();
  }

  async function handleImportEmployees(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        alert("The CSV file is empty or missing data rows.");
        e.target.value = "";
        return;
      }

      const dataLines = lines.slice(1);

      const importedRows = dataLines
        .map((line, index) => {
          const parts = line.split(",").map((part) =>
            part.replace(/^"|"$/g, "").trim()
          );

          return {
            id: Date.now() + index,
            name: parts[0] ?? "",
            email: parts[1] ?? "",
            phone: parts[2] ?? "",
          };
        })
        .filter((row) => row.name);

      if (importedRows.length === 0) {
        alert("No valid employees were found in the file.");
        e.target.value = "";
        return;
      }

      setEmployees((prev) => {
        const existingByName = new Set(
          prev.map((employee) => employee.name.trim().toLowerCase())
        );

        const uniqueImports = importedRows.filter((row) => {
          const key = row.name.trim().toLowerCase();
          if (!key || existingByName.has(key)) return false;
          existingByName.add(key);
          return true;
        });

        if (uniqueImports.length === 0) {
          alert("All imported employees already exist.");
          return prev;
        }

        return [...prev, ...uniqueImports];
      });
    } catch (error) {
      console.error("Failed to import employees:", error);
      alert("Failed to import employees.");
    }

    e.target.value = "";
  }

  function downloadEmployeeTemplate() {
    const csv = [
      "name,email,phone",
      "John Doe,john.doe@email.com,555-555-5555",
      "Jane Smith,jane.smith@email.com,555-555-1111",
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employee-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 28 }}>Employees</h1>
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          Manage the employee list used across request forms and dropdowns.
        </p>
        {loadError ? (
          <p style={{ color: "#fca5a5", fontWeight: 700 }}>{loadError}</p>
        ) : null}
      </div>

      <Section title={editingId !== null ? "Edit Employee" : "Add Employee"} defaultOpen>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={formGrid}>
            <InputBlock label="Employee Name">
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                style={inputStyle}
                placeholder="Enter employee name"
              />
            </InputBlock>

            <InputBlock label="Email">
              <input
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                style={inputStyle}
                placeholder="Enter email"
              />
            </InputBlock>

            <InputBlock label="Phone">
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                style={inputStyle}
                placeholder="Enter phone number"
              />
            </InputBlock>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={handleSaveEmployee} style={buttonStyle}>
              {editingId !== null ? "Update Employee" : "Add Employee"}
            </button>

            <button type="button" onClick={resetForm} style={secondaryButtonStyle}>
              Cancel
            </button>
          </div>
        </div>
      </Section>

      <Section title="Import / Tools" defaultOpen>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ cursor: "pointer" }}>
            <input
              type="file"
              accept=".csv"
              onChange={handleImportEmployees}
              style={{ display: "none" }}
            />
            <span style={buttonStyle}>Import Employees</span>
          </label>

          <button
            type="button"
            onClick={downloadEmployeeTemplate}
            style={secondaryButtonStyle}
          >
            Download Template
          </button>

          <button
            type="button"
            onClick={handleClearAllEmployees}
            style={secondaryButtonStyle}
          >
            Clear All Employees
          </button>
        </div>

        <p style={{ marginTop: 12, opacity: 0.75 }}>
          CSV columns should be: <strong>name,email,phone</strong>
        </p>
      </Section>

      <Section title="Employee List" defaultOpen>
        <div style={{ display: "grid", gap: 16 }}>
          <InputBlock label="Search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle}
              placeholder="Search employees"
            />
          </InputBlock>

          <TableWrapper>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <Td colSpan={4}>No employees found.</Td>
                  </tr>
                ) : (
                  filteredEmployees
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((employee) => (
                      <tr key={employee.id}>
                        <Td>{employee.name}</Td>
                        <Td>{employee.email || "-"}</Td>
                        <Td>{employee.phone || "-"}</Td>
                        <Td>
                          <ActionButtons
                            onEdit={() => handleEditEmployee(employee)}
                            onDelete={() => handleDeleteEmployee(employee.id)}
                          />
                        </Td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </TableWrapper>
        </div>
      </Section>
    </div>
  );
}