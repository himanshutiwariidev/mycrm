import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://crm.cybertricksmedia.in/api",
});

// Attach token automatically
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// ============= CLIENT OPERATIONS =============

export const createClient = (clientData) =>
  API.post("/clients", clientData);

export const getAllClients = () =>
  API.get("/clients");

export const getClientById = (clientId) =>
  API.get(`/clients/${clientId}`);

export const updateClient = (clientId, updateData) =>
  API.put(`/clients/${clientId}`, updateData);

export const deleteClient = (clientId) =>
  API.delete(`/clients/${clientId}`);

export const getClientActivity = (clientId) =>
  API.get(`/clients/${clientId}/activity`);

export const getUsersByRole = (role) =>
  API.get(`/users/by-role/${role}`);

export const assignUserToClient = (clientId, userId) =>
  API.put(`/clients/${clientId}/assign`, { userId });

export const getClientRemarks = (clientId) =>
  API.get(`/clients/${clientId}/remarks`);

export const addClientRemark = (clientId, message) =>
  API.post(`/clients/${clientId}/remarks`, { message });

export const getWorkProgress = (clientId) =>
  API.get(`/clients/${clientId}/work-progress`);

export const addWorkProgress = (clientId, payload) =>
  API.post(`/clients/${clientId}/work-progress`, payload);

export const updateWorkProgress = (clientId, entryId, payload) =>
  API.put(`/clients/${clientId}/work-progress/${entryId}`, payload);

export const uploadPiAttachment = (clientId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return API.post(`/clients/${clientId}/pi-attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const deletePiAttachment = (clientId, attachmentId) =>
  API.delete(`/clients/${clientId}/pi-attachments/${attachmentId}`);

// ============= CONTRACT OPERATIONS =============

export const createContract = (contractData) =>
  API.post("/clients/contracts/create", contractData);

export const getAllContracts = (clientId = null) => {
  const url = clientId ? `/clients/contracts/all?clientId=${clientId}` : "/clients/contracts/all";
  return API.get(url);
};

export const getContractById = (contractId) =>
  API.get(`/clients/contracts/${contractId}`);

export const sendContract = (contractId) =>
  API.post(`/clients/contracts/${contractId}/send`);

export const updateContract = (contractId, updateData) =>
  API.put(`/clients/contracts/${contractId}`, updateData);

export const deleteContract = (contractId) =>
  API.delete(`/clients/contracts/${contractId}`);

export const downloadInvoice = async (contractId, fileName = "invoice.pdf") => {
  const response = await API.get(`/clients/contracts/${contractId}/invoice`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ============= DELIVERABLES OPERATIONS =============

export const addDeliverable = (contractId, deliverableData) =>
  API.post(`/clients/contracts/${contractId}/deliverables`, deliverableData);

export const updateDeliverable = (contractId, deliverableId, updateData) =>
  API.put(`/clients/contracts/${contractId}/deliverables/${deliverableId}`, updateData);

export const deleteDeliverable = (contractId, deliverableId) =>
  API.delete(`/clients/contracts/${contractId}/deliverables/${deliverableId}`);

// ============= PAYMENT OPERATIONS =============

export const addPayment = (contractId, paymentData) =>
  API.post(`/clients/contracts/${contractId}/payments`, paymentData);

// ============= CONTRACT PI (PROFORMA INVOICE) =============

export const uploadContractPi = (contractId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return API.post(`/clients/contracts/${contractId}/pi`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const deleteContractPi = (contractId) =>
  API.delete(`/clients/contracts/${contractId}/pi`);

// ============= DASHBOARD STATS =============

export const getDashboardStats = () =>
  API.get("/clients/dashboard-stats");

// ============= PAYMENT REMINDER OPERATIONS =============

export const createPaymentReminder = (reminderData) =>
  API.post("/clients/reminders/create", reminderData);

export const getAllReminders = (clientId = null) => {
  const url = clientId ? `/clients/reminders/all?clientId=${clientId}` : "/clients/reminders/all";
  return API.get(url);
};

export const sendPaymentReminder = (reminderId) =>
  API.post(`/clients/reminders/${reminderId}/send`);

export const updatePaymentReminder = (reminderId, updateData) =>
  API.put(`/clients/reminders/${reminderId}`, updateData);

export const deletePaymentReminder = (reminderId) =>
  API.delete(`/clients/reminders/${reminderId}`);

// ============= CLIENT PORTAL (role: "client") =============

export const getMyProject = () =>
  API.get("/clients/my-project");
