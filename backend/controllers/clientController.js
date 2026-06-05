const Client = require("../models/Client");
const Proposal = require("../models/Proposal");
const PaymentReminder = require("../models/PaymentReminder");
const clientService = require("../services/clientService");

// ============= CLIENT OPERATIONS =============

exports.createClient = async (req, res) => {
  try {
    const { clientName, email, phone, companyName, address, city, state, country, zipCode, contactPerson, designation, notes } = req.body;

    if (!clientName || !email || !phone) {
      return res.status(400).json({ message: "Client name, email, and phone are required" });
    }

    const existingClient = await Client.findOne({ email: email.toLowerCase().trim() });
    if (existingClient) {
      return res.status(400).json({ message: "Client with this email already exists" });
    }

    const client = await Client.create({
      clientName,
      email: email.toLowerCase().trim(),
      phone,
      companyName,
      address,
      city,
      state,
      country,
      zipCode,
      contactPerson,
      designation,
      notes,
      status: "active",
      onboardedAt: new Date(),
    });

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
    const clients = await Client.find().sort({ createdAt: -1 });
    return res.json({ clients, total: clients.length });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch clients" });
  }
};

exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const proposals = await Proposal.find({ clientId: req.params.id }).sort({ createdAt: -1 });
    const reminders = await PaymentReminder.find({ clientId: req.params.id }).sort({ createdAt: -1 });

    return res.json({ client, proposals, reminders });
  } catch (error) {
    console.error("Error fetching client:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch client" });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const updatePayload = { ...req.body };

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

    const client = await Client.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
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

    // Delete related proposals and reminders
    await Proposal.deleteMany({ clientId: req.params.id });
    await PaymentReminder.deleteMany({ clientId: req.params.id });

    return res.json({ message: "Client and related data deleted successfully" });
  } catch (error) {
    console.error("Error deleting client:", error);
    return res.status(500).json({ message: error.message || "Failed to delete client" });
  }
};

// ============= PROPOSAL OPERATIONS =============

exports.createProposal = async (req, res) => {
  try {
    const { clientId, projectName, projectDescription, projectScope, timeline, projectAmount, currency, paymentTerms, validUntil, notes } = req.body;

    if (!clientId || !projectName || !projectDescription || !projectAmount) {
      return res.status(400).json({ message: "Missing required fields: clientId, projectName, projectDescription, projectAmount" });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const proposalNumber = clientService.buildProposalNumber();

    const proposal = await Proposal.create({
      proposalNumber,
      clientId,
      projectName,
      projectDescription,
      projectScope,
      timeline,
      projectAmount,
      currency: currency || "INR",
      paymentTerms,
      validUntil,
      notes,
      proposalStatus: "draft",
    });

    // Automatically send the proposal email
    try {
      const emailResult = await clientService.sendProposalEmail({ client, proposal });

      proposal.proposalStatus = "sent";
      proposal.sentAt = new Date();
      proposal.sentTo = client.email;
      await proposal.save();

      return res.status(201).json({
        message: "Proposal created and sent successfully",
        proposal,
        emailInfo: emailResult
      });
    } catch (emailError) {
      console.error("Error sending proposal email:", emailError);
      // Still return success for proposal creation, but note the email failure
      return res.status(201).json({
        message: "Proposal created successfully, but failed to send email",
        proposal,
        emailError: emailError.message
      });
    }
  } catch (error) {
    console.error("Error creating proposal:", error);
    return res.status(500).json({ message: error.message || "Failed to create proposal" });
  }
};

exports.getAllProposals = async (req, res) => {
  try {
    const { clientId } = req.query;
    const filter = clientId ? { clientId } : {};
    const proposals = await Proposal.find(filter).populate("clientId", "clientName email").sort({ createdAt: -1 });

    return res.json({ proposals, total: proposals.length });
  } catch (error) {
    console.error("Error fetching proposals:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch proposals" });
  }
};

exports.getProposalById = async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id).populate("clientId");
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }
    return res.json(proposal);
  } catch (error) {
    console.error("Error fetching proposal:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch proposal" });
  }
};

exports.sendProposal = async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    const client = await Client.findById(proposal.clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const emailResult = await clientService.sendProposalEmail({ client, proposal });

    proposal.proposalStatus = "sent";
    proposal.sentAt = new Date();
    proposal.sentTo = client.email;
    await proposal.save();

    return res.json({
      message: "Proposal sent successfully",
      proposal,
      emailInfo: emailResult,
    });
  } catch (error) {
    console.error("Error sending proposal:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message || "Failed to send proposal" });
  }
};

exports.updateProposal = async (req, res) => {
  try {
    const updatePayload = { ...req.body };
    const proposal = await Proposal.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    return res.json({ message: "Proposal updated successfully", proposal });
  } catch (error) {
    console.error("Error updating proposal:", error);
    return res.status(500).json({ message: error.message || "Failed to update proposal" });
  }
};

exports.deleteProposal = async (req, res) => {
  try {
    const proposal = await Proposal.findByIdAndDelete(req.params.id);
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    return res.json({ message: "Proposal deleted successfully" });
  } catch (error) {
    console.error("Error deleting proposal:", error);
    return res.status(500).json({ message: error.message || "Failed to delete proposal" });
  }
};

// ============= PAYMENT REMINDER OPERATIONS =============

exports.createPaymentReminder = async (req, res) => {
  try {
    const { clientId, proposalId, invoiceNumber, amountDue, currency, dueDate, reminderType, customMessage, notes } = req.body;

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
      proposalId: proposalId || null,
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

      return res.status(201).json({
        message: "Payment reminder created and sent successfully",
        reminder,
        emailInfo: emailResult
      });
    } catch (emailError) {
      console.error("Error sending payment reminder email:", emailError);
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
