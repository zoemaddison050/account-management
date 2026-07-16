import { jsPDF, type AcroFormTextField } from 'jspdf';
import type { ApplicationDraft } from './applicationFlow';
import type { AccountManager } from '../types';

const blue = '#00AEEF';
const navy = '#052F48';
const orange = '#FFB000';
const lineColor = '#D9E8EF';
const inkSoftColor = '#426177';
const inkMutedColor = '#6f8492';
const inkColor = '#082F47';

function addField(
  doc: jsPDF,
  name: string,
  value: string,
  x: number,
  y: number,
  width: number,
  options: { readOnly?: boolean; multiline?: boolean; required?: boolean; height?: number } = {},
) {
  // jsPDF exposes this as a constructor at runtime, while its TypeScript
  // declaration models it as a factory. The narrow cast keeps both aligned.
  const TextField = doc.AcroForm.TextField as unknown as new () => AcroFormTextField;
  const field = new TextField();
  field.fieldName = name;
  field.value = value;
  field.defaultValue = value;
  field.x = x;
  field.y = y;
  field.width = width;
  field.height = options.height ?? 8;
  field.fontName = 'helvetica';
  field.fontStyle = 'normal';
  field.fontSize = 9;
  field.maxFontSize = 9;
  field.color = navy;
  field.readOnly = options.readOnly ?? false;
  field.multiline = options.multiline ?? false;
  field.required = options.required ?? false;
  field.hasAppearanceStream = true;
  doc.addField(field);
}

function label(doc: jsPDF, value: string, x: number, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(navy);
  doc.text(value.toUpperCase(), x, y);
}

