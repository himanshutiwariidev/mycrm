const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const createTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  console.log("SMTP Config:", {
    host: SMTP_HOST,
    port: SMTP_PORT,
    user: SMTP_USER,
    passLength: SMTP_PASS ? SMTP_PASS.length : 0,
    secure: process.env.SMTP_SECURE === "true" || Number(SMTP_PORT) === 465
  });

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    const error = new Error("Email service is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS to .env");
    error.statusCode = 500;
    throw error;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true" || Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatAmount = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const buildProposalNumber = () => `PROP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const buildReminderNumber = () => `REMIND-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const proposalAsset = (fileName) => {
  const assetPath = path.join(__dirname, "../../frontend/src/assets", fileName);
  return fs.existsSync(assetPath) ? assetPath : null;
};

const textOrFallback = (value, fallback = "N/A") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const drawSectionTitle = (doc, title, x, y, width) => {
  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(title.toUpperCase(), x, y, { width });

  doc
    .moveTo(x, y + 22)
    .lineTo(x + width, y + 22)
    .lineWidth(1)
    .strokeColor("#f59e0b")
    .stroke();
};

const drawInfoRow = (doc, label, value, x, y, width) => {
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor("#9a3412")
    .text(label.toUpperCase(), x, y, { width });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#111827")
    .text(textOrFallback(value), x, y + 12, { width, lineGap: 1 });
};

