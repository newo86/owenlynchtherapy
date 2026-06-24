import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Branded receipt + statement PDFs for a client's sessions. Mirrors the look
// of the intake PDF (same logo header, forest/gold palette). Admin-only; used
// by the receipts download routes.

const FOREST = '#2A4D3C';
const GOLD = '#D4A843';
const SAGE = '#4F8A68';
const DARK = '#333333';
const MUTED = '#888888';
const L = 50;
const PAGE_W = 595.28;
const W = PAGE_W - L * 2;

const FORMAT_LABELS: Record<string, string> = {
  in_person: 'In Person',
  online: 'Online',
  no_preference: 'No Preference',
};

export interface ReceiptSession {
  session_date: string;   // UTC ISO
  session_format: string;
  fee: number;            // cents
  payment_status: string;
  paid_at: string | null;
}

export interface ReceiptData {
  clientName: string;
  session: ReceiptSession;
}

export interface StatementData {
  clientName: string;
  generatedAt: string;    // ISO
  sessions: ReceiptSession[];
}

function dublinDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Dublin',
  });
}
function dublinDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Dublin',
  });
}
function dublinTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IE', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Dublin',
  });
}
const euros = (cents: number) => `€${Math.round((cents ?? 0) / 100)}`;

function loadLogo(): Buffer | null {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'logo-horizontal-pdf.png');
  try {
    return fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;
  } catch {
    return null;
  }
}

// Shared header: centred logo + a subtitle. Returns once the cursor is below it.
function header(doc: PDFKit.PDFDocument, logo: Buffer | null, subtitle: string) {
  const logoW = 220;
  const logoH = Math.round((logoW * 240) / 960);
  if (logo) {
    doc.image(logo, (doc.page.width - logoW) / 2, 44, { width: logoW });
    doc.y = 44 + logoH + 12;
  } else {
    doc.font('Helvetica-Bold').fontSize(16).fillColor(FOREST)
      .text('Owen Lynch Psychotherapy', { align: 'center' });
    doc.moveDown(0.3);
  }
  doc.font('Helvetica').fontSize(9).fillColor(MUTED)
    .text(subtitle, { align: 'center', characterSpacing: 1.5 });
  doc.moveDown(1.2);
}

function footer(doc: PDFKit.PDFDocument) {
  const y = doc.page.height - 70;
  doc.save().moveTo(L, y).lineTo(L + W, y).strokeColor(GOLD).lineWidth(0.5).stroke().restore();
  doc.font('Helvetica').fontSize(8).fillColor(MUTED)
    .text('Owen Lynch Psychotherapy · IAHIP & ICP Accredited · Dublin & Online', L, y + 8, { width: W, align: 'center' })
    .text('owenlynchtherapy.com · info@owenlynchtherapy.com', { width: W, align: 'center' });
}

function buildToBuffer(build: (doc: PDFKit.PDFDocument) => void, info: PDFKit.DocumentInfo): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 70, left: L, right: L }, info });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    build(doc);
    doc.end();
  });
}

