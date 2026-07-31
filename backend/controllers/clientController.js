const bcrypt = require("bcryptjs");
const Client = require("../models/Client");
const Contract = require("../models/Contract");
const PaymentReminder = require("../models/PaymentReminder");
const User = require("../models/User");
const clientService = require("../services/clientService");
const { computeDeliverableStats, decorateContract } = require("../utils/deliverableStats");
const { logActivity } = require("../utils/activityLogger");
const ActivityLog = require("../models/ActivityLog");
const { computeLeafFinalPrice, SERVICE_CATEGORY_LABELS } = require("../utils/pricingHelpers");

// ============= CLIENT OPERATIONS =============

exports.createClient = async (req, res) => {
  try {
    const { clientName, email, phone, companyName, gstNo,tanNo,salesPerson,leadSource,clientType,projectType, projectName, address, city, state, country, zipCode, contactPerson, designation, status, activeStatus, notes, password } = req.body;

    if (!clientName || !email || !phone) {
      return res.status(400).json({ message: "Client name, email, and phone are required" });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ message: "Login password must be at least 6 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingClient = await Client.findOne({ email: normalizedEmail });
    if (existingClient) {
      return res.status(400).json({ message: "Client with this email already exists" });
    }

    if (password) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
    }

    // Sales Person assignment:
    //  - Admin (or any other role reaching this endpoint): use whatever was
    //    selected in the form, unchanged — including left blank.
    //  - Sales: always force-assign to themselves, regardless of what (if
    //    anything) was submitted. A salesperson can only ever onboard clients
    //    under their own name, so this also closes off the client showing up
    //    with no owner — or the wrong owner — on their own Sales Dashboard.
    const assignedSalesPerson = req.user.role === "sales" ? req.user.id : salesPerson;

    const client = await Client.create({
      clientName,
      email: normalizedEmail,
      phone,
      companyName,
      gstNo,
      tanNo,
      salesPerson: assignedSalesPerson,
      leadSource,
      clientType,
      projectType,
      projectName,
      address,
      city,
      state,
      country,
      zipCode,
      contactPerson,
      designation,
      status: status || undefined,
      activeStatus: activeStatus || undefined,
      notes,
      onboardedAt: new Date(),
    });

    await logActivity(client._id, "client_created", `Client "${clientName}" was onboarded`, { salesPerson: assignedSalesPerson, leadSource, status: client.status });

    if (password) {
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
          name: clientName,
          email: normalizedEmail,
          password: hashedPassword,
          role: "client",
          clientId: client._id,
        });
        await logActivity(client._id, "portal_enabled", "Client portal access was enabled");
      } catch (userError) {
        // Roll back the client so we never leave an orphan client without its requested login account
        await Client.findByIdAndDelete(client._id);
        console.error("Error creating linked client-login user:", userError);
        return res.status(500).json({ message: userError.message || "Failed to create client login account" });
      }
    }

    return res.status(201).json({ message: "Client onboarded successfully", client });
  } catch (error) {
    console.error("Error creating client:", error);
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Client with this email already exists" });
    }
    return res.status(500).json({ message: error.message || "Failed to create client" });
  }
};

exports.getAllClients = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "sales") {
      filter.salesPerson = req.user.id;
    } else if (req.user.role === "user") {
      filter.assignedUser = req.user.id;
    }

    const clients = await Client.find(filter)
      .populate("salesPerson", "name email")
      .populate("assignedUser", "name email")
      .sort({ createdAt: -1 });
    const linkedUserClientIds = new Set(
      (await User.find({ role: "client" }).select("clientId")).map((u) => String(u.clientId))
    );
    const clientsWithLoginInfo = clients.map((client) => ({
      ...client.toObject(),
      hasLoginAccess: linkedUserClientIds.has(String(client._id)),
    }));

    return res.json({ clients: clientsWithLoginInfo, total: clients.length });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch clients" });
  }
};

exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate("salesPerson", "name email")
      .populate("assignedUser", "name email")
      .populate("assignedBy", "name email")
      .populate("remarks.user", "name")
      .populate("workProgress.updatedBy", "name")
      .populate("piAttachments.uploadedBy", "name");
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    if (req.user.role === "sales" && String(client.salesPerson?._id) !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (req.user.role === "user" && String(client.assignedUser?._id) !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const contracts = await Contract.find({ clientId: req.params.id }).sort({ createdAt: -1 });
    const reminders = await PaymentReminder.find({ clientId: req.params.id }).sort({ createdAt: -1 });
    const linkedUser = await User.findOne({ clientId: req.params.id });

    return res.json({
      client: { ...client.toObject(), hasLoginAccess: Boolean(linkedUser) },
      contracts: contracts.map(decorateContract),
      reminders,
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch client" });
  }
};

exports.assignUserToClient = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const assignedUser = await User.findOne({ _id: userId, role: "user" });
    if (!assignedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { assignedUser: userId, assignedBy: req.user.id, assignedDate: new Date() },
      { new: true, runValidators: true }
    ).populate("assignedUser", "name email");

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    await logActivity(client._id, "user_assigned", `${assignedUser.name} was assigned to this client`);

    return res.json({ message: "User assigned successfully", client });
  } catch (error) {
    console.error("Error assigning user to client:", error);
    return res.status(500).json({ message: error.message || "Failed to assign user" });
  }
};

