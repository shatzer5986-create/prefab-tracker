import Link from "next/link";
import { Job } from "@/types";
import { TableWrapper, Th, Td, ActionButtons, tableStyle } from "./TableBits";

export default function JobsTable({
  jobs,
  onEdit,
  onDelete,
}: {
  jobs: Job[];
  onEdit: (job: Job) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <TableWrapper>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Job #</Th>
            <Th>Name</Th>
            <Th>Customer</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>

        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <Td>{job.jobNumber}</Td>
              <Td>{job.name}</Td>
              <Td>{job.customer}</Td>
              <Td>{job.status}</Td>
              <Td>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <ActionButtons
                    onEdit={() => onEdit(job)}
                    onDelete={() => onDelete(job.id)}
                  />
                  <Link
                    href={`/jobs/${encodeURIComponent(job.jobNumber)}`}
                    style={{
                      background: "#0369a1",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 700,
                      textDecoration: "none",
                      display: "inline-block",
                    }}
                  >
                    View Job
                  </Link>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}
