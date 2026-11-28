import cybertrickLogo from "../assets/cybertrick.png";
import { idCardBackDataUrl } from "./idCardBackSvg";
import { uploadedFileUrl } from "./uploads";

function loadImg(src) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadSafePhoto(filename) {
  if (!filename) return null;
  const url = uploadedFileUrl("user-photos", filename);
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return loadImg(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const img = await loadImg(objUrl);
    URL.revokeObjectURL(objUrl);
    return img;
  } catch {
    return loadImg(url);
  }
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;
  ctx.beginPath();
  ctx.moveTo(x + rad.tl, y);
  ctx.lineTo(x + w - rad.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad.tr);
  ctx.lineTo(x + w, y + h - rad.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad.br, y + h);
  ctx.lineTo(x + rad.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad.bl);
  ctx.lineTo(x, y + rad.tl);
  ctx.quadraticCurveTo(x, y, x + rad.tl, y);
  ctx.closePath();
}

function drawCoverImage(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawTruncated(ctx, text, x, y, maxW) {
  let out = String(text || "—");
  if (ctx.measureText(out).width <= maxW) {
    ctx.fillText(out, x, y);
    return;
  }
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxW) {
    out = out.slice(0, -1);
  }
  ctx.fillText(`${out}…`, x, y);
}