const canAccessClientRemarksOrProgress = (client, user) => {
  if (user.role === "admin") return true;
  if (client.salesPerson && String(client.salesPerson._id || client.salesPerson) === user.id) return true;
  if (client.assignedUser && String(client.assignedUser._id || client.assignedUser) === user.id) return true;
  return false;
};

exports.getRemarks = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate("remarks.user", "name");
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    if (!canAccessClientRemarksOrProgress(client, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const remarks = [...client.remarks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ remarks, total: remarks.length });
  } catch (error) {
    console.error("Error fetching remarks:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch remarks" });
  }
};

exports.addRemark = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Remark message is required" });
    }

    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    if (!canAccessClientRemarksOrProgress(client, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    client.remarks.push({ user: req.user.id, role: req.user.role, message: message.trim() });
    await client.save();
    await client.populate("remarks.user", "name");

    await logActivity(client._id, "remark_added", "A new remark was added");

    const remarks = [...client.remarks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.status(201).json({ message: "Remark added successfully", remarks });
  } catch (error) {
    console.error("Error adding remark:", error);
    return res.status(500).json({ message: error.message || "Failed to add remark" });
  }
};

exports.getWorkProgress = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate("workProgress.updatedBy", "name");
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const sorted = [...client.workProgress].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (req.user.role === "client") {
      const linkedUser = await User.findById(req.user.id);
      if (!linkedUser || String(linkedUser.clientId) !== String(client._id)) {
        return res.status(403).json({ message: "Access denied" });
      }
      return res.json({ workProgress: sorted.slice(0, 1), total: Math.min(sorted.length, 1) });
    }

    if (!canAccessClientRemarksOrProgress(client, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.json({ workProgress: sorted, total: sorted.length });
  } catch (error) {
    console.error("Error fetching work progress:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch work progress" });
  }
};

exports.addWorkProgress = async (req, res) => {
  try {
    const { title, description, status, percentage } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const isAssignedUser = client.assignedUser && String(client.assignedUser) === req.user.id;
    if (req.user.role !== "admin" && !isAssignedUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    client.workProgress.push({
      title: title.trim(),
      description,
      status: status || "Pending",
      percentage: percentage ?? 0,
      updatedBy: req.user.id,
      role: req.user.role,
    });
    await client.save();
    await client.populate("workProgress.updatedBy", "name");

    await logActivity(client._id, "progress_updated", `Work progress update: "${title.trim()}"`);

    const sorted = [...client.workProgress].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.status(201).json({ message: "Work progress added successfully", workProgress: sorted });
  } catch (error) {
    console.error("Error adding work progress:", error);
    return res.status(500).json({ message: error.message || "Failed to add work progress" });
  }
};

exports.updateWorkProgress = async (req, res) => {
  try {
    const { title, description, status, percentage } = req.body;

    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const latestEntry = client.workProgress[client.workProgress.length - 1];
    if (!latestEntry || String(latestEntry._id) !== req.params.entryId) {
      return res.status(403).json({ message: "Only the latest work progress entry can be edited" });
    }

    const isOwner = latestEntry.updatedBy && String(latestEntry.updatedBy) === req.user.id;
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (title !== undefined) latestEntry.title = title;
    if (description !== undefined) latestEntry.description = description;
    if (status !== undefined) latestEntry.status = status;
    if (percentage !== undefined) latestEntry.percentage = percentage;

    await client.save();
    await client.populate("workProgress.updatedBy", "name");

    await logActivity(client._id, "progress_updated", `Work progress update edited: "${latestEntry.title}"`);

    const sorted = [...client.workProgress].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ message: "Work progress updated successfully", workProgress: sorted });
  } catch (error) {
    console.error("Error updating work progress:", error);
    return res.status(500).json({ message: error.message || "Failed to update work progress" });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const updatePayload = { ...req.body };

    const password = updatePayload.password;
    delete updatePayload.password;

    if (password && password.length < 6) {
      return res.status(400).json({ message: "Login password must be at least 6 characters" });
    }

    if (updatePayload.email) {
      updatePayload.email = updatePayload.email.toLowerCase().trim();

      const existingClient = await Client.findOne({
        email: updatePayload.email,
        _id: { $ne: req.params.id },
      });
      if (existingClient) {
        return res.status(400).json({ message: "Email is already in use by another client" });
      }
    }

    const previousClient = await Client.findById(req.params.id).select("status activeStatus");

    const client = await Client.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    if (updatePayload.status && previousClient && updatePayload.status !== previousClient.status) {
      await logActivity(client._id, "status_changed", `Status changed from "${previousClient.status}" to "${client.status}"`);
    }
    if (updatePayload.activeStatus && previousClient && updatePayload.activeStatus !== previousClient.activeStatus) {
      await logActivity(client._id, "status_changed", `Marked as ${client.activeStatus}`);
    }
    if (!updatePayload.status && !updatePayload.activeStatus) {
      await logActivity(client._id, "client_updated", "Client details were updated");
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const linkedUser = await User.findOne({ clientId: client._id });

      if (linkedUser) {
        linkedUser.password = hashedPassword;
        linkedUser.email = client.email;
        linkedUser.name = client.clientName;
        await linkedUser.save();
        await logActivity(client._id, "portal_enabled", "Client portal password was reset");
      } else {
        const existingUser = await User.findOne({ email: client.email });
        if (existingUser) {
          return res.status(400).json({ message: "A user with this email already exists" });
        }
        await User.create({
          name: client.clientName,
          email: client.email,
          password: hashedPassword,
          role: "client",
          clientId: client._id,
        });
        await logActivity(client._id, "portal_enabled", "Client portal access was enabled");
      }
    }

    return res.json({ message: "Client updated successfully", client });
  } catch (error) {
    console.error("Error updating client:", error);
    return res.status(500).json({ message: error.message || "Failed to update client" });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Delete related contracts, reminders, activity log, and the linked client-login user
    await Contract.deleteMany({ clientId: req.params.id });
    await PaymentReminder.deleteMany({ clientId: req.params.id });
    await ActivityLog.deleteMany({ clientId: req.params.id });
    await User.deleteOne({ clientId: req.params.id });

    return res.json({ message: "Client and related data deleted successfully" });
  } catch (error) {
    console.error("Error deleting client:", error);
    return res.status(500).json({ message: error.message || "Failed to delete client" });
  }
};

