const Client = require("../models/Client");
const Contract = require("../models/Contract");
const PaymentReminder = require("../models/PaymentReminder");
const User = require("../models/User");

/**
 * Row-level access for non-admin roles on client-scoped routes.
 *
 * Role gates (requireRole) only say "sales may use this route"; they don't
 * say "…for their own clients". Without this, any sales person could read or
 * change another sales person's contracts, payments, deliverables and
 * reminders just by knowing the id. Admin (and any role not listed below)
 * passes straight through — this only ever narrows sales/user/sales-manager access.
 *
 * Sales manager: the whole sales team's clients, but never the clients a super
 * admin handles personally (an admin set as the client's sales person) — those,
 * and everything under them, stay private to the admins.
 */
const OWNER_FIELD_BY_ROLE = {
  sales: "salesPerson",
  user: "assignedUser",
};

/** Admins who can be a client's sales person — their clients are hidden from the sales manager. */
function privateOwnerIds() {
  return User.distinct("_id", { role: "admin" });
}

/** Mongo filter on Client for what this user may see, or null when unrestricted (admin). */
async function ownerFilter(user) {
  if (user?.role === "salesmanager") return { salesPerson: { $nin: await privateOwnerIds() } };
  const field = OWNER_FIELD_BY_ROLE[user?.role];
  return field ? { [field]: user.id } : null;
}

/** Ids of every client the user may see, or null when the role isn't restricted (admin). */
async function getOwnedClientIds(user) {
  const filter = await ownerFilter(user);
  if (!filter) return null;
  return Client.distinct("_id", filter);
}

/**
 * Clients a sales manager must not see (the ones a super admin handles
 * personally) — for collections keyed by clientId (meetings, visits, leads).
 * Empty for every other role.
 */
async function hiddenClientIds(user) {
  if (user?.role !== "salesmanager") return [];
  return Client.distinct("_id", { salesPerson: { $in: await privateOwnerIds() } });
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
    const filter = await ownerFilter(req.user);
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
  clientFilterFor: ownerFilter,
  privateOwnerIds,
  hiddenClientIds,
  // Only narrows the sales manager (others are checked in the controller).
  salesManagerClient: (req, res, next) => (req.user?.role === "salesmanager" ? requireOwnClient(clientFromParam)(req, res, next) : next()),
  ownClient: requireOwnClient(clientFromParam),
  ownClientInBody: requireOwnClient(clientFromBody),
  ownClientsInBody: requireOwnClient(clientsFromBodyIds),
  ownContract: requireOwnClient(clientFromContractParam),
  ownReminder: requireOwnClient(clientFromReminderParam),
};
