import API from "./api";

// Telecaller
export const getLeads = (params) => API.get("/telecalling/leads", { params });
export const createLead = (payload) => API.post("/telecalling/leads", payload);
export const updateLead = (id, payload) => API.put(`/telecalling/leads/${id}`, payload);
export const logCall = (leadId, payload) => API.post(`/telecalling/leads/${leadId}/calls`, payload);
export const getCalls = (params) => API.get("/telecalling/calls", { params });
export const getMyTelecallingStats = (params) => API.get("/telecalling/stats", { params });
export const getBookedMeetings = (scope) => API.get("/telecalling/meetings/booked", { params: { scope } });
export const getSalesPeople = () => API.get("/telecalling/sales-people");

// Sales
export const getAssignedMeetings = (scope) => API.get("/telecalling/meetings/assigned", { params: { scope } });
export const updateMeetingStatus = (id, payload) => API.put(`/telecalling/meetings/${id}/status`, payload);
// Sales person / sales manager: add a meeting yourself (e.g. found on the spot).
export const createOwnMeeting = (payload) => API.post("/telecalling/meetings", payload);

// Sales manager (and super admin): give a booked meeting to a sales person.
export const assignMeeting = (id, payload) => API.put(`/telecalling/meetings/${id}/assign`, payload);

// Super admin
export const getTelecallingOverview = (params) => API.get("/telecalling/admin/overview", { params });
export const getAdminClientMeetings = (params) => API.get("/telecalling/admin/meetings", { params });
