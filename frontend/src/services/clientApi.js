import axios from "axios";

const API = axios.create({
  baseURL: "https://crm.cybertricksmedia.in/api",
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

// ============= PROPOSAL OPERATIONS =============

export const createProposal = (proposalData) =>
  API.post("/clients/proposals/create", proposalData);

export const getAllProposals = (clientId = null) => {
  const url = clientId ? `/clients/proposals/all?clientId=${clientId}` : "/clients/proposals/all";
  return API.get(url);
};

export const getProposalById = (proposalId) =>
  API.get(`/clients/proposals/${proposalId}`);

export const sendProposal = (proposalId) =>
  API.post(`/clients/proposals/${proposalId}/send`);

export const updateProposal = (proposalId, updateData) =>
  API.put(`/clients/proposals/${proposalId}`, updateData);

export const deleteProposal = (proposalId) =>
  API.delete(`/clients/proposals/${proposalId}`);

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
