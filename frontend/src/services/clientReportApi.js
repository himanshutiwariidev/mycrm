import API from "./api";

/**
 * Monthly client reports per contract service (PDF / Word / Excel / CSV files
 * or Google Sheet links). Files are private: downloaded through the API.
 */
export const REPORT_FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv";

export const listClientReports = (clientId) => API.get("/client-reports", { params: { clientId } });

export function addClientReport({ clientId, contractId, categoryId, period, file, link, note }) {
  const form = new FormData();
  form.append("clientId", clientId);
  form.append("contractId", contractId);
  form.append("categoryId", categoryId);
  form.append("period", period);
  if (note) form.append("note", note);
  if (link) form.append("link", link);
  if (file) form.append("file", file, file.name);
  return API.post("/client-reports", form, { headers: { "Content-Type": "multipart/form-data" } });
}

export const deleteClientReport = (reportId) => API.delete(`/client-reports/${reportId}`);

/** Downloads a report file (authenticated) and saves it under its original name. */
export async function downloadClientReport(report) {
  const { data } = await API.get(`/client-reports/${report._id}/download`, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = report.originalname || `report.${report.format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
