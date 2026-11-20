const Client = require("../models/Client");
const Contract = require("../models/Contract");
const PaymentReminder = require("../models/PaymentReminder");

/**
 * Row-level access for non-admin roles on client-scoped routes.
 *
 * Role gates (requireRole) only say "sales may use this route"; they don't
 * say "…for their own clients". Without this, any sales person could read or
 * change another sales person's contracts, payments, deliverables and
 * reminders just by knowing the id. Admin (and any role not listed below)
 * passes straight through — this only ever narrows sales/user access.
 */
const OWNER_FIELD_BY_ROLE = {
  sales: "salesPerson",
  user: "assignedUser",
};

function ownerFilter(user) {
  const field = OWNER_FIELD_BY_ROLE[user?.role];
  return field ? { [field]: user.id } : null;
}

/** Ids of every client the user owns, or null when the role isn't restricted (admin). */
async function getOwnedClientIds(user) {
  const filter = ownerFilter(user);
  if (!filter) return null;
  return Client.distinct("_id", filter);
}

function deny(res) {
  return res.status(403).json({ message: "You can only access your own clients" });
}

/**
 * Builds a middleware that resolves the client a request targets (via
 * `resolveClientIds(req)`, which may return one id or an array) and rejects
 * restricted roles that don't own every one of them.
 */
function requireOwnClient(resolveClientIds) {
  return async (req, res, next) => {
    const filter = ownerFilter(req.user);
    if (!filter) return next();
    try {
      const resolved = await resolveClientIds(req);
      const ids = (Array.isArray(resolved) ? resolved : [resolved]).filter(Boolean).map(String);
      if (!ids.length) return deny(res);
      const owned = await Client.countDocuments({ _id: { $in: ids }, ...filter });
      return owned === new Set(ids).size ? next() : deny(res);
    } catch {
      // Malformed ids (CastError) or a missing record — same answer as not owned.
      return deny(res);
    }
  };
}

const clientFromParam = (req) => req.params.id;
const clientFromBody = (req) => req.body?.clientId;
const clientsFromBodyIds = (req) => req.body?.ids;
const clientFromContractParam = async (req) =>
  (await Contract.findById(req.params.id).select("clientId").lean())?.clientId;
const clientFromReminderParam = async (req) =>
  (await PaymentReminder.findById(req.params.id).select("clientId").lean())?.clientId;

module.exports = {
  getOwnedClientIds,
  ownClient: requireOwnClient(clientFromParam),
  ownClientInBody: requireOwnClient(clientFromBody),
  ownClientsInBody: requireOwnClient(clientsFromBodyIds),
  ownContract: requireOwnClient(clientFromContractParam),
  ownReminder: requireOwnClient(clientFromReminderParam),
};