const generateProposalPdf = async ({ client, proposal }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const buffers = [];
    const logoPath = proposalAsset("logo.png");
    const signPath = proposalAsset("sign.png");
    const page = { width: 595.28, height: 841.89 };
    const colors = {
      black: "#061216",
      orange: "#f59e0b",
      orangeDark: "#c2410c",
      orangeSoft: "#fff7ed",
      text: "#111827",
      muted: "#6b7280",
      line: "#f3d3a4",
      white: "#ffffff",
    };

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const today = new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const validUntil = proposal.validUntil
      ? new Date(proposal.validUntil).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "To be discussed";
    const address = [client.address, client.city, client.state, client.country, client.zipCode].filter(Boolean).join(", ");
    const contactNumber = "7633093222";
    const contentX = 52;
    const contentWidth = page.width - 104;
    const bottomLimit = page.height - 92;
    let currentPage = 1;

    const addNewProposalPage = () => {
      drawFooter();
      doc.addPage({ margin: 0 });
      currentPage += 1;
      drawPageBackground();
      doc.y = 74;
    };

    const addPageIfNeeded = (neededHeight) => {
      if (doc.y + neededHeight <= bottomLimit) return;
      addNewProposalPage();
    };

    const drawPageBackground = () => {
      doc.rect(0, 0, page.width, page.height).fill("#fbfbfa");
      doc.rect(0, 0, 18, page.height).fill(colors.orange);
      doc.rect(page.width - 18, 0, 18, page.height).fill(colors.black);
      doc.circle(page.width - 72, 94, 72).fillOpacity(0.08).fill(colors.orange).fillOpacity(1);
      doc.circle(72, page.height - 54, 58).fillOpacity(0.08).fill(colors.orangeDark).fillOpacity(1);
    };

    const drawHeader = () => {
      doc.rect(0, 0, page.width, 142).fill(colors.black);
      doc.rect(0, 132, page.width, 10).fill(colors.orange);
      doc.polygon([page.width - 150, 0], [page.width, 0], [page.width, 142], [page.width - 82, 142]).fill("#09161a");
      doc.polygon([page.width - 96, 132], [page.width, 132], [page.width, 142], [page.width - 102, 142]).fill(colors.orangeDark);

      if (logoPath) {
        doc.image(logoPath, 54, 34, { fit: [150, 72], align: "left", valign: "center" });
      } else {
        doc.font("Helvetica-Bold").fontSize(22).fillColor(colors.white).text("Bharat Bizmart", 54, 54);
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(25)
        .fillColor(colors.white)
        .text("Sr. Software Engineer", 272, 42, { width: 270, align: "right" });
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#fde7c4")
        .text("Website | Web App | Ecommerce | CRM | ERP | Custom App", 244, 76, {
          width: 298,
          align: "right",
        });
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(colors.orange)
        .text(`Mob - ${contactNumber}`, 272, 106, { width: 270, align: "right" });
    };

    const drawFooter = () => {
      const y = page.height - 82;
      doc
        .moveTo(52, y)
        .lineTo(page.width - 52, y)
        .lineWidth(1)
        .strokeColor(colors.line)
        .stroke();
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(colors.muted)
        .text(`Generated on ${today}`, 52, y + 16, { width: 170 });
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(colors.orangeDark)
        .text("visit us:himanshutiwari.vercel.app", page.width - 222, y + 16, { width: 170, align: "right" });
    };

    const drawCard = (x, y, width, height, fill = colors.white) => {
      doc.roundedRect(x, y, width, height, 9).fillAndStroke(fill, "#f2d7af");
    };

    const drawParagraphCard = (title, body, x, y, width) => {
      const bodyText = textOrFallback(body, "To be discussed");
      const bodyHeight = doc.font("Helvetica").fontSize(10).heightOfString(bodyText, {
        width: width - 32,
        lineGap: 4,
      });
      const height = Math.max(108, bodyHeight + 64);
      addPageIfNeeded(height + 18);
      y = doc.y;
      drawCard(x, y, width, height);
      drawSectionTitle(doc, title, x + 16, y + 16, width - 32);
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(colors.text)
        .text(bodyText, x + 16, y + 54, { width: width - 32, lineGap: 4 });
      doc.y = y + height + 18;
    };

    const drawTimelinePaymentCard = () => {
      addPageIfNeeded(98);
      const y = doc.y;
      drawCard(contentX, y, contentWidth, 78, colors.orangeSoft);
      drawSectionTitle(doc, "Timeline & Payment Terms", contentX + 16, y + 14, contentWidth - 32);
      drawInfoRow(doc, "Timeline", proposal.timeline || "To be agreed upon", contentX + 18, y + 48, 160);
      drawInfoRow(
        doc,
        "Payment Terms",
        proposal.paymentTerms || "Payment terms will be discussed and finalized before project kickoff.",
        contentX + 210,
        y + 48,
        250
      );
      doc.y = y + 96;
    };

    const drawPaymentBadge = (label, x, y, width, color) => {
      doc.roundedRect(x, y, width, 34, 7).fillAndStroke("#ffffff", "#f2d7af");
      doc.circle(x + 18, y + 17, 11).fill(color);
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#ffffff")
        .text(label.charAt(0), x + 14, y + 11, { width: 8, align: "center" });
      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor(colors.text)
        .text(label, x + 36, y + 8, { width: width - 42 });
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(colors.muted)
        .text(contactNumber, x + 36, y + 20, { width: width - 42 });
    };

    const drawAccountDetails = () => {
      if (currentPage === 1) {
        addNewProposalPage();
      }

      addPageIfNeeded(176);
      const y = doc.y;
      drawCard(contentX, y, contentWidth, 154, "#fffaf3");
      drawSectionTitle(doc, "Account Details", contentX + 16, y + 16, contentWidth - 32);
      drawInfoRow(doc, "Bank Name", "Central Bank of India", contentX + 18, y + 52, 170);
      drawInfoRow(doc, "IFSC", "CBIN0281086", contentX + 210, y + 52, 110);
      drawInfoRow(doc, "Account Holder", "Himanshu Kumar Tiwari", contentX + 340, y + 52, 130);
      drawInfoRow(doc, "Account Number", "3507840080", contentX + 18, y + 92, 170);
      drawInfoRow(doc, "UPI / Wallet Number", contactNumber, contentX + 210, y + 92, 150);

      drawPaymentBadge("PhonePe", contentX + 18, y + 128, 134, "#5f259f");
      drawPaymentBadge("Google Pay", contentX + 178, y + 128, 146, "#4285f4");
      drawPaymentBadge("Paytm", contentX + 350, y + 128, 120, "#00baf2");
      doc.y = y + 176;
    };

    drawPageBackground();
    drawHeader();

    doc.y = 176;
    doc
      .font("Helvetica-Bold")
      .fontSize(26)
      .fillColor(colors.orangeDark)
      .text(`Project Proposal - ${textOrFallback(proposal.projectName, "Project")}`, contentX, doc.y, {
        width: contentWidth,
        align: "center",
      });
    doc
      .moveTo(154, doc.y + 12)
      .lineTo(page.width - 154, doc.y + 12)
      .lineWidth(1.2)
      .strokeColor(colors.orange)
      .stroke();

    doc.y += 36;
    const introY = doc.y;
    drawCard(contentX, introY, contentWidth, 110, colors.orangeSoft);
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(colors.orangeDark)
      .text("PREPARED FOR", contentX + 20, introY + 18, { width: 120 });
    doc
      .font("Helvetica-Bold")
      .fontSize(17)
      .fillColor(colors.text)
      .text(textOrFallback(client.clientName), contentX + 20, introY + 34, { width: 228 });
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor(colors.muted)
      .text(textOrFallback(client.companyName, client.email), contentX + 20, introY + 58, { width: 228 });

    drawInfoRow(doc, "Proposal Number", proposal.proposalNumber, contentX + 286, introY + 16, 188);
    drawInfoRow(doc, "Proposal Date", today, contentX + 286, introY + 58, 86);
    drawInfoRow(doc, "Valid Until", validUntil, contentX + 386, introY + 58, 88);
    doc.y = introY + 134;

    const detailsY = doc.y;
    drawCard(contentX, detailsY, 238, 148);
    drawSectionTitle(doc, "Client Details", contentX + 16, detailsY + 16, 206);
    drawInfoRow(doc, "Email", client.email, contentX + 16, detailsY + 50, 206);
    drawInfoRow(doc, "Phone", client.phone, contentX + 16, detailsY + 82, 206);
    drawInfoRow(doc, "Address", address || "N/A", contentX + 16, detailsY + 112, 200);

    drawCard(contentX + 258, detailsY, 233, 148, "#fffaf3");
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(colors.orangeDark)
      .text("PROJECT VALUE", contentX + 276, detailsY + 20, { width: 190 });
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor(colors.black)
      .text(formatAmount(proposal.projectAmount), contentX + 276, detailsY + 42, {
        width: 196,
      });
    drawInfoRow(doc, "Currency", proposal.currency || "INR", contentX + 276, detailsY + 92, 90);
    doc.y = detailsY + 174;

    drawParagraphCard("Project Overview", proposal.projectDescription, contentX, doc.y, contentWidth);

    if (proposal.projectScope) {
      drawParagraphCard("Scope Of Work", proposal.projectScope, contentX, doc.y, contentWidth);
    }

    drawTimelinePaymentCard();

    drawAccountDetails();

    addPageIfNeeded(132);
    const signY = doc.y;
    drawCard(contentX, signY, contentWidth, 106, "#fffaf3");
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(colors.black)
      .text("Prepared and submitted by", contentX + 18, signY + 20, { width: 220 });
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(colors.muted)
      .text("Thank you for considering this proposal. We look forward to building something polished, reliable, and ready to grow.", contentX + 18, signY + 42, {
        width: 260,
        lineGap: 3,
      });
    if (signPath) {
      doc.image(signPath, contentX + 330, signY + 12, { fit: [118, 42] });
    }
    doc
      .moveTo(contentX + 314, signY + 66)
      .lineTo(contentX + 462, signY + 66)
      .lineWidth(1)
      .strokeColor(colors.orange)
      .stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(colors.text)
      .text("Authorized Signature", contentX + 314, signY + 74, { width: 150, align: "center" });
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(colors.muted)

    drawFooter();
    doc.end();
  });
};

