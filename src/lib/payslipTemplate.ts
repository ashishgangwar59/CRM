// Salary slip ("PAYSLIP") template — same design as the CRM web salary slip
// (CRM/src/app/dashboard/payroll/[id]/page.tsx).
//
// KEEP IN SYNC: an identical copy lives at crmapp/src/screens/payroll/payslipTemplate.ts (the
// mobile app PDF). It is plain TypeScript with no imports so both projects can share it.
//
// The markup is table-based with inline styles so it renders the same in a PDF
// (expo-print / browser print) and inside email clients (Gmail, Outlook), which ignore
// <style> blocks, flexbox and grid.

export interface PayslipCompany {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export const DEFAULT_PAYSLIP_COMPANY: Required<PayslipCompany> = {
  name: 'Niventra Capital Advisory India Capital Pvt. Ltd.',
  address: 'MEZZANINE LEVEL SHIVAJI STADIUM METRO STATION BABA KHARAK SINGH ROAD CONNAUGHT PLACE NEW DELHI 110001',
  phone: '18008900818',
  email: 'info@niventracapitaladvisory.com',
  website: 'www.niventracapitaladvisory.com',
};

const NAVY = '#134086';

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (n?: number) =>
  (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function payslipNumberToWords(num: number): string {
  num = Math.round(Number(num) || 0);
  if (num === 0) return 'Zero Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = ('000000000' + num).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  const two = (s: string) => a[Number(s)] || `${b[Number(s[0])]} ${a[Number(s[1])]}`;
  let str = '';
  str += Number(n[1]) ? two(n[1]) + 'Crore ' : '';
  str += Number(n[2]) ? two(n[2]) + 'Lakh ' : '';
  str += Number(n[3]) ? two(n[3]) + 'Thousand ' : '';
  str += Number(n[4]) ? two(n[4]) + 'Hundred ' : '';
  str += Number(n[5]) ? (str ? 'and ' : '') + two(n[5]) : '';
  return str.replace(/\s+/g, ' ').trim() + ' Only';
}

/** Same rules as CRM getSlipDays (src/lib/dateUtils.ts). */
export function payslipDays(p: any) {
  if (!p) return { totalDays: 30, paidDays: 30, lopDays: 0 };
  let totalDays = 30;
  if (p.monthYear) {
    const [y, m] = String(p.monthYear).split('-').map(Number);
    if (y && m) totalDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
  }
  if (p.salaryPeriodStart && p.salaryPeriodEnd) {
    const day = (v: any) => { const d = new Date(v); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
    const s = day(p.salaryPeriodStart), e = day(p.salaryPeriodEnd);
    if (!isNaN(s) && !isNaN(e) && e >= s) totalDays = Math.round((e - s) / 86400000) + 1;
  }
  const storedTotal = Number(p.totalDays) || 0;
  const lopDays = storedTotal > 0 && p.paidDays != null
    ? Math.min(Math.max(0, storedTotal - Number(p.paidDays)), totalDays)
    : 0;
  return { totalDays, paidDays: totalDays - lopDays, lopDays };
}

/** "October 2026" from "2026-10". */
export function payslipMonthLabel(monthYear?: string) {
  if (!monthYear) return '';
  const [y, m] = String(monthYear).split('-').map(Number);
  if (!y || !m) return String(monthYear);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Earning / deduction rows exactly as the web slip builds them. */
export function payslipRows(p: any) {
  const emp = p?.employeeId || {};
  const designation: string = p?.designation || emp.designation || '';
  const earn = p?.earnings || {};
  const ded = p?.deductions || {};
  const advance = ded.advanceSalaryDrawn || ded.advance || 0;
  const earnings: { label: string; amount: number }[] = [
    { label: 'Basic Salary', amount: earn.basic || 0 },
    { label: 'House Rent Allowance', amount: earn.hra || 0 },
    { label: 'Travel Allowance', amount: earn.travelAllowance || earn.metroAllowance || earn.specialAllowance || 0 },
    { label: 'Individual Incentive', amount: earn.personalIncentive || 0 },
    {
      label: designation.toLowerCase().includes('branch head') ? 'Full Branch Incentive' : 'Team Performance Incentive',
      amount: earn.teamBusinessIncentive || 0,
    },
    ...(earn.bonus > 0 ? [{ label: 'Performance Bonus', amount: earn.bonus }] : []),
    ...(earn.overtimeAmount > 0 ? [{ label: 'Overtime', amount: earn.overtimeAmount }] : []),
    ...(earn.otherEarnings > 0 ? [{ label: 'Other Earnings', amount: earn.otherEarnings }] : []),
  ];
  const deductions: { label: string; amount: number }[] = [
    { label: 'Provident Fund (PF)', amount: ded.pf || 0 },
    { label: 'ESI Contribution', amount: ded.esi || 0 },
    { label: 'Professional Tax', amount: ded.professionalTax || 0 },
    { label: 'Income Tax (TDS)', amount: ded.incomeTax || 0 },
    ...(advance > 0 ? [{ label: 'Advance Salary Recovery', amount: advance }] : []),
    ...(ded.loan > 0 ? [{ label: 'Loan Recovery', amount: ded.loan }] : []),
    ...(ded.unpaidLeaveDeduction > 0 ? [{ label: 'Loss of Pay (LOP)', amount: ded.unpaidLeaveDeduction }] : []),
    ...(ded.otherDeductions > 0 ? [{ label: 'Other Deductions', amount: ded.otherDeductions }] : []),
  ];
  return { designation, earnings, deductions };
}

/**
 * Full HTML document for one salary slip.
 * @param p        payroll record with `employeeId` populated (full employee: kyc, bankDetails, dateOfJoining)
 * @param company  company profile from settings (blank fields fall back to the defaults)
 * @param logoSrc  image URL or data URI for the logo (email: absolute https URL; PDF: data URI)
 */
export function buildPayslipHtml(p: any, company?: PayslipCompany, logoSrc?: string): string {
  const co = { ...DEFAULT_PAYSLIP_COMPANY };
  Object.entries(company || {}).forEach(([k, v]) => { if (v) (co as any)[k] = v; });

  const emp = p?.employeeId || {};
  const monthLabel = payslipMonthLabel(p?.monthYear);
  const { designation, earnings, deductions } = payslipRows(p);
  const { totalDays, paidDays, lopDays } = payslipDays(p);
  const doj = emp.dateOfJoining
    ? new Date(emp.dateOfJoining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  const details: [string, string][] = [
    ['Employee Name', `${emp.firstName || ''} ${emp.lastName || ''}`.trim()],
    ['Employee Code', emp.employeeCode],
    ['Designation', designation],
    ['Department', emp.department],
    ['Date of Joining', doj],
    ['PAN', emp.kyc?.panNumber],
    ['Bank Name', emp.bankDetails?.bankName],
    ['Bank A/C No.', emp.bankDetails?.accountNumber],
  ];
  const attendance: [string, string | number][] = [
    ['Total Days', totalDays],
    ['Paid Days', paidDays],
    ['LOP Days', lopDays],
    ['Pay Mode', p?.payMode === 'Cash' ? 'Cash' : 'Account'],
    ['Status', p?.status || '—'],
  ];

  const font = "font-family:Inter,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;";
  const sectionTitle = (t: string) =>
    `<div style="${font}font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${NAVY};margin:0 0 6px 0;">${t}</div>`;

  // Employee details: 2 pairs per row, label cell tinted.
  let detailRows = '';
  for (let i = 0; i < details.length; i += 2) {
    const last = i >= details.length - 2;
    const cell = ([label, value]: [string, string], left: boolean) =>
      `<td width="21%" style="${font}background:#f9fafb;color:#6b7280;font-weight:500;font-size:12px;padding:9px 12px;${last ? '' : 'border-bottom:1px solid #e5e7eb;'}">${esc(label)}</td>` +
      `<td width="29%" style="${font}color:#111827;font-weight:600;font-size:12px;padding:9px 12px;word-break:break-all;${left ? 'border-right:1px solid #e5e7eb;' : ''}${last ? '' : 'border-bottom:1px solid #e5e7eb;'}">${esc(value || '—')}</td>`;
    detailRows += `<tr>${cell(details[i], true)}${details[i + 1] ? cell(details[i + 1], false) : '<td></td><td></td>'}</tr>`;
  }

  const attendanceCells = attendance
    .map(([label, value], i) =>
      `<td width="20%" align="center" style="${font}padding:10px 6px;${i < attendance.length - 1 ? 'border-right:1px solid #e5e7eb;' : ''}">` +
      `<div style="font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6b7280;">${esc(label)}</div>` +
      `<div style="font-size:15px;font-weight:700;color:#111827;margin-top:3px;">${esc(value)}</div></td>`)
    .join('');

  const rowCount = Math.max(earnings.length, deductions.length);
  let salaryRows = '';
  for (let i = 0; i < rowCount; i++) {
    const er = earnings[i];
    const dr = deductions[i];
    const bg = i % 2 ? '#fafbfc' : '#ffffff';
    const td = `${font}font-size:12px;padding:9px 12px;border-bottom:1px solid #eef0f3;background:${bg};`;
    salaryRows +=
      `<tr><td style="${td}color:#374151;">${er ? esc(er.label) : '&nbsp;'}</td>` +
      `<td align="right" style="${td}font-weight:600;color:#111827;border-right:1px solid #d1d5db;">${er ? money(er.amount) : ''}</td>` +
      `<td style="${td}color:#374151;">${dr ? esc(dr.label) : '&nbsp;'}</td>` +
      `<td align="right" style="${td}font-weight:600;color:#111827;">${dr ? money(dr.amount) : ''}</td></tr>`;
  }
  const tot = `${font}font-size:12.5px;font-weight:700;color:#111827;padding:10px 12px;border-top:1px solid #d1d5db;background:#eef3fb;`;
  salaryRows +=
    `<tr><td style="${tot}">Gross Earnings</td>` +
    `<td align="right" style="${tot}border-right:1px solid #d1d5db;">${money(p?.grossSalary)}</td>` +
    `<td style="${tot}">Total Deductions</td>` +
    `<td align="right" style="${tot}color:#b42318;">${money(p?.totalDeductions)}</td></tr>`;

  const th = `${font}font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#ffffff;background:${NAVY};padding:9px 12px;`;
  const contact = [co.phone && `Ph: ${esc(co.phone)}`, esc(co.email), esc(co.website)].filter(Boolean).join(' &nbsp;|&nbsp; ');

  const remarks = p?.remarks
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px 0;"><tr>
        <td style="${font}border-left:3px solid #d97706;background:#fffbeb;padding:10px 16px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#b45309;">Remarks</div>
          <div style="font-size:12px;color:#78350f;margin-top:2px;white-space:pre-wrap;">${esc(p.remarks)}</div>
        </td></tr></table>`
    : '';

  const logo = logoSrc
    ? `<td width="76" valign="top" style="padding:0 14px 0 0;"><img src="${esc(logoSrc)}" width="64" height="64" alt="Logo" style="display:block;width:64px;height:64px;object-fit:contain;border:0;" /></td>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Payslip - ${esc(details[0][1])} - ${esc(monthLabel)}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  td, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* Print/PDF: pin the footer to the bottom of the A4 page, like the web slip. */
  @media print { .slip-foot { position: fixed; left: 0; right: 0; bottom: 0; } }
</style>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;">
<tr><td align="center" style="padding:0;">
<table role="presentation" class="slip-page" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;max-width:794px;background:#ffffff;">
<tr><td valign="top" style="${font}padding:34px 38px 22px 38px;color:#1f2937;">

  <!-- Header -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
      <td valign="top" style="padding:0 0 18px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
          ${logo}
          <td valign="top" style="${font}">
            <div style="font-size:19px;font-weight:800;line-height:1.25;color:${NAVY};">${esc(co.name)}</div>
            <div style="font-size:10.5px;line-height:1.45;color:#6b7280;margin-top:4px;max-width:430px;">${esc(co.address)}</div>
            <div style="font-size:10.5px;color:#6b7280;margin-top:4px;">${contact}</div>
          </td>
        </tr></table>
      </td>
      <td valign="top" align="right" style="${font}padding:0 0 18px 12px;white-space:nowrap;">
        <div style="font-size:22px;font-weight:800;letter-spacing:4px;color:${NAVY};">PAYSLIP</div>
        <div style="font-size:12px;font-weight:600;color:#374151;margin-top:2px;">${esc(monthLabel)}</div>
      </td>
    </tr>
  </table>
  <div style="height:3px;line-height:3px;font-size:0;background:${NAVY};">&nbsp;</div>
  <div style="${font}background:#eef3fb;color:${NAVY};font-weight:600;font-size:11.5px;text-align:center;padding:9px 16px;margin:0 0 20px 0;">Salary Slip for the month of ${esc(monthLabel)}</div>

  <!-- Employee details -->
  ${sectionTitle('Employee Details')}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #d1d5db;margin:0 0 20px 0;table-layout:fixed;">
    ${detailRows}
  </table>

  <!-- Attendance summary -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #d1d5db;margin:0 0 20px 0;table-layout:fixed;">
    <tr>${attendanceCells}</tr>
  </table>

  <!-- Salary details -->
  ${sectionTitle('Salary Details')}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #d1d5db;margin:0 0 20px 0;table-layout:fixed;">
    <tr>
      <th width="32%" align="left" style="${th}">Earnings</th>
      <th width="18%" align="right" style="${th}border-right:1px solid #3a5d9a;">Amount (&#8377;)</th>
      <th width="32%" align="left" style="${th}">Deductions</th>
      <th width="18%" align="right" style="${th}">Amount (&#8377;)</th>
    </tr>
    ${salaryRows}
  </table>

  <!-- Net pay -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${NAVY};margin:0 0 20px 0;">
    <tr>
      <td valign="middle" style="${font}padding:13px 16px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${NAVY};">Net Salary Payable</div>
        <div style="font-size:11.5px;color:#374151;margin-top:5px;"><span style="color:#6b7280;">In words: </span><b style="font-weight:600;">${esc(payslipNumberToWords(p?.netSalary || 0))}</b></div>
        <div style="font-size:10px;color:#6b7280;margin-top:5px;">Gross Earnings ${money(p?.grossSalary)} &minus; Total Deductions ${money(p?.totalDeductions)}</div>
      </td>
      <td width="210" align="center" valign="middle" style="${font}background:${NAVY};color:#ffffff;padding:13px 20px;font-size:26px;font-weight:800;white-space:nowrap;">${money(p?.netSalary)}</td>
    </tr>
  </table>

  ${remarks}

</td></tr>
<tr><td class="slip-foot" valign="bottom" style="${font}padding:0 38px 26px 38px;">
  <div style="border-top:1px solid #d1d5db;padding-top:12px;text-align:center;font-size:10px;line-height:1.6;color:#6b7280;">
    <div style="font-weight:600;color:#374151;">This is a computer-generated payslip and does not require a signature.</div>
    <div>For any discrepancy, please contact HR${co.email ? ` at ${esc(co.email)}` : ''}.</div>
  </div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