function sectionHeading(doc: jsPDF, value: string, y: number) {
  doc.setFillColor(navy);
  doc.roundedRect(15, y, 180, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor('#FFFFFF');
  doc.text(value, 19, y + 6);
}

function findManager(name: string, managers: AccountManager[]): AccountManager | undefined {
  return managers.find((m) => m.name === name);
}

/**
 * Formats a date string (ISO or any parseable date) into the consistent
 * display format used throughout the PDF: "13 Jul 2026".
 *
 * Date-only ISO strings (YYYY-MM-DD, e.g. from an HTML <input type="date">)
 * are parsed as UTC midnight by default, which can shift the displayed day
 * in non-UTC timezones. We append 'T00:00:00' to force local-time parsing.
 */
function formatDate(value: string): string {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T00:00:00' : value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Draws a signature block with a signature area, printed name, role, and date.
 * Company and manager signatures use a provided PNG image. The applicant
 * signature is embedded from the on-screen pad if provided, otherwise left
 * blank for printing and signing by hand.
 */
function drawSignatureBlock(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  opts: {
    header: string;
    signatureText?: string;
    signatureImage?: string;
    signatureAspectRatio?: number;
    printedName: string;
    role: string;
    email?: string;
    date?: string;
    blankSignature?: boolean;
    blankDate?: boolean;
    fieldNamePrefix: string;
  },
) {
  // Header label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(navy);
  doc.text(opts.header, x, y);

  const sigLineY = y + 20;

  // Signature content above the line
  if (opts.blankSignature) {
    addField(doc, `${opts.fieldNamePrefix}_signature`, '', x, y + 4, width, {
      height: 14,
    });
  } else if (opts.signatureImage) {
    // Embed the drawn signature preserving the canvas aspect ratio.
    // Max area: full column width × 16mm height. Scale to fit both.
    const maxW = width;
    const maxH = 16;
    let imgW = maxW;
    let imgH = maxH;
    if (opts.signatureAspectRatio && opts.signatureAspectRatio > 0) {
      const ratio = opts.signatureAspectRatio; // width / height
      // Try full width first, check if height fits
      imgH = imgW / ratio;
      if (imgH > maxH) {
        imgH = maxH;
        imgW = imgH * ratio;
      }
    }
    // Center horizontally within the column
    const imgX = x + (width - imgW) / 2;
    doc.addImage(opts.signatureImage, 'PNG', imgX, y + 2, imgW, imgH, undefined, 'FAST');
  } else if (opts.signatureText) {
    doc.setFont('times', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(navy);
    doc.text(opts.signatureText, x + 2, y + 14);
  }

  // Signature line
  doc.setDrawColor(lineColor);
  doc.setLineWidth(0.3);
  doc.line(x, sigLineY, x + width, sigLineY);

  // "Signature" label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(inkMutedColor);
  doc.text('Signature', x, sigLineY + 3);

  // Printed name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(navy);
  doc.text(opts.printedName, x, sigLineY + 9);

  // Role
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(inkSoftColor);
  doc.text(opts.role, x, sigLineY + 13.5);

  // Email (if provided)
  if (opts.email) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(inkMutedColor);
    doc.text(opts.email, x, sigLineY + 17.5);
  }

  // Date
  const dateY = sigLineY + 23;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(navy);
  doc.text('DATE', x, dateY);

  if (opts.blankDate) {
    addField(doc, `${opts.fieldNamePrefix}_date`, '', x + 14, dateY - 2, width - 14);
  } else if (opts.date) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(inkColor);
    doc.text(opts.date, x + 14, dateY);
  }
}

/**
 * Options for generating the application PDF.
 */
export interface ApplicationPdfOptions {
  applicantSignatureDataUrl?: string | null;
  applicantDate?: string;
  applicantSignatureAspectRatio?: number;
  managers?: AccountManager[];
  companySignatureImage?: string | null;
  companySignatureAspectRatio?: number;
  managerSignatureImage?: string | null;
  managerSignatureAspectRatio?: number;
}

/**
 * Creates an application PDF with a three-party signature section:
 *   1. Company signature
 *   2. Account manager signature (from the applicant's selection)
 *   3. Applicant signature — embedded from the on-screen pad if provided,
 *      otherwise left blank for printing and signing by hand.
 */
export function downloadApplicationPdf(
  draft: ApplicationDraft,
  options: ApplicationPdfOptions = {},
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', putOnlyUsedFonts: true });
  const fullName = `${draft.firstName} ${draft.lastName}`;
  const issuedDate = formatDate(draft.submittedAt);

  // ---- Header ----
  doc.setFillColor(navy);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setFillColor(blue);
  doc.rect(0, 30, 210, 2, 'F');
  doc.setFillColor(orange);
  doc.rect(0, 32, 70, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor('#FFFFFF');
  const logoX = 15;
  const logoY = 14;
  doc.text('PRIME', logoX, logoY);
  let logoCursor = logoX + doc.getTextWidth('PRIME') + 0.6;
  doc.setTextColor(blue);
  doc.text('X', logoCursor, logoY);
  logoCursor += doc.getTextWidth('X') + 0.6;
  doc.setTextColor(orange);
  doc.text('CHANGES', logoCursor, logoY);
  doc.setFontSize(7.5);
  doc.setTextColor('#D7F4FF');
  doc.text('ACCOUNT MANAGEMENT  •  APPLICATION WORKSHEET', 15, 21);



  // ---- Intro ----
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#304D60');
  doc.text('Your submitted details are shown below. Complete the applicant signature and return the form to PrimeXchanges.', 15, 42);

  // ---- Section 1: Application reference (prefilled) ----
  sectionHeading(doc, '1. Application reference', 49);
  label(doc, 'Reference', 18, 65);
  addField(doc, 'application_reference', draft.reference, 18, 67, 54, { readOnly: true });
  label(doc, 'Issued date', 78, 65);
  addField(doc, 'issued_date', issuedDate, 78, 67, 42, { readOnly: true });
  label(doc, 'Form version', 126, 65);
  addField(doc, 'form_version', 'APPLICATION-v1.0', 126, 67, 62, { readOnly: true });

  // ---- Section 2: Applicant details ----
  sectionHeading(doc, '2. Applicant details', 82);
  label(doc, 'Full name', 18, 98);
  addField(doc, 'applicant_full_name', fullName, 18, 100, 82, { readOnly: true });
  label(doc, 'Email address', 106, 98);
  addField(doc, 'applicant_email', draft.email, 106, 100, 82, { readOnly: true });
  label(doc, 'Country / region of residence', 18, 116);
  addField(doc, 'country_of_residence', draft.country, 18, 118, 82, { readOnly: true });
  label(doc, 'Preferred account manager', 106, 116);
  addField(doc, 'preferred_manager', draft.preferredManager, 106, 118, 82, { readOnly: true });
  label(doc, 'Telephone number', 18, 134);
  addField(doc, 'telephone', '', 18, 136, 82, { required: true });
  label(doc, 'Tax residence (if different)', 106, 134);
  addField(doc, 'tax_residence', '', 106, 136, 82);

  // ---- Section 3: Declarations & signatures ----
  sectionHeading(doc, '3. Declarations & signatures', 151);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#304D60');
  doc.text(
    'By signing below, the applicant confirms that the information provided above is accurate and complete, and consents to be contacted by PrimeXchanges regarding the account management service.',
    15, 163, { maxWidth: 180 },
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(navy);
  doc.text('THREE SIGNATURES ARE REQUIRED TO COMPLETE THIS APPLICATION', 15, 175);

  // Resolve account manager details from the server-managed roster
  const managers = options.managers ?? [];
  const manager = findManager(draft.preferredManager, managers);
  const isNoPreference = draft.preferredManager === 'No preference';
  const managerName = isNoPreference ? 'PrimeXchanges' : (manager?.name ?? draft.preferredManager);
  const managerTitle = isNoPreference ? 'Account Management Team' : (manager?.title ?? 'Account Manager');
  const managerEmail = isNoPreference ? 'support@primexchanges.com' : (manager?.email ?? 'support@primexchanges.com');

  // Three-column signature layout
  const col1X = 15;
  const col2X = 76;
  const col3X = 137;
  const colWidth = 57;
  const sigY = 183;

  // 1. Company signature
  drawSignatureBlock(doc, col1X, sigY, colWidth, {
    header: 'FOR THE COMPANY',
    signatureText: 'PrimeXchanges',
    signatureImage: options.companySignatureImage ?? undefined,
    signatureAspectRatio: options.companySignatureAspectRatio,
    printedName: 'PrimeXchanges Ltd.',
    role: 'Authorised Service Provider',
    email: 'support@primexchanges.com',
    date: issuedDate,
    fieldNamePrefix: 'company',
  });

  // 2. Account manager signature
  drawSignatureBlock(doc, col2X, sigY, colWidth, {
    header: 'ACCOUNT MANAGER',
    signatureText: managerName,
    signatureImage: options.managerSignatureImage ?? undefined,
    signatureAspectRatio: options.managerSignatureAspectRatio,
    printedName: managerName,
    role: managerTitle,
    email: managerEmail,
    date: issuedDate,
    fieldNamePrefix: 'manager',
  });

  // 3. Applicant signature — embedded from pad or blank for hand-signing
  drawSignatureBlock(doc, col3X, sigY, colWidth, {
    header: options.applicantSignatureDataUrl ? 'APPLICANT (SIGNED)' : 'APPLICANT (TO BE SIGNED)',
    blankSignature: !options.applicantSignatureDataUrl,
    signatureImage: options.applicantSignatureDataUrl ?? undefined,
    signatureAspectRatio: options.applicantSignatureAspectRatio,
    printedName: fullName,
    role: 'Applicant',
    blankDate: !options.applicantDate,
    date: options.applicantDate ? formatDate(options.applicantDate) : undefined,
    fieldNamePrefix: 'applicant',
  });

  // ---- Return instructions ----
  const returnBoxY = 238;
  doc.setFillColor('#E8F7FD');
  doc.roundedRect(15, returnBoxY, 180, 38, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(navy);
  doc.text('How to return this form', 20, returnBoxY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor('#304D60');
  if (options.applicantSignatureDataUrl) {
    // Digital signing workflow — no print/scan needed
    doc.text('1.  Your signature has been applied above. Review the form for accuracy.', 20, returnBoxY + 17, { maxWidth: 167 });
    doc.text('2.  Save this PDF file to your device.', 20, returnBoxY + 23, { maxWidth: 167 });
    doc.text('3.  Email the signed PDF to support@primexchanges.com with your reference number.', 20, returnBoxY + 29, { maxWidth: 167 });
  } else {
    // Hand-signing fallback workflow
    doc.text('1.  Print this form and sign in the Applicant signature area above.', 20, returnBoxY + 17, { maxWidth: 167 });
    doc.text('2.  Scan or clearly photograph the signed document.', 20, returnBoxY + 23, { maxWidth: 167 });
    doc.text('3.  Email the signed form to support@primexchanges.com with your reference number.', 20, returnBoxY + 29, { maxWidth: 167 });
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor('#b83a3a');
  doc.text('Never email passwords, credentials, card details, wallet recovery phrases, API keys or identity documents.', 20, returnBoxY + 35, { maxWidth: 167 });

  // ---- Footer ----
  doc.setFontSize(6.8);
  doc.setTextColor('#5C7484');
  doc.text(`Generated for ${fullName} • ${draft.reference}`, 15, 285);

  doc.save(`PrimeXchanges-${draft.reference}-application.pdf`);
}