function drawCircleIcon(ctx, cx, cy, kind) {
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 1.35;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (kind === "emp") {
    // ID card / badge icon
    roundRectPath(ctx, cx - 5.5, cy - 4, 11, 8, 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - 2.2, cy - 0.5, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 0.8, cy - 1.2);
    ctx.lineTo(cx + 3.5, cy - 1.2);
    ctx.moveTo(cx + 0.8, cy + 1.2);
    ctx.lineTo(cx + 3.5, cy + 1.2);
    ctx.stroke();
  } else if (kind === "dept") {
    // Building icon
    ctx.strokeRect(cx - 4.5, cy - 5, 9, 10);
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - 2.5);
    ctx.lineTo(cx - 1, cy - 2.5);
    ctx.moveTo(cx + 1, cy - 2.5);
    ctx.lineTo(cx + 2, cy - 2.5);
    ctx.moveTo(cx - 2, cy);
    ctx.lineTo(cx - 1, cy);
    ctx.moveTo(cx + 1, cy);
    ctx.lineTo(cx + 2, cy);
    ctx.moveTo(cx - 1.2, cy + 5);
    ctx.lineTo(cx - 1.2, cy + 2.5);
    ctx.lineTo(cx + 1.2, cy + 2.5);
    ctx.lineTo(cx + 1.2, cy + 5);
    ctx.stroke();
  } else if (kind === "blood") {
    // Droplet icon
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5.2);
    ctx.bezierCurveTo(cx + 3.5, cy - 1.2, cx + 4.2, cy + 1.2, cx + 4.2, cy + 2.4);
    ctx.arc(cx, cy + 2.4, 4.2, 0, Math.PI, false);
    ctx.bezierCurveTo(cx - 4.2, cy + 1.2, cx - 3.5, cy - 1.2, cx, cy - 5.2);
    ctx.closePath();
    ctx.stroke();
  } else if (kind === "mail") {
    // Envelope icon
    roundRectPath(ctx, cx - 5.5, cy - 3.8, 11, 7.6, 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 3);
    ctx.lineTo(cx, cy + 0.8);
    ctx.lineTo(cx + 5, cy - 3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawField(ctx, x, y, label, value, maxW, iconKind) {
  ctx.fillStyle = "#0d2b55";
  ctx.beginPath();
  ctx.arc(x + 12, y + 12, 12, 0, Math.PI * 2);
  ctx.fill();

  drawCircleIcon(ctx, x + 12, y + 12, iconKind);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#64748b";
  ctx.font = "600 9.5px Inter, sans-serif";
  ctx.fillText(label, x + 31, y + 10);

  ctx.fillStyle = "#0d2b55";
  ctx.font = "700 11px Inter, sans-serif";
  drawTruncated(ctx, value || "—", x + 31, y + 23, maxW - 34);
}

function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Wraps a high-res JPEG in a single-page PDF 1.4 document with exact byte offsets. */
function buildPdfBlobFromJpeg(jpegBytes, imgW, imgH, pageW, pageH) {
  const enc = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let pos = 0;

  const pushStr = (s) => {
    const b = enc.encode(s);
    chunks.push(b);
    pos += b.length;
  };
  const pushBytes = (b) => {
    chunks.push(b);
    pos += b.length;
  };

  pushStr("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");

  const startObj = (id) => {
    offsets[id] = pos;
    pushStr(`${id} 0 obj\n`);
  };

  startObj(1);
  pushStr("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  startObj(2);
  pushStr("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  startObj(3);
  pushStr(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);

  startObj(4);
  pushStr(`<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  pushBytes(jpegBytes);
  pushStr("\nendstream\nendobj\n");

  const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;
  startObj(5);
  pushStr(`<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);

  const xrefPos = pos;
  pushStr(`xref\n0 6\n0000000000 65535 f \n`);
  for (let i = 1; i <= 5; i += 1) {
    pushStr(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);

  return new Blob(chunks, { type: "application/pdf" });
}

const EXPORT_SCALE = 4;

/**
 * Generates and downloads a high-resolution (4x DPI) file containing both the
 * Front and Back sides of the employee's ID card in PNG, JPEG, or PDF format.
 */
export async function downloadUserIdCard(user, roleTitle, format = "png") {
  const [logoImg, backImg, photoImg] = await Promise.all([
    loadImg(cybertrickLogo),
    loadImg(idCardBackDataUrl(user, EXPORT_SCALE)),
    loadSafePhoto(user.photo),
  ]);

  const cardW = 274;
  const cardH = 445;
  const gap = 20;
  const pad = 20;
  const logicalW = pad * 2 + cardW * 2 + gap;
  const logicalH = pad * 2 + cardH;

  const canvas = document.createElement("canvas");
  canvas.width = logicalW * EXPORT_SCALE;
  canvas.height = logicalH * EXPORT_SCALE;

  const ctx = canvas.getContext("2d");
  ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, logicalW, logicalH);

  // ── Front Card ────────────────────────────────────────────────────────────
  const fx = pad;
  const fy = pad;

  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.16)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  roundRectPath(ctx, fx, fy, cardW, cardH, 18);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, fx, fy, cardW, cardH, 18);
  ctx.clip();

  // Top-left two-tone ribbon (navy over orange)
  const orangeGrad = ctx.createLinearGradient(fx, fy + 95, fx + 120, fy);
  orangeGrad.addColorStop(0, "#e8590c");
  orangeGrad.addColorStop(0.55, "#f7931e");
  orangeGrad.addColorStop(1, "#fbb040");
  ctx.fillStyle = orangeGrad;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx + 126, fy);
  ctx.bezierCurveTo(fx + 80, fy + 22, fx + 33, fy + 52, fx, fy + 100);
  ctx.closePath();
  ctx.fill();

  const blueGrad = ctx.createLinearGradient(fx, fy, fx + 85, fy + 80);
  blueGrad.addColorStop(0, "#0a2348");
  blueGrad.addColorStop(1, "#0d2b55");
  ctx.fillStyle = blueGrad;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx + 91, fy);
  ctx.bezierCurveTo(fx + 56, fy + 19, fx + 25, fy + 46, fx, fy + 85);
  ctx.closePath();
  ctx.fill();

  // Lanyard slot
  roundRectPath(ctx, fx + cardW / 2 - 26, fy + 12, 52, 10, 5);
  ctx.fillStyle = "#e2e8f0";
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Company logo
  if (logoImg) {
    const lh = 44;
    const lw = (logoImg.width / logoImg.height) * lh;
    ctx.drawImage(logoImg, fx + (cardW - lw) / 2, fy + 40, lw, lh);
  }

  // Passport photo
  const pw = 108;
  const ph = 124;
  const px = fx + (cardW - pw) / 2;
  const py = fy + 96;

  ctx.save();
  roundRectPath(ctx, px, py, pw, ph, 13);
  ctx.fillStyle = "#eef2ff";
  ctx.fill();
  ctx.clip();
  if (photoImg) {
    drawCoverImage(ctx, photoImg, px, py, pw, ph);
  } else {
    const initials = (user.name || "?").trim().split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    ctx.fillStyle = "#0d2b55";
    ctx.font = "700 30px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, px + pw / 2, py + ph / 2);
  }
  ctx.restore();
  roundRectPath(ctx, px, py, pw, ph, 13);
  ctx.strokeStyle = "#0d2b55";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Name
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 16px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(user.name || "", fx + cardW / 2, py + ph + 26, cardW - 28);

  // Designation pill
  const pillText = user.designation || roleTitle || "";
  ctx.font = "600 11px Inter, sans-serif";
  const pillW = Math.min(cardW - 44, Math.max(100, ctx.measureText(pillText).width + 32));
  const pillX = fx + (cardW - pillW) / 2;
  const pillY = py + ph + 36;
  const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX, pillY + 23);
  pillGrad.addColorStop(0, "#0d2b55");
  pillGrad.addColorStop(1, "#0a2348");
  roundRectPath(ctx, pillX, pillY, pillW, 23, 11.5);
  ctx.fillStyle = pillGrad;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pillText, fx + cardW / 2, pillY + 12, pillW - 14);

  // Divider
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(fx + 18, pillY + 38, cardW - 36, 1);

  // Fields: Emp Code · Department · Blood Group in three columns, then Email ID.
  const rowY = pillY + 50;
  const colW = (cardW - 34) / 3;
  const stat = (i, label, value, iconKind) => {
    const cx = fx + 17 + colW * i + colW / 2;
    ctx.fillStyle = "#0d2b55";
    ctx.beginPath();
    ctx.arc(cx, rowY + 11, 11.5, 0, Math.PI * 2);
    ctx.fill();
    drawCircleIcon(ctx, cx, rowY + 11, iconKind);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#64748b";
    ctx.font = "600 9.5px Inter, sans-serif";
    ctx.fillText(label, cx, rowY + 35);
    ctx.fillStyle = "#0d2b55";
    ctx.font = "700 11px Inter, sans-serif";
    let v = String(value || "—");
    while (v.length > 1 && ctx.measureText(v).width > colW - 8) v = v.slice(0, -1);
    ctx.fillText(v === String(value || "—") ? v : `${v.slice(0, -1)}…`, cx, rowY + 49);
    if (i > 0) { ctx.fillStyle = "#e2e8f0"; ctx.fillRect(fx + 17 + colW * i, rowY, 1, 52); }
  };
  stat(0, "Emp Code", user.empCode, "emp");
  stat(1, "Department", user.department || roleTitle, "dept");
  stat(2, "Blood Group", user.bloodGroup, "blood");
  ctx.textAlign = "left";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(fx + 18, rowY + 62, cardW - 36, 1);
  const emailX = fx + 17 + colW / 2 - 12;
  drawField(ctx, emailX, rowY + 72, "Email ID", user.email || "—", fx + cardW - 17 - emailX, "mail");

  // Footer
  const footerH = 36;
  // Solid navy with a thin orange edge on top (same as on screen / the back side).
  const footerPath = (top) => {
    ctx.beginPath();
    ctx.moveTo(fx, top + 14);
    ctx.quadraticCurveTo(fx, top, fx + 16, top);
    ctx.lineTo(fx + cardW, top);
    ctx.lineTo(fx + cardW, fy + cardH);
    ctx.lineTo(fx, fy + cardH);
    ctx.closePath();
  };
  footerPath(fy + cardH - footerH);
  ctx.fillStyle = "#f7931e";
  ctx.fill();
  footerPath(fy + cardH - footerH + 3);
  ctx.fillStyle = "#0d2b55";
  ctx.fill();

  const urlText = "www.cybertricksmedia.com";
  ctx.font = "500 11px Inter, sans-serif";
  const urlW = ctx.measureText(urlText).width;
  const totalFooterW = 13 + 8 + 1 + 8 + urlW; // globe + gap + | + gap + url
  const startX = fx + (cardW - totalFooterW) / 2;
  const fCy = fy + cardH - footerH / 2 + 1.5;

  // White globe icon
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(startX + 6, fCy, 5.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(startX + 6, fCy, 2.6, 5.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(startX + 0.5, fCy);
  ctx.lineTo(startX + 11.5, fCy);
  ctx.stroke();
  ctx.restore();

  // Divider "|"
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.fillRect(startX + 20, fCy - 5.5, 1, 11);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(urlText, startX + 29, fCy);

  ctx.restore();
  roundRectPath(ctx, fx, fy, cardW, cardH, 18);
  ctx.strokeStyle = "#dce5f2";
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── Back Card ─────────────────────────────────────────────────────────────
  const bx = pad + cardW + gap;
  const by = pad;

  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.16)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  roundRectPath(ctx, bx, by, cardW, cardH, 18);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, bx, by, cardW, cardH, 18);
  ctx.clip();
  // The back is drawn in code as SVG (utils/idCardBackSvg.js) at the card's exact size.
  if (backImg) {
    ctx.drawImage(backImg, bx, by, cardW, cardH);
  }
  ctx.restore();
  roundRectPath(ctx, bx, by, cardW, cardH, 18);
  ctx.strokeStyle = "#dce5f2";
  ctx.lineWidth = 1;
  ctx.stroke();

  const safeName = (user.name || "employee").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const fmt = String(format || "png").toLowerCase();
  const link = document.createElement("a");

  if (fmt === "pdf") {
    const jpegUrl = canvas.toDataURL("image/jpeg", 0.98);
    const jpegBytes = dataUrlToUint8Array(jpegUrl);
    const pdfBlob = buildPdfBlobFromJpeg(jpegBytes, canvas.width, canvas.height, logicalW, logicalH);
    const objUrl = URL.createObjectURL(pdfBlob);
    link.download = `${safeName}-id-card.pdf`;
    link.href = objUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
    return;
  }

  if (fmt === "jpeg" || fmt === "jpg") {
    link.download = `${safeName}-id-card.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.98);
  } else {
    link.download = `${safeName}-id-card.png`;
    link.href = canvas.toDataURL("image/png");
  }

  document.body.appendChild(link);
  link.click();
  link.remove();
}