/** Single-session receipt. */
export async function generateReceiptPDF(data: ReceiptData): Promise<Buffer> {
  const logo = loadLogo();
  const { clientName, session } = data;
  const isOnline = session.session_format === 'online';

  return buildToBuffer((doc) => {
    header(doc, logo, 'RECEIPT');

    doc.font('Helvetica').fontSize(11).fillColor(DARK)
      .text(`Issued to: `, { continued: true })
      .font('Helvetica-Bold').text(clientName);
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
      .text(`Receipt date: ${dublinDateShort(session.paid_at ?? session.session_date)}`);
    doc.moveDown(1);

    // Detail rows
    const row = (label: string, value: string, bold = false) => {
      const y = doc.y;
      doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(label, L, y, { width: 160 });
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10)
        .fillColor(bold ? FOREST : DARK).text(value, L + 160, y, { width: W - 160 });
      doc.moveDown(bold ? 0.6 : 0.5);
    };

    doc.save().rect(L, doc.y, W, 0).restore();
    row('Date', `${dublinDate(session.session_date)} at ${dublinTime(session.session_date)}`);
    row('Service', 'Psychotherapy Session (50 minutes)');
    row('Format', isOnline ? 'Online' : 'In Person — Insight Matters, Capel Street, Dublin');
    row('Amount', euros(session.fee), true);
    const paid = session.payment_status === 'paid';
    const y = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('Status', L, y, { width: 160 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(paid ? SAGE : '#A04714')
      .text(paid ? `Paid${session.paid_at ? ` on ${dublinDateShort(session.paid_at)}` : ''}` : 'Unpaid', L + 160, y);
    doc.moveDown(2);

    doc.font('Helvetica').fontSize(10).fillColor(DARK)
      .text('Thank you for your payment.', L, doc.y, { width: W });

    footer(doc);
  }, { Title: `Receipt — ${clientName}`, Author: 'Owen Lynch Psychotherapy', Subject: 'Session receipt' });
}

/** Statement listing every session for a client. */
export async function generateStatementPDF(data: StatementData): Promise<Buffer> {
  const logo = loadLogo();
  const { clientName, generatedAt, sessions } = data;

  // Newest first.
  const rows = [...sessions].sort(
    (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime(),
  );
  const totalPaid = rows.filter(s => s.payment_status === 'paid').reduce((n, s) => n + (s.fee ?? 0), 0);
  const paidCount = rows.filter(s => s.payment_status === 'paid').length;

  // Column x-offsets within W.
  const cDate = L;
  const cFormat = L + 150;
  const cFee = L + 270;
  const cStatus = L + 340;
  const cPaid = L + 420;

  return buildToBuffer((doc) => {
    header(doc, logo, 'STATEMENT OF ACCOUNT');

    doc.font('Helvetica').fontSize(11).fillColor(DARK)
      .text('Client: ', { continued: true }).font('Helvetica-Bold').text(clientName);
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
      .text(`Generated ${dublinDateShort(generatedAt)} · ${rows.length} session${rows.length === 1 ? '' : 's'}`);
    doc.moveDown(1);

    // Table header
    const headerRow = (y: number) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(FOREST);
      doc.text('DATE', cDate, y, { width: cFormat - cDate - 6 });
      doc.text('FORMAT', cFormat, y, { width: cFee - cFormat - 6 });
      doc.text('FEE', cFee, y, { width: cStatus - cFee - 6 });
      doc.text('STATUS', cStatus, y, { width: cPaid - cStatus - 6 });
      doc.text('PAID ON', cPaid, y, { width: L + W - cPaid });
      doc.save().moveTo(L, y + 14).lineTo(L + W, y + 14).strokeColor(GOLD).lineWidth(0.5).stroke().restore();
    };
    headerRow(doc.y);
    doc.moveDown(1.4);

    rows.forEach((s) => {
      if (doc.y > doc.page.height - 110) {
        doc.addPage();
        headerRow(doc.y);
        doc.moveDown(1.4);
      }
      const y = doc.y;
      const paid = s.payment_status === 'paid';
      doc.font('Helvetica').fontSize(9.5).fillColor(DARK);
      doc.text(dublinDateShort(s.session_date), cDate, y, { width: cFormat - cDate - 6 });
      doc.text(FORMAT_LABELS[s.session_format] ?? s.session_format, cFormat, y, { width: cFee - cFormat - 6 });
      doc.text(euros(s.fee), cFee, y, { width: cStatus - cFee - 6 });
      doc.fillColor(paid ? SAGE : '#A04714').text(paid ? 'Paid' : (s.payment_status === 'refunded' ? 'Refunded' : 'Unpaid'), cStatus, y, { width: cPaid - cStatus - 6 });
      doc.fillColor(DARK).text(s.paid_at ? dublinDateShort(s.paid_at) : '—', cPaid, y, { width: L + W - cPaid });
      doc.moveDown(0.9);
    });

    doc.moveDown(0.5);
    doc.save().moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor('#E0D8CE').lineWidth(0.5).stroke().restore();
    doc.moveDown(0.6);
    const ty = doc.y;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(FOREST)
      .text(`Total paid (${paidCount} session${paidCount === 1 ? '' : 's'})`, cDate, ty, { width: cFee - cDate });
    doc.font('Helvetica-Bold').fontSize(12).fillColor(FOREST)
      .text(euros(totalPaid), cFee, ty, { width: L + W - cFee });

    footer(doc);
  }, { Title: `Statement — ${clientName}`, Author: 'Owen Lynch Psychotherapy', Subject: 'Statement of account' });
}