const buildProposalEmailText = ({ client }) =>
  `Dear ${client.clientName},

Please find attached your project proposal in PDF format.`;

const buildProposalEmailHtml = ({ client }) =>
  `<p>Dear ${client.clientName},</p><p>Please find attached your project proposal in PDF format.</p>`;


const buildPaymentReminderEmailHtml = ({ client, reminder }) => {
  return `
    <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px; color: #0f172a;">
      <div style="max-width: 760px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #dc2626, #ea580c); color: white; padding: 28px 32px;">
          <h1 style="margin: 0; font-size: 24px;">Payment Reminder</h1>
          <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">Payment Due Reminder - Invoice ${reminder.invoiceNumber || "N/A"}</p>
        </div>
        <div style="padding: 28px 32px;">
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #991b1b;">
              <strong>Hello ${client.clientName},</strong><br/><br/>
              This is a friendly reminder that payment is due on your account.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #991b1b;">Amount Due</div>
              <div style="font-size: 18px; font-weight: 700; margin-top: 8px; color: #dc2626;">${formatCurrency(reminder.amountDue, reminder.currency)}</div>
            </div>
            <div style="background: #fafafa; border: 1px solid #d4d4d8; border-radius: 8px; padding: 16px;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #52525b;">Due Date</div>
              <div style="font-size: 16px; font-weight: 700; margin-top: 8px; color: #0f172a;">
                ${reminder.dueDate ? new Date(reminder.dueDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "On demand"}
              </div>
            </div>
          </div>

          ${reminder.customMessage ? `<div style="background: #f9fafb; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
              ${reminder.customMessage}
            </p>
          </div>` : ""}

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                <strong>Invoice Number:</strong>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">
                ${reminder.invoiceNumber || "N/A"}
              </td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                <strong>Currency:</strong>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">
                ${reminder.currency}
              </td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                <strong>Reminder Type:</strong>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">
                ${reminder.reminderType.replace("-", " ").toUpperCase()}
              </td>
            </tr>
          </table>

          <div style="background: #eef2ff; border-left: 4px solid #6366f1; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; color: #3730a3;">
              <strong>Please</strong> arrange payment at your earliest convenience. If payment has already been made, please disregard this reminder or contact us with the transaction details.
            </p>
          </div>

          <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #64748b;">
              Sent on ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
};

const sendProposalEmail = async ({ client, proposal }) => {
  try {
    console.log("Attempting to send proposal email to:", client.email);
    const transporter = createTransporter();
    const fromName = process.env.SMTP_FROM_NAME || "Automated mail";
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

    console.log("Generating PDF for proposal:", proposal.proposalNumber);
    const pdfBuffer = await generateProposalPdf({ client, proposal });
    const safeName = proposal.projectName.replace(/[^a-z0-9-_]/gi, "-");

    console.log("Sending email with attachment to:", client.email);
    const result = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: client.email,
      subject: `Project Proposal: ${proposal.projectName} - ${formatCurrency(proposal.projectAmount, proposal.currency)}`,
      text: buildProposalEmailText({ client }),
      html: buildProposalEmailHtml({ client }),
      attachments: [
        {
          filename: `Proposal-${safeName}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    console.log("Email sent successfully, messageId:", result.messageId);
    return {
      success: true,
      messageId: result.messageId,
      sentAt: new Date(),
    };
  } catch (error) {
    console.error("Failed to send proposal email:", error);
    const err = new Error(`Failed to send proposal email: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

const sendPaymentReminderEmail = async ({ client, reminder }) => {
  try {
    const transporter = createTransporter();
    const fromName = process.env.SMTP_FROM_NAME || "Bharat Bizmart CRM";
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

    const result = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: client.email,
      subject: `Payment Reminder: ${formatCurrency(reminder.amountDue, reminder.currency)} Due - Invoice ${reminder.invoiceNumber || "N/A"}`,
      html: buildPaymentReminderEmailHtml({ client, reminder }),
    });

    return {
      success: true,
      messageId: result.messageId,
      sentAt: new Date(),
    };
  } catch (error) {
    const err = new Error(`Failed to send payment reminder email: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

module.exports = {
  buildProposalNumber,
  buildReminderNumber,
  generateProposalPdf,
  sendProposalEmail,
  sendPaymentReminderEmail,
  createTransporter,
};