exports.getClientActivity = async (req, res) => {
  try {
    const activity = await ActivityLog.find({ clientId: req.params.id }).sort({ createdAt: -1 });
    return res.json({ activity, total: activity.length });
  } catch (error) {
    console.error("Error fetching client activity:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch client activity" });
  }
};

// ============= CONTRACT OPERATIONS =============

exports.createContract = async (req, res) => {
  try {
    const { clientId, projectName, projectDescription, projectScope, timeline, projectAmount, preTaxAmount, gstEnabled, gstPercent, gstAmount, tdsEnabled, tdsPercent, tdsAmount, currency, paymentTerms, validUntil, notes, deliverables, nextDueDate, selectedServices, pricingSummary, payments } = req.body;

    if (!clientId || !projectName || !projectDescription || !projectAmount) {
      return res.status(400).json({ message: "Missing required fields: clientId, projectName, projectDescription, projectAmount" });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const contractNumber = clientService.buildContractNumber();

    const contract = await Contract.create({
      contractNumber,
      clientId,
      projectName,
      projectDescription,
      projectScope,
      timeline,
      projectAmount,
      preTaxAmount: preTaxAmount ?? projectAmount,
      gstEnabled: gstEnabled || false,
      gstPercent: gstPercent || 0,
      gstAmount: gstAmount || 0,
      tdsEnabled: tdsEnabled || false,
      tdsPercent: tdsPercent || 0,
      tdsAmount: tdsAmount || 0,
      currency: currency || "INR",
      paymentTerms,
      validUntil,
      notes,
      deliverables: deliverables || [],
      nextDueDate,
      selectedServices: selectedServices || [],
      pricingSummary: pricingSummary || {},
      payments: payments || [],
      contractStatus: "draft",
    });

    // No PDF/email is generated on creation anymore — the contract is
    // immediately visible to the client in their portal (getMyProject
    // returns contracts of any status), and can still be emailed manually
    // later via the "Send Email" action (exports.sendContract), unchanged.
    await logActivity(clientId, "contract_created", `Contract "${projectName}" created`, { contractId: contract._id, projectAmount });

    return res.status(201).json({
      message: "Contract created successfully",
      contract: decorateContract(contract),
    });
  } catch (error) {
    console.error("Error creating contract:", error);
    return res.status(500).json({ message: error.message || "Failed to create contract" });
  }
};

exports.getAllContracts = async (req, res) => {
  try {
    const { clientId } = req.query;
    const filter = clientId ? { clientId } : {};
    const contracts = await Contract.find(filter).populate("clientId", "clientName email").sort({ createdAt: -1 });

    return res.json({ contracts: contracts.map(decorateContract), total: contracts.length });
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch contracts" });
  }
};

exports.getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).populate("clientId");
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }
    return res.json(decorateContract(contract));
  } catch (error) {
    console.error("Error fetching contract:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch contract" });
  }
};

