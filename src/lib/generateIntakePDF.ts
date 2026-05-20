import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import path from 'path';

export interface SubmissionData {
  id: string;
  full_name: string;
  preferred_name: string | null;
  email: string;
  phone: string;
  date_of_birth: string;
  pronouns: string | null;
  session_format: string;
  referral_source: string;
  referral_source_other: string | null;
  reason_for_therapy: string;
  diagnosed_conditions: string | null;
  previous_therapy: boolean | null;
  previous_therapy_details: string | null;
  current_medication: string | null;
  seeing_psychiatrist: boolean | null;
  psychiatrist_details: string | null;
  uses_ai_tools: string | null;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  gp_name: string | null;
  gp_practice: string | null;
  additional_info: string | null;
  submitted_at: string;
}

const FOREST = '#2A4D3C';
const GOLD = '#D4A843';
const DARK = '#333333';
const MUTED = '#888888';
const L = 50;
const PAGE_W = 595.28;
const W = PAGE_W - L * 2;
const COL_LABEL = 145;

const FORMAT_LABELS: Record<string, string> = {
  in_person: 'In Person',
  online: 'Online',
  no_preference: 'No Preference',
};
const AI_LABELS: Record<string, string> = {
  yes: 'Yes',
  sometimes: 'Sometimes',
  no: 'No',
};

export async function generateIntakePDF(data: SubmissionData): Promise<Buffer> {
  const svgPath = path.join(process.cwd(), 'public/images/logo-stacked-light-bg.svg');
  const logoPng = await sharp(svgPath).resize(480, 560).png().toBuffer();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: L, right: L },
      bufferPages: true,
      info: {
        Title: `Intake Form — ${data.full_name}`,
        Author: 'Owen Lynch Psychotherapy',
        Subject: 'Client Intake',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('error', reject);

    // ── Cream background on every page ─────────────────────────────────────────
    function paintBackground() {
      doc.save().rect(0, 0, doc.page.width, doc.page.height).fill('#F5F0E8').restore();
    }
    paintBackground();
    doc.on('pageAdded', () => paintBackground());

    // ── Helpers ────────────────────────────────────────────────────────────────

    function hline(y: number, color = GOLD, width = 0.75) {
      doc.save().moveTo(L, y).lineTo(L + W, y)
        .strokeColor(color).lineWidth(width).stroke().restore();
    }

    function addField(label: string, rawValue: string | boolean | null | undefined) {
      if (rawValue === null || rawValue === undefined || rawValue === '') return;
      const value = typeof rawValue === 'boolean'
        ? (rawValue ? 'Yes' : 'No')
        : rawValue.trim();
      if (!value) return;

      const y0 = doc.y;

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(FOREST)
        .text(label, L, y0, { width: COL_LABEL - 8, lineBreak: true });
      const y1 = doc.y;

      doc.font('Helvetica').fontSize(10).fillColor(DARK)
        .text(value, L + COL_LABEL, y0, { width: W - COL_LABEL, lineBreak: true, lineGap: 1 });
      const y2 = doc.y;

      // Advance cursor past whichever column was taller
      const nextY = Math.max(y1, y2) + 7;
      doc.text('', L, nextY);
    }

    function addSection(title: string, fn: () => void) {
      // Page break if too close to bottom
      if (doc.y > doc.page.height - 160) doc.addPage();

      const y = doc.y;
      doc.font('Helvetica-Bold').fontSize(8).fillColor(FOREST)
        .text(title, L, y, { characterSpacing: 1.5, width: W });
      doc.moveDown(0.25);
      hline(doc.y, GOLD, 0.5);
      doc.moveDown(0.7);

      fn();
      doc.moveDown(0.5);
    }

    // ── Header ─────────────────────────────────────────────────────────────────

    const logoW = 108;
    const logoH = Math.round(logoW * 280 / 240); // preserve 240×280 aspect ratio
    const logoX = (doc.page.width - logoW) / 2;
    doc.image(logoPng, logoX, 44, { width: logoW });
    doc.y = 44 + logoH + 10;

    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
      .text('Client Intake Form', { align: 'center' });
    doc.moveDown(0.7);

    hline(doc.y);
    doc.moveDown(0.6);

    const submitted = new Date(data.submitted_at).toLocaleDateString('en-IE', { dateStyle: 'long' });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
      .text(`Submitted: ${submitted}`, L, doc.y, { align: 'right', width: W });
    doc.moveDown(1.2);

    // ── Sections ───────────────────────────────────────────────────────────────

    addSection('PERSONAL DETAILS', () => {
      addField('Full Name', data.full_name);
      addField('Preferred Name', data.preferred_name);
      addField('Email', data.email);
      addField('Phone', data.phone);
      addField('Date of Birth', data.date_of_birth);
      addField('Pronouns', data.pronouns);
    });

    addSection('SESSION PREFERENCES', () => {
      addField('Preferred Format', FORMAT_LABELS[data.session_format] ?? data.session_format);
      addField('Referral Source', data.referral_source);
      addField('Referral Detail', data.referral_source_other);
    });

    addSection('ABOUT YOU', () => {
      addField('Reason for Seeking Therapy', data.reason_for_therapy);
      addField('Diagnosed Conditions', data.diagnosed_conditions);
      addField('Previous Therapy', data.previous_therapy);
      addField('Previous Therapy Details', data.previous_therapy_details);
      addField('Current Medication', data.current_medication);
    });

    addSection('OTHER SUPPORT', () => {
      addField('Currently Seeing a Psychiatrist', data.seeing_psychiatrist);
      addField('Psychiatrist Details', data.psychiatrist_details);
      addField('Uses AI Tools for Mental Health', data.uses_ai_tools ? (AI_LABELS[data.uses_ai_tools] ?? data.uses_ai_tools) : null);
    });

    addSection('EMERGENCY CONTACT', () => {
      addField('Name', data.emergency_contact_name);
      addField('Phone', data.emergency_contact_phone);
      addField('Relationship', data.emergency_contact_relationship);
    });

    if (data.gp_name || data.gp_practice) {
      addSection('GP DETAILS', () => {
        addField('GP Name', data.gp_name);
        addField('GP Practice', data.gp_practice);
      });
    }

    if (data.additional_info?.trim()) {
      addSection('ADDITIONAL INFORMATION', () => {
        addField('Notes', data.additional_info);
      });
    }

    // ── Footer on every page ───────────────────────────────────────────────────

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const footerY = doc.page.height - 32;
      const pageLabel = range.count > 1 ? `Page ${i + 1} of ${range.count}  ·  ` : '';
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
        .text(`${pageLabel}Owen Lynch Psychotherapy · Confidential`, L, footerY, {
          align: 'center',
          width: W,
        });
    }

    doc.end();

    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
