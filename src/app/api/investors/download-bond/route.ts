import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Investor } from "@/lib/models/Investor";

function numberToWords(num: number): string {
  if (!num || num === 0) return "Zero";
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  }
  return inWords(num).trim();
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response("Missing investor ID", { status: 400 });
    }

    const investor = await Investor.findById(id).lean();
    if (!investor) {
      return new Response("Investor not found", { status: 404 });
    }

    const monthsParam = searchParams.get("months");
    const issueDateParam = searchParams.get("issueDate");

    const maturityPeriodMonths = monthsParam
      ? (parseInt(monthsParam) || 1)
      : (Number(investor.bondMaturityMonths) || 1);

    const principalAmount = investor.investmentAmount || investor.debentureForm?.totalApplicationAmount || 0;
    const growthRate = investor.monthlyGrowthPercentage || 2;
    const interestAmount = Math.round(principalAmount * (growthRate / 100) * maturityPeriodMonths);
    const maturityAmount = principalAmount + interestAmount;

    const issueDateVal = issueDateParam || investor.investmentDate;
    let issueDateObj: Date;
    if (issueDateVal) {
      if (typeof issueDateVal === "string" && issueDateVal.includes("-") && issueDateVal.length === 10) {
        const [y, m, d] = issueDateVal.split("-").map(Number);
        issueDateObj = new Date(y, m - 1, d);
      } else {
        issueDateObj = new Date(issueDateVal);
      }
    } else {
      issueDateObj = investor.verifiedAt ? new Date(investor.verifiedAt) : new Date(investor.createdAt);
    }
    const issueDateStr = issueDateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

    const maturityDateObj = new Date(issueDateObj);
    maturityDateObj.setMonth(maturityDateObj.getMonth() + maturityPeriodMonths);
    const maturityDateStr = maturityDateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

    const rawSeq = (investor.investorCode || "").replace(/\D/g, "");
    const seqPadded = rawSeq ? rawSeq.slice(-4).padStart(4, "0") : "0001";
    const refNo = `NCA/PB/${issueDateObj.getFullYear().toString().slice(-2)}${(issueDateObj.getFullYear()+1).toString().slice(-2)}/${seqPadded}`;

    const fatherName = investor.debentureForm?.fatherSpouseName || "N/A";
    const address = investor.debentureForm?.address || "N/A";
    const nomineeName = investor.debentureForm?.nomineeName || investor.nomineeName || "N/A";
    const nomineeRelation = investor.debentureForm?.nomineeRelation || investor.nomineeRelation || "N/A";
    const nomineeAge = investor.debentureForm?.nomineeAge || investor.nomineeAge || "";

    const sealBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4QBaRXhpZgAATU0AKgAAAAgABQMBAAUAAAABAAAASgMDAAEAAAABAAAAAFEQAAEAAAABAQAAAFERAAQAAAABAAAOw1ESAAQAAAABAAAOwwAAAAAAAYagAACxj//bAEMAAgEBAgEBAgICAgICAgIDBQMDAwMDBgQEAwUHBgcHBwYHBwgJCwkICAoIBwcKDQoKCwwMDAwHCQ4PDQwOCwwMDP/bAEMBAgICAwMDBgMDBgwIBwgMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDP/AABEIAEIAUwMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gA/EAAhEDEQA/AP3NVgMHPPpTlYN14qugKuM9KlYbU3EfL9cZr5mPY9N6K4lxstlaRnVI0BZmY4CgDJJ9vevBvH/7btteau+jfDrRJfGuplnRbpS8di7qcHy2RGkuADwWiQx5yDIpBx578c/jEf2ntW1WwtNbh8PfCvw3Iv8Aa+sSybbbUiJNm9uf3kPmDZHDwJyGZz5ShJHeDPF2k6r8O/FfhvwLpQ8MR+BNYSK71jUdQey0vxHaxKMI2pQqXjzFLkiqFIQbNoIyB7uHy+MIqdZX8ui9TgqYhvSOhPf+MfjKLRLnxh48MM/Dm11G6FpbQ5sdOPmsC3lZm+2Mz7RnqhHUheKxtC8Z+Lr7Ubifw/8AHKLUXtLSG9ka8vbH7KIpiohfL6dGpVywCgSLknAOQcW/CfwO0fxZr8/if/hH/F/xDvdW1CPXbuQW0Om+GZr1YJIFeP7UwllXbKw3hX3hUJyQKsePP2TIPGfw6/sTU/h34isrC2trWCCHw94pjuJFFqZjbkxzeSr+WZ3YLuIJCjHArufsFJQ0XyRivaNXNqf9pz4pfBG6VPH/AIXs9e09HEcupaXGti/XGDulltsjp+8lg/3TkCvcPhb8YfD3xj0Z7zQ75Jzbt5d3bSIYbmxk/CecsTAPG3cAgAgggkHNfP0fjbxV8MfgVreieBv7L1vxta3d3qmqQ61YzWWpwQzyGV5/sb7/tD5YrhXERRAAcAKePtdY0rx7ql34z+FjXHh3xDoDM8dgpjlF9Y7d+Y4UYlo8ENJZHBi80OmyQjfy1svhUTcVyvuv8jWFaUXqfbKkDqM0ud4x0NcT+z18a7P48/DuDVoYo7TUIW+zajZK/mC0nCqxCtxvjZWV0fA3o6N3xXanPX9a+fqU5U5OElqj0IyUldD1AA5NFRFwDzmioGThtwxgY9a8W/b1+KEngH4GSabZvdf2n4sn/smJbOQpdLAY3kuXiI6OIY5ApH8TrXtka7Uz1yK+Z/2rNNj8c/tc/C/S55cQ6PGbxos/faW6gfJ9f3djMv0kb1r0sspKVdOS0V39xz4mbjB2PNk8D6TfeLLT4MSSR3trbaN9r8U2xs5hp6XEhjkzLcRfNayW0MSi3Yq0eI1yQcV7f8AB34NaP460XR9XewtbfwVpuZfC+jC2WKGRBjbqFxGAA00gXcq42xqQcbj8vi/wh1VvivqHj/UX13R9eOv3lp4eiuQ0VxqVvb3l5GZIjPH8phEJmCkbWbgMqmPn7OBS3t1ghVY4Y4yqIAAFAU4FejmeJcFyJ7nNhoczufn9+xD/wAFqh8Tv23fiF8E/iXHp+k3ln4kvNK8JapBGYre/EEjJ9kkLZHnFQGUj72CMA9fvHxt4huPC8+hG28rZqOqJZzKy5JQwzPx6HdGv4Zr8o/2Lv2DvDn7eWh/tgeHNall0rXNP+K1xf8Ah7XLUYvNDvF80pLGwOcEgBlBGR7179+xx+3f4p1TVT8H/jtA+kfFP4P3Z1DV9TMZ+xa1pcNnc41NZMbcFdu7OByCMnIr1s2yujOo54VWcUuaPqlaS8nfXzOLCYuoopVno27P57M+0fiD8NNK+KmnrDeNNZ39mTLp2p2h8u90ybHEsL9QR6H5SOCCCa+TPj54huvhHq1x4wurptH8VeASLLUIbJxb2WqQNvuYrmCFQit9qZCrebKqCW2VSkhVFNS1/CCQG7vde09HEcupaXGti/XGDulltsjp+8lg/3TkCvcPhb8YfD3xj0Z7zQ75Jzbt5d3bSIYbmxk/CecsTAPG3cAgAgggkHNfP0fjbxV8MfgVreieBv7L1vxta3d3qmqQ61YzWWpwQzyGV5/sb7/tD5YrhXERRAAcAKePtdY0rx7ql34z+FjXHh3xDoDM8dgpjlF9Y7d+Y4UYlo8ENJZHBi80OmyQjfy1svhUTcVyvuv8jWFaUXqfbKkDqM0ud4x0NcT+z18a7P48/DuDVoYo7TUIW+zajZK/mC0nCqxCtxvjZWV0fA3o6N3xXanPX9a+fqU5U5OElqj0IyUldD1AA5NFRFwDzmioGThtwxgY9a8W/b1+KEngH4GSabZvdf2n4sn/smJbOQpdLAY3kuXiI6OIY5ApH8TrXtka7Uz1yK+Z/2rNNj8c/tc/C/S55cQ6PGbxos/faW6gfJ9f3djMv0kb1r0sspKVdOS0V39xz4mbjB2PNk8D6TfeLLT4MSSR3trbaN9r8U2xs5hp6XEhjkzLcRfNayW0MSi3Yq0e5/w";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Bond Certificate - ${investor.fullName}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: Georgia, serif; }
    .print-container { max-width: 800px; margin: 20px auto; background: #fdfbf7; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); box-sizing: border-box; }
    .border-navy { border: 8px solid #0a192f; padding: 8px; border-radius: 4px; background: #fffdfa; }
    .border-gold { border: 2px solid #c5a059; padding: 16px; position: relative; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 280px; font-weight: 900; color: #0a192f; opacity: 0.04; pointer-events: none; user-select: none; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border-bottom: 1px solid rgba(197, 160, 89, 0.4); padding-bottom: 12px; }
    .ribbon { width: 112px; height: 64px; border-radius: 50%; background: linear-gradient(180deg, #dfb76c, #c5a059, #997327); padding: 2px; display: inline-block; text-align: center; }
    .ribbon-inner { background: linear-gradient(180deg, #b8860b, #785404); color: white; border-radius: 50%; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; padding: 4px; }
    .ribbon-inner span { font-size: 7px; font-weight: bold; text-transform: uppercase; letter-spacing: -0.5px; color: #fef3c7; }
    .company-title { font-size: 20px; font-weight: bold; color: #0a192f; margin: 0; letter-spacing: 0.5px; text-align: center; }
    .company-subtitle { font-size: 9px; color: #c5a059; margin: 2px 0 0; font-weight: bold; letter-spacing: 2px; text-align: center; }
    .ref-block { text-align: right; font-size: 11px; color: #334155; }
    .receipt-statement { text-align: center; padding: 10px; margin: 12px 0; font-size: 12px; line-height: 1.5; color: #1e293b; font-style: italic; background: #ffffff; border: 1px solid #fef3c7; border-radius: 4px; }
    .grid-table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    .grid-table td { width: 50%; vertical-align: top; padding: 6px; }
    .card { border: 1px solid #fef3c7; border-radius: 4px; overflow: hidden; background: white; }
    .card-header { background: #134086; color: #c5a059; text-align: center; font-size: 10px; font-weight: bold; padding: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .card-body { padding: 10px; font-size: 11px; }
    .detail-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 4px 0; }
    .detail-row:last-child { border-bottom: none; }
    .terms-card { border: 1px solid rgba(197, 160, 89, 0.4); border-radius: 4px; margin: 12px 0; background: rgba(254, 243, 199, 0.1); }
    .terms-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 12px; padding: 10px; font-size: 9px; color: #334155; }
    .footer-flex { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; padding-top: 16px; border-top: 1px solid #fef3c7; }
    .footer-col { text-align: center; flex: 1; }
    .contact-bar { margin-top: 20px; background: #134086; color: white; font-size: 8px; font-weight: bold; padding: 8px 12px; display: flex; justify-content: space-between; border-top: 2px solid #c5a059; }
    @media print {
      body { background-color: white; }
      .print-container { box-shadow: none; margin: 0; width: 100%; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <div class="border-navy">
      <div class="border-gold">
        <div class="watermark">NC</div>

        <table class="header-table">
          <tr>
            <td style="width: 120px;">
              <div class="ribbon">
                <div class="ribbon-inner">
                  <span>BUILDING WEALTH</span>
                  <span>CREATING FUTURES</span>
                </div>
              </div>
            </td>
            <td>
              <h1 class="company-title">NIVENTRA CAPITAL ADVISORY</h1>
              <p class="company-subtitle">INVESTMENT ACKNOWLEDGEMENT</p>
            </td>
            <td style="width: 180px; text-align: right;">
              <div class="ref-block">
                <strong>REFERENCE NO:</strong><br>
                ${refNo}
              </div>
            </td>
          </tr>
        </table>

        <div class="receipt-statement">
          This is to certify that <strong>NIVENTRA CAPITAL ADVISORY INDIA PVT. LTD.</strong> has received an amount of <strong>₹${principalAmount.toLocaleString()}/- (${numberToWords(principalAmount)} Rupees Only)</strong> from the investor named below on the terms and conditions mentioned herein.
        </div>

        <table class="grid-table">
          <tr>
            <td>
              <div class="card">
                <div class="card-header">✦ INVESTOR INFORMATION ✦</div>
                <div class="card-body">
                  <div class="detail-row"><span>Investor Name</span><strong>${investor.fullName}</strong></div>
                  <div class="detail-row"><span>Father's Name</span><strong>${fatherName}</strong></div>
                  <div class="detail-row"><span>Address</span><strong>${address}</strong></div>
                  <div class="detail-row"><span>Mobile No.</span><strong>${investor.phone}</strong></div>
                  <div class="detail-row"><span>Email ID</span><strong>${investor.email}</strong></div>
                  <div class="detail-row"><span>Nominee Name</span><strong>${nomineeName}</strong></div>
                  <div class="detail-row"><span>Nominee Relation</span><strong>${nomineeRelation}${nomineeAge ? ` (${nomineeAge})` : ''}</strong></div>
                </div>
              </div>
            </td>
            <td>
              <div class="card">
                <div class="card-header">✦ INVESTMENT DETAILS ✦</div>
                <div class="card-body">
                  <div class="detail-row"><span>Principal Amount</span><strong>₹${principalAmount.toLocaleString()}/-</strong></div>
                  <div class="detail-row"><span>Investment Date</span><strong>${issueDateStr}</strong></div>
                  <div class="detail-row"><span>Maturity Period</span><strong>${maturityPeriodMonths} ${maturityPeriodMonths === 1 ? "Month" : "Months"}</strong></div>
                  <div class="detail-row"><span>Maturity Date</span><strong>${maturityDateStr}</strong></div>
                  <div class="detail-row"><span>Amount Payable on Maturity</span><strong style="color: #be123c;">₹${maturityAmount.toLocaleString()}/-</strong></div>
                </div>
              </div>
            </td>
          </tr>
        </table>

        <div class="terms-card">
          <div class="card-header">✦ TERMS & CONDITIONS ✦</div>
          <div class="terms-grid">
            <div>1. This Bond is issued by NIVENTRA CAPITAL ADVISORY INDIA PVT. LTD. as an acknowledgement of receipt of the above amount.</div>
            <div>4. This Bond is non-transferable unless approved in writing by the Company.</div>
            <div>2. On successful completion of the period, the Company shall pay the maturity amount stated above, subject to terms.</div>
            <div>5. Any alteration without the Company's authorization shall render this Bond invalid.</div>
            <div>3. Payment shall be made through NEFT/RTGS/IMPS/Cheque or approved banking mode.</div>
            <div>6. Any dispute shall be subject to Delhi jurisdiction.</div>
          </div>
        </div>

        <div class="footer-flex">
          <div class="footer-col" style="max-width: 90px;">
            <img src="${sealBase64}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 50%;" alt="Seal">
            <div style="font-size: 7px; font-weight: bold; color: #64748b; margin-top: 4px;">COMPANY SEAL</div>
          </div>

          <div class="footer-col" style="font-size: 8px; color: #64748b; font-style: italic; max-width: 220px; line-height: 1.2;">
            The Company hereby certifies that this Bond has been issued under its authority and shall be governed by the terms and conditions mentioned herein.
          </div>

          <div class="footer-col">
            <div style="font-size: 9px; font-weight: bold; margin-bottom: 24px;">For NIVENTRA CAPITAL ADVISORY INDIA PVT. LTD.</div>
            <div style="font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold; font-style: italic; color: #0f172a; margin-bottom: 2px;">Deepak Dayal</div>
            <div style="border-top: 1px solid #94a3b8; width: 140px; margin: 0 auto; padding-top: 2px;">
              <strong style="font-size: 8px; color: #1e293b;">DEEPAK DAYAL</strong><br>
              <span style="font-size: 7px; color: #475569;">DIRECTOR</span>
            </div>
          </div>
        </div>

        <div class="contact-bar">
          <div>📍 OFFICE: DWARIKA MOR</div>
          <div>🌐 WEBSITE: www.niventracapitaladvisory.com</div>
          <div>📞 PHONE: 011 4051 5660</div>
          <div>✉️ EMAIL: info@niventracapitaladvisory.com</div>
        </div>
      </div>
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

    return new Response(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error: any) {
    console.error("Download Bond error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