exports.generateInvoice = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    const client = await Client.findById(contract.clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const fileData = await clientService.generateInvoicePdf({ client, contract });
    await logActivity(client._id, "invoice_generated", `Invoice generated for "${contract.projectName}"`, { contractId: contract._id });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${contract.contractNumber}.pdf`);
    return res.send(fileData);
  } catch (error) {
    console.error("Error generating invoice:", error);
    return res.status(500).json({ message: error.message || "Failed to generate invoice" });
  }
};

exports.sendContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    const client = await Client.findById(contract.clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const emailResult = await clientService.sendContractEmail({ client, contract });

    contract.contractStatus = "sent";
    contract.sentAt = new Date();
    contract.sentTo = client.email;
    await contract.save();

    await logActivity(client._id, "contract_sent", `Contract "${contract.projectName}" sent`, { contractId: contract._id });

    return res.json({
      message: "Contract sent successfully",
      contract: decorateContract(contract),
      emailInfo: emailResult,
    });
  } catch (error) {
    console.error("Error sending contract:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message || "Failed to send contract" });
  }
};

exports.updateContract = async (req, res) => {
  try {
    const updatePayload = { ...req.body };
    const contract = await Contract.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    return res.json({ message: "Contract updated successfully", contract: decorateContract(contract) });
  } catch (error) {
    console.error("Error updating contract:", error);
    return res.status(500).json({ message: error.message || "Failed to update contract" });
  }
};

exports.deleteContract = async (req, res) => {
  try {
    const contract = await Contract.findByIdAndDelete(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    return res.json({ message: "Contract deleted successfully" });
  } catch (error) {
    console.error("Error deleting contract:", error);
    return res.status(500).json({ message: error.message || "Failed to delete contract" });
  }
};

// ============= DELIVERABLES OPERATIONS =============

exports.addDeliverable = async (req, res) => {
  try {
    const { title, quantity, frequency } = req.body;
    if (!title || quantity === undefined) {
      return res.status(400).json({ message: "Title and quantity are required" });
    }

    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    contract.deliverables.push({ title, quantity, delivered: 0, frequency: frequency || "one-time" });
    await contract.save();

    await logActivity(contract.clientId, "deliverable_added", `Deliverable "${title}" added to "${contract.projectName}"`, { contractId: contract._id });

    return res.status(201).json({ message: "Deliverable added successfully", contract: decorateContract(contract) });
  } catch (error) {
    console.error("Error adding deliverable:", error);
    return res.status(500).json({ message: error.message || "Failed to add deliverable" });
  }
};

exports.updateDeliverable = async (req, res) => {
  try {
    const { delivered, title, quantity, frequency, status } = req.body;

    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    const deliverable = contract.deliverables.id(req.params.deliverableId);
    if (!deliverable) {
      return res.status(404).json({ message: "Deliverable not found" });
    }

    if (delivered !== undefined) deliverable.delivered = delivered;
    if (title !== undefined) deliverable.title = title;
    if (quantity !== undefined) deliverable.quantity = quantity;
    if (frequency !== undefined) deliverable.frequency = frequency;
    if (status !== undefined) deliverable.status = status;

    await contract.save();

    await logActivity(contract.clientId, "deliverable_updated", `Deliverable "${deliverable.title}" updated on "${contract.projectName}"`, { contractId: contract._id });

    return res.json({ message: "Deliverable updated successfully", contract: decorateContract(contract) });
  } catch (error) {
    console.error("Error updating deliverable:", error);
    return res.status(500).json({ message: error.message || "Failed to update deliverable" });
  }
};

exports.deleteDeliverable = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    const deliverable = contract.deliverables.id(req.params.deliverableId);
    if (!deliverable) {
      return res.status(404).json({ message: "Deliverable not found" });
    }

    deliverable.deleteOne();
    await contract.save();

    return res.json({ message: "Deliverable deleted successfully", contract: decorateContract(contract) });
  } catch (error) {
    console.error("Error deleting deliverable:", error);
    return res.status(500).json({ message: error.message || "Failed to delete deliverable" });
  }
};

// ============= PAYMENT OPERATIONS =============

exports.addPayment = async (req, res) => {
  try {
    const { amount, paymentDate, method, notes, nextDueDate } = req.body;
    if (!amount) {
      return res.status(400).json({ message: "Amount is required" });
    }

    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    contract.payments.push({ amount, paymentDate, method, notes });
    if (nextDueDate) {
      contract.nextDueDate = nextDueDate;
    }
    await contract.save();

    await logActivity(contract.clientId, "payment_added", `Payment of ₹${amount} recorded on "${contract.projectName}"`, { contractId: contract._id, amount, method });

    return res.status(201).json({ message: "Payment recorded successfully", contract: decorateContract(contract) });
  } catch (error) {
    console.error("Error adding payment:", error);
    return res.status(500).json({ message: error.message || "Failed to add payment" });
  }
};

// ============= CLIENT PORTAL (role: "client") =============

exports.getMyProject = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.clientId) {
      return res.status(404).json({ message: "No linked client account found" });
    }

    const client = await Client.findById(user.clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const contracts = await Contract.find({ clientId: client._id }).sort({ createdAt: -1 });
    const now = new Date();

    const projects = contracts.map((contract) => {
      const decorated = decorateContract(contract);
      return {
        id: contract._id,
        projectName: decorated.projectName,
        contractStatus: decorated.contractStatus,
        deliverables: decorated.deliverables,
        payments: decorated.payments,
        projectAmount: decorated.projectAmount,
        receivedAmount: decorated.receivedAmount,
        dueAmount: decorated.dueAmount,
        nextDueDate: decorated.nextDueDate,
        isOverdue: Boolean(decorated.nextDueDate && decorated.dueAmount > 0 && new Date(decorated.nextDueDate) < now),
      };
    });

    return res.json({
      client: {
        id: client._id,
        clientName: client.clientName,
        email: client.email,
        companyName: client.companyName,
      },
      projects,
    });
  } catch (error) {
    console.error("Error fetching client project:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch project" });
  }
};

// ============= DASHBOARD STATS =============

exports.getDashboardStats = async (req, res) => {
  try {
    // When the frontend passes explicit start/end, it has already computed the precise
    // UTC instant for the user's local day boundaries — use it as-is. Only the
    // no-params fallback (defaulting to "this month") needs us to compute boundaries,
    // and that's done directly in local server time below, not via a second setHours()
    // pass that would re-interpret an already-correct instant in the wrong timezone.
    const now = new Date();
    // Accept both start/end (existing frontend contract) and startDate/endDate
    // (the names used elsewhere in the spec for this endpoint) — same meaning.
    const startParam = req.query.start || req.query.startDate;
    const endParam = req.query.end || req.query.endDate;
    // Optional narrowing filters — absent by default, so existing callers get
    // the exact same response shape/values they always have.
    const serviceFilter = req.query.service || null;
    const paymentModeFilter = req.query.paymentMode || null; // "Bank" | "Cash"

    let periodStart = startParam ? new Date(startParam) : null;
    let periodEnd = endParam ? new Date(endParam) : null;
    if (!periodStart || Number.isNaN(periodStart.getTime())) {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }
    if (!periodEnd || Number.isNaN(periodEnd.getTime())) {
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const dateFilter = { createdAt: { $gte: periodStart, $lte: periodEnd } };
    // Renewal cases key off validUntil (the renewal date), not createdAt — a
    // contract created months ago can still renew inside the selected range.
    const renewalDateFilter = { validUntil: { $gte: periodStart, $lte: periodEnd } };

    const [clients, contracts, reminders, allContracts, renewalContracts] = await Promise.all([
      Client.find(dateFilter).sort({ createdAt: -1 }),
      // Populated with clientName so Service Wise Active Cases can list which
      // client/contract each case belongs to, for the drill-down view.
      Contract.find(dateFilter).populate("clientId", "clientName"),
      PaymentReminder.find(dateFilter),
      Contract.find(), // unfiltered — needed for the trailing monthly revenue trend below
      Contract.find(renewalDateFilter).populate({
        path: "clientId",
        select: "clientName salesPerson",
        populate: { path: "salesPerson", select: "name" },
      }),
    ]);

    const totalClients = clients.length;
    // "Active" here means converted leads (an actual onboarded client), not the old
    // active/inactive flag — status is now a lead-pipeline stage (open/converted/cold/ni).
    const activeClients = clients.filter((c) => c.status === "converted").length;
    const activeClientsPercent = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0;

    const contractStatusBreakdown = { sent: 0, accepted: 0, rejected: 0, draft: 0 };
    let totalDeliverables = 0;
    let completedDeliverables = 0;
    let totalDue = 0;
    let totalDelivered = 0;
    let totalRevenue = 0;
    let outstandingPayments = 0;
    let overduePayments = 0;
    let collectedThisMonth = 0;
    let bankCollection = 0;
    let cashCollection = 0;

    // ── Service Wise Active Cases ────────────────────────────────────────────
    // "Active" = contractStatus is sent or accepted (a live, non-terminal-
    // negative contract). Each enabled service/category inside an active
    // contract is one "case"; its amount is that service's own itemized
    // selling price (the advance-settings breakdown filled in per service),
    // not a slice of the contract's single top-level projectAmount.
    const serviceWiseMap = new Map(); // categoryId -> { activeCases, totalAmount }
    let totalActiveCases = 0;
    let totalActiveRevenue = 0;

    contracts.forEach((contract) => {
      if (contractStatusBreakdown[contract.contractStatus] !== undefined) {
        contractStatusBreakdown[contract.contractStatus] += 1;
      }

      const sinceDate = contract.sentAt || contract.createdAt || now;
      contract.deliverables.forEach((item) => {
        const stats = computeDeliverableStats(item, sinceDate);
        totalDeliverables += 1;
        totalDue += stats.due || 0;
        totalDelivered += stats.delivered || 0;
        if (stats.status === "Completed") completedDeliverables += 1;
      });

      totalRevenue += contract.receivedAmount || 0;
      outstandingPayments += contract.dueAmount || 0;

      if (contract.nextDueDate && contract.dueAmount > 0 && new Date(contract.nextDueDate) < now) {
        overduePayments += 1;
      }

      // "Active" = a real, ongoing contract — everything except one that was
      // explicitly rejected or has expired. Contracts now stay in "draft"
      // indefinitely unless an admin manually emails them (no more auto-send
      // on creation), so draft must count as active or every newly created
      // contract would silently vanish from this section.
      const isActive = contract.contractStatus !== "rejected" && contract.contractStatus !== "expired";
      if (isActive) {
        (contract.selectedServices || []).forEach((cat) => {
          if (!cat?.enabled || !(cat.selections || []).length) return;
          if (serviceFilter && cat.categoryId !== serviceFilter) return;

          const categoryAmount = cat.selections.reduce(
            (sum, sel) => sum + computeLeafFinalPrice(sel.advanced),
            0
          );
          const bucket = serviceWiseMap.get(cat.categoryId) || { activeCases: 0, totalAmount: 0, cases: [] };
          bucket.activeCases += 1;
          bucket.totalAmount += categoryAmount;
          bucket.cases.push({
            contractId: contract._id,
            clientName: contract.clientId?.clientName || "—",
            projectName: contract.projectName,
            contractStatus: contract.contractStatus,
            amount: Math.round(categoryAmount * 100) / 100,
          });
          serviceWiseMap.set(cat.categoryId, bucket);

          totalActiveCases += 1;
          totalActiveRevenue += categoryAmount;
        });
      }
    });

    const serviceWiseActiveCases = Array.from(serviceWiseMap.entries())
      .map(([categoryId, v]) => ({
        categoryId,
        label: SERVICE_CATEGORY_LABELS[categoryId] || categoryId,
        activeCases: v.activeCases,
        totalAmount: Math.round(v.totalAmount * 100) / 100,
        cases: v.cases,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // "Collected" must key off each payment's OWN date, not the creation date of the
    // contract it lives on — a payment logged today against an older contract still
    // belongs in "today". Scanning all contracts (not just ones created in-range) is
    // what makes that work.
    allContracts.forEach((contract) => {
      contract.payments.forEach((payment) => {
        if (!payment.paymentDate) return;
        const paidOn = new Date(payment.paymentDate);
        if (paidOn >= periodStart && paidOn <= periodEnd) {
          collectedThisMonth += payment.amount || 0;

          // Revenue Summary: Cash is the "Cash" method exactly; every other
          // recorded method (Bank Transfer, UPI, Cheque, Card, Razorpay, Other)
          // is digital/bank-settled money, so it's bucketed as "Bank".
          const bucket = payment.method === "Cash" ? "Cash" : "Bank";
          if (!paymentModeFilter || paymentModeFilter === bucket) {
            if (bucket === "Cash") cashCollection += payment.amount || 0;
            else bankCollection += payment.amount || 0;
          }
        }
      });
    });

    const pendingDeliverables = totalDeliverables - completedDeliverables;
    const overallCompletionPercent = totalDue > 0 ? Math.round((totalDelivered / totalDue) * 100) : 0;
    const pendingReminders = reminders.filter((r) => r.reminderStatus !== "paid").length;
    const hasData = totalClients > 0 || contracts.length > 0 || reminders.length > 0;

    // ── Renewal Cases ────────────────────────────────────────────────────────
    // One row per contract whose validUntil (the renewal date) falls in the
    // selected range. Status is auto-derived from validUntil vs today unless
    // an admin has already marked it "Completed" (renewed) via contract edit.
    const renewalCases = renewalContracts
      .map((contract) => {
        const validUntil = contract.validUntil ? new Date(contract.validUntil) : null;
        const status = contract.renewalStatus === "Completed"
          ? "Completed"
          : validUntil && validUntil < now ? "Overdue" : "Upcoming";
        const serviceName = (contract.selectedServices || [])
          .filter((cat) => cat?.enabled && (cat.selections || []).length)
          .map((cat) => SERVICE_CATEGORY_LABELS[cat.categoryId] || cat.categoryId)
          .join(", ") || "—";

        return {
          contractId: contract._id,
          clientId: contract.clientId?._id || contract.clientId,
          clientName: contract.clientId?.clientName || "—",
          serviceName,
          renewalDate: contract.validUntil,
          renewalAmount: contract.projectAmount || 0,
          salesPerson: contract.clientId?.salesPerson?.name || "—",
          status,
        };
      })
      .sort((a, b) => new Date(a.renewalDate) - new Date(b.renewalDate));

    const totalRenewalCases = renewalCases.length;
    const totalRenewalRevenue = renewalCases.reduce((sum, r) => sum + (r.renewalAmount || 0), 0);

    // Trailing 8-month revenue trend, independent of the selected date-range filter —
    // "collected" buckets by when each payment was actually made, "outstanding" buckets
    // by when the contract carrying that due balance was created.
    const TREND_MONTHS = 8;
    const monthBuckets = [];
    for (let i = TREND_MONTHS - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthBuckets.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString("en-US", { month: "short" }),
        collected: 0,
        outstanding: 0,
      });
    }
    const bucketFor = (date) => monthBuckets.find((b) => b.year === date.getFullYear() && b.month === date.getMonth());

    allContracts.forEach((contract) => {
      contract.payments.forEach((payment) => {
        if (!payment.paymentDate) return;
        const bucket = bucketFor(new Date(payment.paymentDate));
        if (bucket) bucket.collected += payment.amount || 0;
      });
      const createdBucket = bucketFor(new Date(contract.createdAt));
      if (createdBucket) createdBucket.outstanding += contract.dueAmount || 0;
    });

    const monthlyTrend = monthBuckets.map(({ label, year, collected, outstanding }) => ({ label, year, collected, outstanding }));
    const trendTotalCollected = monthlyTrend.reduce((sum, b) => sum + b.collected, 0);
    const trendTotalOutstanding = monthlyTrend.reduce((sum, b) => sum + b.outstanding, 0);
    const currentMonthBucket = monthlyTrend[monthlyTrend.length - 1] || { collected: 0, outstanding: 0 };

    // Trailing 7-day collections trend, for the "Daily Collections" chart.
    const TREND_DAYS = 7;
    const dayBuckets = [];
    for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      dayBuckets.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        date: d.getDate(),
        label: d.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
        collected: 0,
      });
    }
    const dayBucketFor = (date) => dayBuckets.find((b) => b.year === date.getFullYear() && b.month === date.getMonth() && b.date === date.getDate());

    allContracts.forEach((contract) => {
      contract.payments.forEach((payment) => {
        if (!payment.paymentDate) return;
        const bucket = dayBucketFor(new Date(payment.paymentDate));
        if (bucket) bucket.collected += payment.amount || 0;
      });
    });

    const dailyTrend = dayBuckets.map(({ label, collected }) => ({ label, collected }));
    const todayCollected = dailyTrend[dailyTrend.length - 1]?.collected || 0;

    // Yearly breakup — total collected per calendar year, across all recorded payments.
    const yearTotals = new Map();
    allContracts.forEach((contract) => {
      contract.payments.forEach((payment) => {
        if (!payment.paymentDate) return;
        const year = new Date(payment.paymentDate).getFullYear();
        yearTotals.set(year, (yearTotals.get(year) || 0) + (payment.amount || 0));
      });
    });
    const yearlyBreakup = Array.from(yearTotals.entries())
      .sort(([a], [b]) => a - b)
      .slice(-4)
      .map(([year, collected]) => ({ year, collected }));
    const yearlyBreakupTotal = yearlyBreakup.reduce((sum, y) => sum + y.collected, 0);
    const currentYear = now.getFullYear();
    const thisYearCollected = yearTotals.get(currentYear) || 0;
    const lastYearCollected = yearTotals.get(currentYear - 1) || 0;
    const yearOverYearChangePercent = lastYearCollected > 0
      ? Math.round(((thisYearCollected - lastYearCollected) / lastYearCollected) * 100)
      : null;

    return res.json({
      totalClients,
      activeClients,
      activeClientsPercent,
      totalContracts: contracts.length,
      contractStatusBreakdown,
      totalReminders: reminders.length,
      pendingReminders,
      totalDeliverables,
      completedDeliverables,
      pendingDeliverables,
      overallCompletionPercent,
      totalRevenue,
      outstandingPayments,
      overduePayments,
      collectedThisMonth,
      serviceWiseActiveCases,
      totalActiveCases,
      totalActiveRevenue: Math.round(totalActiveRevenue * 100) / 100,
      revenueSummary: {
        total: bankCollection + cashCollection,
        bank: bankCollection,
        cash: cashCollection,
      },
      renewalCases,
      totalRenewalCases,
      totalRenewalRevenue,
      recentClients: clients.slice(0, 5).map((c) => ({
        _id: c._id,
        clientName: c.clientName,
        email: c.email,
        status: c.status,
      })),
      monthlyTrend,
      trendTotalCollected,
      trendTotalOutstanding,
      currentMonthCollected: currentMonthBucket.collected,
      currentMonthOutstanding: currentMonthBucket.outstanding,
      dailyTrend,
      todayCollected,
      yearlyBreakup,
      yearlyBreakupTotal,
      yearOverYearChangePercent,
      hasData,
      periodStart,
      periodEnd,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch dashboard stats" });
  }
};

// ============= PAYMENT REMINDER OPERATIONS =============

exports.createPaymentReminder = async (req, res) => {
  try {
    const { clientId, contractId, invoiceNumber, amountDue, currency, dueDate, reminderType, customMessage, notes } = req.body;

    if (!clientId || !amountDue) {
      return res.status(400).json({ message: "Client ID and amount due are required" });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const reminderId = clientService.buildReminderNumber();

    const reminder = await PaymentReminder.create({
      reminderId,
      clientId,
      contractId: contractId || null,
      invoiceNumber,
      amountDue,
      currency: currency || "INR",
      dueDate,
      reminderType: reminderType || "first-reminder",
      customMessage,
      notes,
      reminderStatus: "drafted",
    });

    // Automatically send the payment reminder email
    try {
      const emailResult = await clientService.sendPaymentReminderEmail({ client, reminder });

      reminder.reminderStatus = "sent";
      reminder.sentAt = new Date();
      reminder.sentTo = client.email;
      reminder.reminderCount = 1;

      const daysToAdd = reminder.reminderType === "final-reminder" ? 7 : 3;
      reminder.nextReminderDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

      await reminder.save();

      await logActivity(clientId, "reminder_sent", `Payment reminder for ₹${amountDue} created and sent`, { reminderId: reminder._id });

      return res.status(201).json({
        message: "Payment reminder created and sent successfully",
        reminder,
        emailInfo: emailResult
      });
    } catch (emailError) {
      console.error("Error sending payment reminder email:", emailError);
      await logActivity(clientId, "reminder_created", `Payment reminder for ₹${amountDue} created (email failed to send)`, { reminderId: reminder._id });
      // Still return success for reminder creation, but note the email failure
      return res.status(201).json({
        message: "Payment reminder created successfully, but failed to send email",
        reminder,
        emailError: emailError.message
      });
    }
  } catch (error) {
    console.error("Error creating payment reminder:", error);
    return res.status(500).json({ message: error.message || "Failed to create payment reminder" });
  }
};

exports.getAllReminders = async (req, res) => {
  try {
    const { clientId } = req.query;
    const filter = clientId ? { clientId } : {};
    const reminders = await PaymentReminder.find(filter).populate("clientId", "clientName email").sort({ createdAt: -1 });

    return res.json({ reminders, total: reminders.length });
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch reminders" });
  }
};

exports.sendPaymentReminder = async (req, res) => {
  try {
    const reminder = await PaymentReminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    const client = await Client.findById(reminder.clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const emailResult = await clientService.sendPaymentReminderEmail({ client, reminder });

    reminder.reminderStatus = "sent";
    reminder.sentAt = new Date();
    reminder.sentTo = client.email;
    reminder.reminderCount = (reminder.reminderCount || 1) + 1;

    const daysToAdd = reminder.reminderType === "final-reminder" ? 7 : 3;
    reminder.nextReminderDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

    await reminder.save();

    await logActivity(client._id, "reminder_sent", `Payment reminder for ₹${reminder.amountDue} resent`, { reminderId: reminder._id });

    return res.json({
      message: "Payment reminder sent successfully",
      reminder,
      emailInfo: emailResult,
    });
  } catch (error) {
    console.error("Error sending payment reminder:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message || "Failed to send payment reminder" });
  }
};

exports.updatePaymentReminder = async (req, res) => {
  try {
    const updatePayload = { ...req.body };
    const reminder = await PaymentReminder.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    return res.json({ message: "Reminder updated successfully", reminder });
  } catch (error) {
    console.error("Error updating reminder:", error);
    return res.status(500).json({ message: error.message || "Failed to update reminder" });
  }
};

exports.deletePaymentReminder = async (req, res) => {
  try {
    const reminder = await PaymentReminder.findByIdAndDelete(req.params.id);
    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    return res.json({ message: "Reminder deleted successfully" });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return res.status(500).json({ message: error.message || "Failed to delete reminder" });
  }
};

// ============= PI ATTACHMENT OPERATIONS =============

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const _uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const _fileFilter = (req, file, cb) => {
  const allowed = /\.(pdf|png|jpg|jpeg|doc|docx|xls|xlsx)$/i;
  if (allowed.test(path.extname(file.originalname))) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, PNG, JPG, JPEG, DOC, DOCX, XLS, XLSX files are allowed"));
  }
};

const _upload = multer({ storage: _uploadStorage, fileFilter: _fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

exports.uploadPiAttachmentMiddleware = _upload.single("file");

exports.uploadPiAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    client.piAttachments.push({
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.id,
    });
    await client.save();

    await logActivity(client._id, "pi_uploaded", `PI attachment "${req.file.originalname}" uploaded`);

    const saved = client.piAttachments[client.piAttachments.length - 1];
    return res.status(201).json({ message: "Attachment uploaded successfully", attachment: saved });
  } catch (error) {
    console.error("Error uploading PI attachment:", error);
    return res.status(500).json({ message: error.message || "Failed to upload attachment" });
  }
};

exports.deletePiAttachment = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const att = client.piAttachments.id(req.params.attachmentId);
    if (!att) return res.status(404).json({ message: "Attachment not found" });

    const filePath = path.join(__dirname, "../uploads", att.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    client.piAttachments.pull(req.params.attachmentId);
    await client.save();

    await logActivity(client._id, "pi_deleted", `PI attachment "${att.originalname}" deleted`);

    return res.json({ message: "Attachment deleted successfully" });
  } catch (error) {
    console.error("Error deleting PI attachment:", error);
    return res.status(500).json({ message: error.message || "Failed to delete attachment" });
  }
};

// ── Contract-level PI (proforma invoice) — one attachment per contract ─────
exports.uploadContractPi = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: "Contract not found" });

    if (contract.piAttachment?.filename) {
      const oldPath = path.join(__dirname, "../uploads", contract.piAttachment.filename);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    contract.piAttachment = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.id,
      uploadedAt: new Date(),
    };
    await contract.save();

    await logActivity(contract.clientId, "pi_uploaded", `PI "${req.file.originalname}" uploaded for contract "${contract.projectName}"`, { contractId: contract._id });

    return res.status(201).json({ message: "PI uploaded successfully", contract: decorateContract(contract) });
  } catch (error) {
    console.error("Error uploading contract PI:", error);
    return res.status(500).json({ message: error.message || "Failed to upload PI" });
  }
};

exports.deleteContractPi = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: "Contract not found" });
    if (!contract.piAttachment?.filename) return res.status(404).json({ message: "No PI attached" });

    const filePath = path.join(__dirname, "../uploads", contract.piAttachment.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    contract.piAttachment = undefined;
    await contract.save();

    await logActivity(contract.clientId, "pi_deleted", `PI removed from contract "${contract.projectName}"`, { contractId: contract._id });

    return res.json({ message: "PI removed successfully", contract: decorateContract(contract) });
  } catch (error) {
    console.error("Error deleting contract PI:", error);
    return res.status(500).json({ message: error.message || "Failed to delete PI" });
  }
};
