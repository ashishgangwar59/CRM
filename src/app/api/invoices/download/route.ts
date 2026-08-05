import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Invoice } from "@/lib/models/Invoice";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const invoiceNo = searchParams.get("invoiceNo");

    if (!invoiceNo) {
      return new Response("Missing invoice number", { status: 400 });
    }

    const inv = await Invoice.findOne({ invoiceNo }).lean();
    if (!inv) {
      return new Response("Invoice not found", { status: 404 });
    }

    // Calculations
    let totalTaxableValue = 0;
    let totalIgst = 0;

    inv.items.forEach((item: any) => {
      const taxable = item.qty * item.rate;
      totalTaxableValue += taxable;
      totalIgst += taxable * ((item.igstRate || 0) / 100);
    });

    const grandTotal = totalTaxableValue + totalIgst;

    // Number to words converter
    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
      "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const convertLessThanOneThousand = (n: number): string => {
      if (n === 0) return "";
      let temp = "";
      if (n >= 100) {
        temp += ones[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }
      if (n >= 20) {
        temp += tens[Math.floor(n / 10)] + " ";
        n %= 10;
      }
      if (n > 0) {
        temp += ones[n] + " ";
      }
      return temp.trim();
    };

    const numberToWords = (num: number): string => {
      if (num === 0) return "Rupees Zero Only";
      let str = "";
      let n = Math.floor(num);

      if (n >= 10000000) {
        str += convertLessThanOneThousand(Math.floor(n / 10000000)) + " Crore ";
        n %= 10000000;
      }
      if (n >= 100000) {
        str += convertLessThanOneThousand(Math.floor(n / 100000)) + " Lakh ";
        n %= 100000;
      }
      if (n >= 1000) {
        str += convertLessThanOneThousand(Math.floor(n / 1000)) + " Thousand ";
        n %= 1000;
      }
      if (n > 0) {
        str += convertLessThanOneThousand(n);
      }
      const paisa = Math.round((num - Math.floor(num)) * 100);
      let paisaStr = "";
      if (paisa > 0) {
        paisaStr = " and " + convertLessThanOneThousand(paisa) + " Paisa";
      }
      return `Rupees ${str.trim()}${paisaStr} Only`;
    };

    const grandTotalWords = numberToWords(grandTotal);

    // Return HTML page with auto-print
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Tax Invoice - ${inv.invoiceNo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box; margin:0; padding:0;}
  body{
    font-family:'Poppins', Arial, sans-serif;
    background:#ffffff;
    padding:30px 10px;
  }
  .invoice {
    max-width:820px;
    margin:0 auto;
    background: #0d2452;
    border-radius: 10px;
    overflow: hidden;
    color: #ffffff;
    border: 1px solid #1a3668;
    box-shadow: 0 10px 35px rgba(13,36,82,0.15);
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 32px;
    background: #0a1c3f;
    border-bottom: 4px solid #d9a441;
    gap: 20px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .brand img {
    width: 66px;
    height: 66px;
    object-fit: contain;
    flex-shrink: 0;
  }
  .brand-text h1 {
    font-size: 22px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: 0.5px;
    line-height: 1.15;
  }
  .brand-text .sub {
    font-size: 12px;
    font-weight: 600;
    color: #f0c975;
    letter-spacing: 1.5px;
    margin-top: 2px;
  }
  .brand-text .tagline {
    font-size: 10.5px;
    color: #a5b4fc;
    letter-spacing: 1px;
    margin-top: 4px;
  }
  .contact-block {
    text-align: right;
    font-size: 11.5px;
    color: #ffffff;
    line-height: 1.9;
  }
  .contact-block div {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 6px;
  }
  .contact-block .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: #d9a441;
    color: #0d2452;
    font-size: 9px;
    flex-shrink: 0;
  }
  .title-bar {
    text-align: center;
    padding: 12px;
    position: relative;
  }
  .title-bar::before {
    content: "";
    position: absolute;
    top: 50%; left: 0; right: 0;
    height: 2px;
    background: #1a3668;
    z-index: 0;
  }
  .title-bar span {
    position: relative;
    z-index: 1;
    background: #d9a441;
    color: #0d2452;
    padding: 8px 34px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 2px;
  }
  .meta-section {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    padding: 18px 32px 0;
    flex-wrap: wrap;
  }
  .bill-to {
    flex: 1;
    min-width: 260px;
  }
  .section-label {
    display: inline-block;
    background: #d9a441;
    color: #0d2452;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    padding: 5px 14px;
    border-radius: 4px;
    margin-bottom: 10px;
  }
  .field-row {
    display: flex;
    font-size: 12.5px;
    margin-bottom: 9px;
  }
  .field-row .label {
    width: 100px;
    color: #a5b4fc;
    font-weight: 600;
    flex-shrink: 0;
  }
  .field-row .line {
    flex: 1;
    border-bottom: 1px solid #1a3668;
    min-height: 16px;
    font-weight: 700;
    color: #ffffff;
  }
  .invoice-info {
    min-width: 250px;
    border: 1px solid #1a3668;
    border-radius: 8px;
    overflow: hidden;
    height: fit-content;
    background: #0a1c3f;
  }
  .invoice-info .row {
    display: flex;
    justify-content: space-between;
    font-size: 12.5px;
    padding: 8px 14px;
    border-bottom: 1px solid #1a3668;
  }
  .invoice-info .row:last-child { border-bottom: none; }
  .invoice-info .row .k { color: #a5b4fc; font-weight: 600; }
  .invoice-info .row .v { color: #f0c975; font-weight: 700; }
  table.items {
    width: calc(100% - 64px);
    margin: 22px 32px 0;
    border-collapse: collapse;
    font-size: 12.5px;
  }
  table.items thead th {
    background: #d9a441;
    color: #0d2452;
    font-size: 11px;
    letter-spacing: 0.5px;
    text-align: left;
    padding: 10px 12px;
  }
  table.items thead th:nth-child(1) { width: 8%; }
  table.items thead th:nth-child(3) { width: 12%; text-align: center;}
  table.items thead th:nth-child(4) { width: 15%; text-align: right;}
  table.items thead th:nth-child(5) { width: 15%; text-align: right;}
  table.items tbody td {
    padding: 12px;
    border-bottom: 1px solid #1a3668;
    vertical-align: top;
    color: #ffffff;
  }
  table.items tbody td:nth-child(3) { text-align: center; }
  table.items tbody td:nth-child(4) { text-align: right; }
  table.items tbody td:nth-child(5) { text-align: right; font-weight: 600;}
  .item-title { font-weight: 700; color: #ffffff; }
  .item-desc { font-size: 11px; color: #a5b4fc; margin-top: 2px; }
  .bottom-section {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    padding: 20px 32px 0;
    flex-wrap: wrap;
  }
  .left-col {
    flex: 1;
    min-width: 270px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .box {
    border: 1px solid #1a3668;
    border-radius: 8px;
    padding: 12px 14px;
    background: #0a1c3f;
  }
  .box .box-title {
    font-size: 11px;
    font-weight: 700;
    color: #f0c975;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  .bank-details div {
    display: flex;
    justify-content: space-between;
    font-size: 11.5px;
    padding: 3px 0;
  }
  .bank-details .k { color: #a5b4fc; }
  .bank-details .v { font-weight: 600; color: #ffffff; }
  .terms ul {
    list-style: none;
    font-size: 10.5px;
    color: #ffffff;
    line-height: 1.7;
    padding-left: 0;
  }
  .terms ul li::before {
    content: "• ";
    color: #f0c975;
    font-weight: 700;
  }
  .right-col {
    min-width: 280px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .totals {
    border: 1px solid #1a3668;
    border-radius: 8px;
    overflow: hidden;
  }
  .totals .row {
    display: flex;
    justify-content: space-between;
    padding: 9px 16px;
    font-size: 12.5px;
    border-bottom: 1px solid #1a3668;
    background: #0a1c3f;
  }
  .totals .row .k { color: #a5b4fc; font-weight: 600;}
  .totals .row .v { font-weight: 700; color: #ffffff; }
  .totals .grand {
    background: #d9a441;
    color: #0d2452;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 800;
  }
  .totals .grand .v { color: #0d2452; }
  .amount-words {
    font-size: 10.5px;
    color: #a5b4fc;
    text-align: right;
    font-style: italic;
    line-height: 1.4;
  }
  .sign-block {
    text-align: center;
    padding-top: 10px;
  }
  .sign-block .for-text {
    font-size: 11px;
    font-weight: 700;
    color: #f0c975;
    margin-bottom: 34px;
  }
  .sign-block .auth {
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #ffffff;
    border-top: 1px solid #1a3668;
    padding-top: 6px;
    margin-top: 2px;
  }
  .footer {
    margin-top: 26px;
    background: #0a1c3f;
    color: #a5b4fc;
    text-align: center;
    padding: 14px 20px;
    font-size: 11px;
    line-height: 1.6;
  }
  .footer strong { color: #f0c975; }

  @media print {
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      padding: 0 !important;
      margin: 0 !important;
      background: #0d2452 !important;
    }
    .invoice {
      box-shadow: none !important;
      border-radius: 0 !important;
      border: none !important;
      width: 100% !important;
    }
  }
</style>
</head>
<body>
  <div class="invoice">
    <!-- HEADER -->
    <div class="header">
      <div className="brand" style="display:flex; align-items:center; gap:16px;">
        <div class="brand-text">
          <h1>Niventra Capital Advisory</h1>
          <div class="sub">INDIA PRIVATE LIMITED</div>
          <div class="tagline">INVEST TODAY, PROSPER TOMORROW</div>
        </div>
      </div>
      <div class="contact-block">
        <div>
          <span class="icon">📞</span>
          <span>011 4051 5660</span>
        </div>
        <div>
          <span class="icon">✉️</span>
          <span>info@niventracapitaladvisory.com</span>
        </div>
        <div>
          <span class="icon">🌐</span>
          <span>www.niventracapitaladvisory.com</span>
        </div>
      </div>
    </div>

    <!-- TITLE BAR -->
    <div class="title-bar">
      <span>TAX INVOICE</span>
    </div>

    <!-- BILL / META -->
    <div class="meta-section">
      <div class="bill-to">
        <div class="section-label">BILL TO</div>
        <div class="field-row">
          <span class="label">Name</span>
          <span class="line">${inv.billToName}</span>
        </div>
        <div class="field-row">
          <span class="label">Address</span>
          <span class="line">${inv.billToAddress}</span>
        </div>
        <div class="field-row">
          <span class="label">State</span>
          <span class="line">${inv.billToState} &nbsp; (Code: ${inv.billToStateCode})</span>
        </div>
      </div>

      <div class="invoice-info">
        <div class="row">
          <span class="k">Invoice No.</span>
          <span class="v font-mono">${inv.invoiceNo}</span>
        </div>
        <div class="row">
          <span class="k">Invoice Date</span>
          <span class="v">${inv.invoiceDate}</span>
        </div>
        <div class="row">
          <span class="k">Reverse Charge</span>
          <span class="v">${inv.reverseCharge}</span>
        </div>
        <div class="row">
          <span class="k">State</span>
          <span class="v">${inv.state} &nbsp; (${inv.stateCode})</span>
        </div>
      </div>
    </div>

    <!-- TABLE -->
    <table class="items">
      <thead>
        <tr>
          <th>S.No</th>
          <th>Description of Services</th>
          <th>SAC Code</th>
          <th>Qty / Rate</th>
          <th>Taxable Value</th>
        </tr>
      </thead>
      <tbody>
        ${inv.items.map((item: any, idx: number) => `
          <tr>
            <td>${idx + 1}</td>
            <td>
              <div class="item-title">${item.title}</div>
              <div class="item-desc">${item.desc}</div>
            </td>
            <td>${item.sacCode}</td>
            <td>${item.qty} &times; ₹${item.rate.toLocaleString()}</td>
            <td>₹ ${(item.qty * item.rate).toLocaleString()}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <!-- BOTTOM SECTION -->
    <div class="bottom-section">
      <div class="left-col">
        <div class="box">
          <div class="box-title">Bank Transfer Details</div>
          <div class="bank-details">
            <div>
              <span class="k">Bank Name</span>
              <span class="v">Kotak Mahindra Bank.</span>
            </div>
            <div>
              <span class="k">A/c Name</span>
              <span class="v">Niventra Capital Advisory India Pvt Ltd</span>
            </div>
            <div>
              <span class="k">A/C Number</span>
              <span class="v font-mono">2151206126</span>
            </div>
            <div>
              <span class="k">IFSC Code</span>
              <span class="v font-mono">KKBK0000287</span>
            </div>
            <div>
              <span class="k">Branch</span>
              <span class="v">
                SCO 16, Sector 14,Urban Estate Gurgaon - 122001 Haryana India
              </span>
            </div>
          </div>
        </div>

        <div class="box">
          <div class="box-title">Terms & Conditions</div>
          <div class="terms">
            <ul>
              <li>Payment should be made within 15 days of invoice date.</li>
              <li>Interest @ 16% p.a. will be charged for delayed payments.</li>
              <li>All disputes are subject to New Delhi jurisdiction.</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="right-col">
        <div class="totals">
          <div class="row">
            <span class="k">Taxable Value</span>
            <span class="v">₹${totalTaxableValue.toLocaleString()}</span>
          </div>
          ${totalIgst > 0 ? `
            <div class="row">
              <span class="k">IGST</span>
              <span class="v">₹${totalIgst.toLocaleString()}</span>
            </div>
          ` : ""}
          <div class="grand">
            <span class="k">Grand Total</span>
            <span class="v">₹${grandTotal.toLocaleString()}</span>
          </div>
        </div>

        <div class="amount-words">
          Amount Chargeable (in Words): <br />
          <strong>${grandTotalWords}</strong>
        </div>

        <div class="sign-block">
          <div class="for-text">For NIVENTRA CAPITAL ADVISORY INDIA PVT LTD</div>
          <div class="auth">Authorized Signatory</div>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      Thank you for your business! For any queries regarding this invoice, write to <strong>info@niventracapitaladvisory.com</strong>. <br />
      Registered Office: A-91, Block A, Gali No. 2, Sewak Park, Near Dwarka Mor Metro Station, Dwarka Mor, New Delhi &ndash; 110059, India.
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html" }
    });
  } catch (error) {
    console.error("Download Route Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
