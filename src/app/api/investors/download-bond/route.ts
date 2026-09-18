import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Investor } from "@/lib/models/Investor";
import { SystemSettings } from "@/lib/models/SystemSettings";

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
    const settings = await SystemSettings.findOne().lean();
    const companyAddress = (settings as any)?.companyProfile?.address || "A-91, Block A, Gali No. 2, Sewak Park, Near Dwarka Mor Metro Station, Gate No. 2,<br />Dwarka Mor, New Delhi – 110059, India";
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

    const sealBase64 = "data:image/jpeg;base64,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";

    
    const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAaQAAAGICAYAAAAOIpR4AAAWfmNhQlgAABZ+anVtYgAAAB5qdW1kYzJwYQARABCAAACqADibcQNjMnBhAAAAFlhqdW1iAAAAR2p1bWRjMm1hABEAEIAAAKoAOJtxA3VybjpjMnBhOmUxYWMxMDU1LTYyNGQtNDM1Ny05OGM0LTZhY2U1ZDdhN2JhMwAAAAOTanVtYgAAAClqdW1kYzJhcwARABCAAACqADibcQNjMnBhLmFzc2VydGlvbnMAAAAAuGp1bWIAAABEanVtZGNib3IAEQAQgAAAqgA4m3ETYzJwYS5pbmdyZWRpZW50LnYzAAAAABhjMnNouDVJ0rzNcyGCkn8l2QdtXQAAAGxjYm9yo2lkYzpmb3JtYXRpaW1hZ2UvcG5namluc3RhbmNlSUR4LHhtcDppaWQ6Yjc3MzQwMTMtYWE2MC00ZmQyLWIzMGItZDdiOTQ2YWI2OWJkbHJlbGF0aW9uc2hpcGhwYXJlbnRPZgAAAeJqdW1iAAAAQWp1bWRjYm9yABEAEIAAAKoAOJtxE2MycGEuYWN0aW9ucy52MgAAAAAYYzJzaJVX+IIMPgQhXnblWnpiLM4AAAGZY2JvcqJnYWN0aW9uc4KiZmFjdGlvbmtjMnBhLm9wZW5lZGpwYXJhbWV0ZXJzoWtpbmdyZWRpZW50c4GiY3VybHgtc2VsZiNqdW1iZj1jMnBhLmFzc2VydGlvbnMvYzJwYS5pbmdyZWRpZW50LnYzZGhhc2hYIKPwl0DEbRmMONx5lW+kgMcf34Lhfdp6Y38UMPuhLLjPpGZhY3Rpb254HWNvbS5hbnRocm9waWMuY2xhdWRlLnByb3ZpZGVkanBhcmFtZXRlcnOheB9jb20uYW50aHJvcGljLm9yaWdpbi1jb25maWRlbmNlZ3Vua25vd25rZGVzY3JpcHRpb254ZkNsYXVkZSBwcm92aWRlZCB0aGlzIGZpbGUgYXQgdGhlIHJlcXVlc3Qgb2YgYSB1c2VyIGFuZCBtYXkgaGF2ZSBjcmVhdGVkIG9yIG1vZGlmaWVkIHRoZSBmaWxlIGNvbnRlbnRzLm1zb2Z0d2FyZUFnZW50oWRuYW1lZkNsYXVkZXJhbGxBY3Rpb25zSW5jbHVkZWT1AAAAyGp1bWIAAABAanVtZGNib3IAEQAQgAAAqgA4m3ETYzJwYS5oYXNoLmRhdGEAAAAAGGMyc2g+NM+IuhY0eEs/SQXZ/u0mAAAAgGNib3KlY2FsZ2ZzaGEyNTZjcGFkTQAAAAAAAAAAAAAAAABkaGFzaFggGRnjKzv8cgv5+F38wGGzDLJQfM8Au/AreCPnJ77wpqZkbmFtZW5qdW1iZiBtYW5pZmVzdGpleGNsdXNpb25zgaJlc3RhcnQYIWZsZW5ndGgZFooAAAI+anVtYgAAACdqdW1kYzJjbAARABCAAACqADibcQNjMnBhLmNsYWltLnYyAAAAAg9jYm9ypWNhbGdmc2hhMjU2aXNpZ25hdHVyZXhNc2VsZiNqdW1iZj0vYzJwYS91cm46YzJwYTplMWFjMTA1NS02MjRkLTQzNTctOThjNC02YWNlNWQ3YTdiYTMvYzJwYS5zaWduYXR1cmVqaW5zdGFuY2VJRHgseG1wOmlpZDozMDAzNmY3MS1kMmJkLTQ1MTctYmNjMS04OGI0YzA3OTNlMmFyY3JlYXRlZF9hc3NlcnRpb25zg6JjdXJseC1zZWxmI2p1bWJmPWMycGEuYXNzZXJ0aW9ucy9jMnBhLmluZ3JlZGllbnQudjNkaGFzaFggo/CXQMRtGYw43HmVb6SAxx/fguF92npjfxQw+6EsuM+iY3VybHgqc2VsZiNqdW1iZj1jMnBhLmFzc2VydGlvbnMvYzJwYS5hY3Rpb25zLnYyZGhhc2hYIKJu1ei7XpET4hnj441SnS+963rxD09wVHMuWcc77wvComN1cmx4KXNlbGYjanVtYmY9YzJwYS5hc3NlcnTpb25zL2MycGEuaGFzaC5kYXRhZGhhc2hYIJ+GG7NKWfOF8ZpnN8X4u+WI94z6r35Ae1JMQB0QxHpNdGNsYWltX2dlbmVyYXRvcl9pbmZvo2RuYW1lb0FudGhyb3BpYyBGaWxlc2d2ZXJzaW9uZTEuMC4wa3NwZWNWZXJzaW9uZTIuNC4wAAAQOGp1bWIAAAAoanVtZGMyY3MAEQAQgAAAqgA4m3EDYzJwYS5zaWduYXR1cmUAAAAQCGNib3LShFkCEqIBJhghWQIKMIICBjCCAY2gAwIBAgIUQOWgCu7COdC+uIP6BkIFPWdVEwAwCgYIKoZIzj0EAwMwSTEXMBUGA1UEChMOQW50aHJvcGljLCBQQkMxLjAsBgNVBAMTJUFudGhyb3BpYyBDb250ZW50IENyZWRlbnRpYWxzIFJvb3QgQ0EwHhcNMjYwODA3MTg0MzU2WhcNMjgwODA2MTk0MzU2WjBEMRcwFQYDVQQKEw5BbnRocm9waWMsIFBCQzEpMCcGA1UEAxMgQW50aHJvcGljIENsYXVkZSBDb250ZW50IFNpZ25pbmcwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAASYegpry1AYBRTVNL1CpTlbROnY3dey+UrsF9C3phYrATN3ZHf93Mo8RQN0KOUuOn19P4oWNFWe5n2/She9N7eTo1gwVjAOBgNVHQ8BAf8EBAMCB4AwFQYDVR0lBA4wDAYKKwYBBAGD6F4CATAMBgNVHRMBAf8EAjAAMB8GA1UdIwQYMBaAFM5R4gSBTmRbI/jjxM+aPpzB11zCMAoGCCqGSM49BAMDA2cAMGQCMDFzHRSeAXrSy1WOzkbhPZ6Km2wGTmZ/2gK18k8BQGXyqz88Rdrz6CTX9flAnYNVxgIwcF9c3fVhqmJKpi+UhasNUMko69cyX6STPfta3Q8EjyzDjzoyrol46FP6VFHhvUcJoWNwYWRZDZ4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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";
    const bondNo = `MDS DWK ${seqPadded}`;
    const htmlContent = `


<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Bond Certificate - ${investor.fullName}</title>
  <style>
    
  :root{
    --navy:#134086;
    --navy-deep:#071c3f;
    --navy-mid:#123a76;
    --gold:#c9a227;
    --gold-lt:#f2dc9a;
    --gold-dk:#8d6b12;
    --paper:#fdfaf1;
    --paper-2:#f7f0dd;
    --ink:#134086;
    --rule:#c8b88c;
  }
  .cert-container-wrapper {
    font-family:"EB Garamond",Georgia,"Times New Roman",serif;
    color:#134086;
    display:flex;flex-direction:column;align-items:center;
  }
  
  /* ---------- page scaling ---------- */
  .stage{width:min(1400px,100%); display:flex; justify-content:center;}
  .scaler{width:1400px;transform-origin:top left; transform: scale(0.65); transform-origin: top center;}
  
  /* ---------- certificate frame ---------- */
  .cert{
    position:relative;width:1400px;min-height:933px;
    background:
      radial-gradient(120% 90% at 50% 0%,#fffdf6 0%,var(--paper) 45%,var(--paper-2) 100%);
    padding:10px;
    box-shadow:0 18px 50px rgba(0,0,0,.45);
  }
  /* outer gold band */
  .band{
    position:relative;padding:9px;
    background:linear-gradient(135deg,#8d6b12 0%,#e6c65c 14%,#fff2c0 25%,#c9a227 40%,#8d6b12 55%,#e8cb69 72%,#fff0ba 84%,#a5801a 100%);
  }
  /* navy band */
  .band-navy{
    padding:7px;
    background:linear-gradient(135deg,var(--navy-deep),var(--navy-mid) 45%,var(--navy-deep));
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);
  }
  .sheet{
    position:relative;
    background:
      linear-gradient(0deg,rgba(201,162,39,.05),rgba(201,162,39,.05)),
      radial-gradient(100% 80% at 50% 0%,#fffef9 0%,var(--paper) 55%,#f8f1df 100%);
    outline:2px solid var(--gold);outline-offset:-6px;
    padding:30px 40px 0;
  }
  .sheet::before{ /* hairline inner rule */
    content:"";position:absolute;inset:11px;border:1px solid rgba(141,107,18,.45);
    pointer-events:none;
  }
  
  /* corner filigree */
  .corner{position:absolute;width:138px;height:138px;pointer-events:none;z-index:5}
  .corner.tl{top:11px;left:11px}
  .corner.tr{top:11px;right:11px;transform:scaleX(-1)}
  .corner.bl{bottom:11px;left:11px;transform:scaleY(-1)}
  .corner.br{bottom:11px;right:11px;transform:scale(-1,-1)}
  
  /* ---------- header ---------- */
  header.head{display:flex;align-items:flex-start;gap:18px;position:relative;z-index:2}
  .logo{width:112px;flex:0 0 112px;margin-top:2px}
  .logo img{width:100%;display:block}
  .titleblock{flex:1;text-align:center;padding-top:4px}
  .company{
    font-family:"Cinzel",serif;font-weight:700;color:var(--navy);
    font-size:35px;line-height:1.08;letter-spacing:.005em;margin:0;
  }
  .tagline{
    font-family:"Cinzel",serif;font-weight:600;color:var(--gold-dk);
    font-size:19px;letter-spacing:.06em;margin:7px 0 6px;
  }
  .address{font-size:18px;line-height:1.35;color:#134086;margin:0;max-width:640px;margin-inline:auto}
  
  .meta{flex:0 0 300px;padding-top:6px}
  .meta-row{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-bottom:9px}
  .meta-row span{font-size:17px;color:#134086}
  .meta-row .val{
    min-width:172px;text-align:center;font-weight:600;color:var(--navy);
    background:linear-gradient(#fffdf4,#f6edd6);
    border:1.5px solid var(--gold);border-radius:6px;padding:5px 12px;font-size:17px;
  }
  
  /* ---------- ribbon title ---------- */
  .ribbon{position:relative;margin:20px 0 22px;display:flex;align-items:center;justify-content:center}
  .ribbon .flourish{position:absolute;top:50%;transform:translateY(-50%);width:210px;height:74px}
  .ribbon .flourish.l{left:14px}
  .ribbon .flourish.r{right:14px;transform:translateY(-50%) scaleX(-1)}
  .plate{
    position:relative;z-index:2;width:900px;text-align:center;padding:12px 30px 15px;
    background:linear-gradient(180deg,#14376f,#0a2149 60%,#071b3a);
    border:2px solid var(--gold);
    box-shadow:0 2px 10px rgba(0,0,0,.35),inset 0 0 0 1px rgba(242,220,154,.35);
    clip-path:polygon(28px 0,calc(100% - 28px) 0,100% 50%,calc(100% - 28px) 100%,28px 100%,0 50%);
  }
  .plate h1{
    font-family:"Cinzel",serif;font-weight:700;margin:0;
    font-size:40px;line-height:1.05;letter-spacing:.012em;
    background:linear-gradient(180deg,#fff4c9,#e7c766 55%,#c39a1e);
    -webkit-background-clip:text;background-clip:text;color:transparent;
  }
  .plate h2{
    font-family:"Cinzel",serif;font-weight:600;margin:5px 0 0;
    font-size:25px;letter-spacing:.09em;color:#fff;
  }
  
  /* ---------- certify text ---------- */
  .certify{font-size:20.5px;line-height:1.55;margin:0 0 4px; text-align: center;}
  .certify b{color:#134086}
  .sum{
    display:flex;align-items:baseline;justify-content:center;gap:16px;flex-wrap:wrap;margin:14px 0 10px;
    font-size:20.5px;
  }
  .sum .box{
    font-family:"Cinzel",serif;font-weight:600;font-size:21px;letter-spacing:.03em;
    color:#123a76;background:linear-gradient(#fffdf2,#f3e7c9);
    border:1px solid var(--gold);border-radius:4px;padding:7px 42px;
    box-shadow:inset 0 1px 0 #fff;
  }
  .sum .fig{font-weight:700;font-size:21px;color:#134086}
  .terms-intro{font-size:20.5px;margin:2px 0 16px; text-align: center;}
  
  /* ---------- body grid ---------- */
  .grid-cert{display:grid;grid-template-columns:1fr 540px;gap:34px;align-items:start; text-align:left;}
  
  dl.details{margin:0;font-size:19.5px}
  dl.details .row{display:flex;align-items:baseline;padding:8.5px 0;border-bottom:1px dotted rgba(141,107,18,.28)}
  dl.details dt{flex:0 0 218px;color:#134086}
  dl.details .sep{flex:0 0 18px;color:#555}
  dl.details dd{margin:0;flex:1;font-weight:600;color:#134086}
  
  .tc{
    border:2px solid var(--navy);border-radius:5px;overflow:hidden;
    background:linear-gradient(#fffdf5,#f8f1de);
  }
  .tc h3{
    margin:0;font-family:"Cinzel",serif;font-size:21px;font-weight:700;letter-spacing:.05em;
    text-align:left;padding:7px 18px;color:var(--gold-lt);
    background:linear-gradient(180deg,#123a76,#0a2149);
  }
  .tc ol{margin:0;padding:12px 18px 14px 36px;font-size:17.6px;line-height:1.36}
  .tc li{margin-bottom:8px;padding-left:4px}
  .tc li:last-child{margin-bottom:2px}
  .tc li::marker{font-weight:600;color:#134086}
  
  /* ---------- value received ---------- */
  .value{margin:26px 0 0;font-size:19.5px;line-height:1.45;max-width:660px}
  .for-company{font-family:"Cinzel",serif;font-weight:600;font-size:19px;color:#134086;margin:12px 0 0}
  
  /* ---------- signature area ---------- */
  .signs{display:grid;grid-template-columns:1fr 300px 1fr;gap:20px;align-items:end;margin-top:6px;padding-bottom:26px}
  .sig{text-align:center}
  .sig .line{border-bottom:1.6px solid #22314d;height:74px;margin:0 auto 7px;max-width:330px}
  .sig strong{display:block;font-family:"Cinzel",serif;font-weight:600;font-size:18px;color:#134086}
  .sig span{font-size:17px;color:#134086}
  .ack{padding-bottom:6px}
  .ack h4{font-family:"Cinzel",serif;font-size:18.5px;margin:0 0 6px;color:#134086;font-weight:600}
  .ack p{margin:0;font-size:18px;line-height:1.4}
  .seal{align-self:end;justify-self:center;width:230px;margin-bottom:-6px}
  .seal svg{width:100%;display:block;filter:drop-shadow(0 4px 8px rgba(0,0,0,.28))}
  
  /* ---------- footer bar ---------- */
  .footbar{
    margin:0 -40px;padding:11px 20px;text-align:center;
    background:linear-gradient(180deg,#123a76,#071c3f);
    border-top:2px solid var(--gold);
    font-family:"Cinzel",serif;font-size:19px;letter-spacing:.055em;color:#f3e2ac;
  }
  
    body { background: #3c4658; margin: 0; padding: 28px 14px 60px; font-family: "EB Garamond", Georgia, "Times New Roman", serif; color: var(--ink); display: flex; flex-direction: column; align-items: center; }

  @media print{
    @page { size: A4 landscape; margin: 0; }
    html, body {
      width: 297mm !important;
      height: 210mm !important;
      max-width: 297mm !important;
      max-height: 210mm !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      overflow: hidden !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .cert-container-wrapper {
      background: #ffffff !important;
      width: 297mm !important;
      height: 210mm !important;
      padding: 0 !important;
      margin: 0 !important;
      overflow: hidden !important;
    }
    .bar { display: none !important; }
    .stage {
      width: 297mm !important;
      height: 210mm !important;
      max-width: 297mm !important;
      max-height: 210mm !important;
      background: var(--paper) !important;
      margin: 0 !important;
      padding: 0 !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      overflow: hidden !important;
      page-break-before: avoid !important;
      page-break-after: avoid !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .scaler {
      width: 1400px !important;
      zoom: 0.802 !important;
      transform: scale(0.802) !important;
      transform-origin: center center !important;
      margin: 0 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .cert {
      box-shadow: none !important;
      margin: 0 !important;
      height: 990px !important;
      display: flex !important;
      flex-direction: column !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .band {
      flex: 1 !important;
      display: flex !important;
      flex-direction: column !important;
    }
    .band-navy {
      flex: 1 !important;
      display: flex !important;
      flex-direction: column !important;
    }
    .sheet {
      flex: 1 !important;
    }
  }
  @media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
  </style>
</head>
<body>
<div class="stage">
<div class="scaler" id="scaler">
<div class="cert">
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <symbol id="cnr" viewBox="0 0 176 176">
        <g fill="none" stroke="#cda93a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 170 L10 42 Q10 10 42 10 L170 10"/>
          <path d="M19 170 L19 46 Q19 19 46 19 L170 19" stroke-width="1.1" stroke-opacity=".75"/>
        </g>
        <g fill="none" stroke="#c9a227" stroke-width="2.4" stroke-linecap="round">
          <path d="M30 150 C30 106 46 74 80 56 C100 46 116 54 112 68 C109 79 95 79 93 69"/>
          <path d="M150 30 C106 30 74 46 56 80 C46 100 54 116 68 112 C79 109 79 95 69 93"/>
        </g>
        <g fill="#dcb94e" stroke="none">
          <ellipse cx="40" cy="126" rx="14" ry="5.5" transform="rotate(-75 40 126)"/>
          <ellipse cx="56" cy="92" rx="14" ry="5.5" transform="rotate(-58 56 92)"/>
          <ellipse cx="82" cy="66" rx="14" ry="5.5" transform="rotate(-30 82 66)"/>
          <ellipse cx="126" cy="40" rx="14" ry="5.5" transform="rotate(-15 126 40)"/>
          <ellipse cx="92" cy="56" rx="14" ry="5.5" transform="rotate(-32 92 56)"/>
          <ellipse cx="66" cy="82" rx="14" ry="5.5" transform="rotate(-60 66 82)"/>
        </g>
        <g fill="#e2c264" stroke="none">
          <path d="M32 32 l7.5 13 13 7.5 -13 7.5 -7.5 13 -7.5-13 -13-7.5 13-7.5Z"/>
          <circle cx="32" cy="32" r="3" fill="#fff6d6"/>
        </g>
        <g fill="#c9a227" stroke="none">
          <circle cx="26" cy="156" r="3.2"/><circle cx="156" cy="26" r="3.2"/>
        </g>
      </symbol>
    </svg>
    <svg class="corner tl" viewBox="0 0 176 176" aria-hidden="true"><use href="#cnr"/></svg>
    <svg class="corner tr" viewBox="0 0 176 176" aria-hidden="true"><use href="#cnr"/></svg>
    <svg class="corner bl" viewBox="0 0 176 176" aria-hidden="true"><use href="#cnr"/></svg>
    <svg class="corner br" viewBox="0 0 176 176" aria-hidden="true"><use href="#cnr"/></svg>

 <div class="band">
  <div class="band-navy">
   <div class="sheet">

    <header class="head">
      <div class="logo"><img src="${logoBase64}" alt="Niventra Capital Advisory India Pvt Ltd" /></div>
      <div class="titleblock">
        <p class="company">Niventra Capital Advisory India Pvt Ltd</p>
        <p class="tagline">Invest Today Prosper Tomorrow</p>
        <p class="address">${companyAddress}</p>
      </div>
      <div class="meta">
        <div class="meta-row"><span>Bond No. :</span><span class="val">${bondNo}</span></div>
        <div class="meta-row"><span>Issue Date :</span><span class="val">${issueDateStr}</span></div>
        <div class="meta-row"><span>Maturity Date :</span><span class="val">${maturityDateStr}</span></div>
      </div>
    </header>

    <div class="ribbon">
      <svg class="flourish l" viewBox="0 0 210 74" aria-hidden="true">
        <g fill="none" stroke="#c9a227" stroke-width="2.3" stroke-linecap="round">
          <path d="M14 37 C40 12 74 14 100 32"/>
          <path d="M14 37 C40 62 74 60 100 42"/>
          <path d="M100 37 C120 30 140 34 158 37" stroke-width="1.4"/>
        </g>
        <g fill="#d9b74a" stroke="none" opacity=".9">
          <ellipse cx="34" cy="25" rx="13" ry="5.6" transform="rotate(-30 34 25)"/>
          <ellipse cx="58" cy="19" rx="13" ry="5.6" transform="rotate(-12 58 19)"/>
          <ellipse cx="82" cy="23" rx="13" ry="5.6" transform="rotate(12 82 23)"/>
          <ellipse cx="34" cy="49" rx="13" ry="5.6" transform="rotate(30 34 49)"/>
          <ellipse cx="58" cy="55" rx="13" ry="5.6" transform="rotate(12 58 55)"/>
          <ellipse cx="82" cy="51" rx="13" ry="5.6" transform="rotate(-12 82 51)"/>
        </g>
        <g fill="#c9a227" stroke="none">
          <circle cx="14" cy="37" r="4.4"/><circle cx="162" cy="37" r="3"/>
          <circle cx="104" cy="37" r="2.4"/>
        </g>
      </svg>
      <div class="plate">
        <h1>Secured Non-Convertible Debenture</h1>
        <h2>Bond Certificate</h2>
      </div>
      <svg class="flourish r" viewBox="0 0 210 74" aria-hidden="true">
        <g fill="none" stroke="#c9a227" stroke-width="2.3" stroke-linecap="round">
          <path d="M14 37 C40 12 74 14 100 32"/>
          <path d="M14 37 C40 62 74 60 100 42"/>
          <path d="M100 37 C120 30 140 34 158 37" stroke-width="1.4"/>
        </g>
        <g fill="#d9b74a" stroke="none" opacity=".9">
          <ellipse cx="34" cy="25" rx="13" ry="5.6" transform="rotate(-30 34 25)"/>
          <ellipse cx="58" cy="19" rx="13" ry="5.6" transform="rotate(-12 58 19)"/>
          <ellipse cx="82" cy="23" rx="13" ry="5.6" transform="rotate(12 82 23)"/>
          <ellipse cx="34" cy="49" rx="13" ry="5.6" transform="rotate(30 34 49)"/>
          <ellipse cx="58" cy="55" rx="13" ry="5.6" transform="rotate(12 58 55)"/>
          <ellipse cx="82" cy="51" rx="13" ry="5.6" transform="rotate(-12 82 51)"/>
        </g>
        <g fill="#c9a227" stroke="none">
          <circle cx="14" cy="37" r="4.4"/><circle cx="162" cy="37" r="3"/>
          <circle cx="104" cy="37" r="2.4"/>
        </g>
      </svg>
    </div>

    <p class="certify">This is to certify that the bearer is the registered holder of a <b>Secured Non-Convertible Debenture</b> issued by<br/>
    <b>NIVENTRA CAPITAL ADVISORY INDIA PVT LTD</b> (hereinafter referred to as <b>“the Company”</b>) for the</p>

    <div class="sum">
      <span>principal sum of</span>
      <span class="box">Rupees ${numberToWords(principalAmount)} Only</span>
      <span class="fig">(₹&nbsp;<span>${principalAmount.toLocaleString()}</span>/-)</span>
    </div>

    <p class="terms-intro">on the terms and conditions set out herein and in the Debenture Trust Deed / Offer Document.</p>

    <div class="grid-cert">
      <dl class="details">
        <div class="row"><dt>Investor Name</dt><span class="sep">:</span><dd>${investor.fullName}</dd></div>
        <div class="row"><dt>Father's Name</dt><span class="sep">:</span><dd>${fatherName}</dd></div>
        <div class="row"><dt>Address</dt><span class="sep">:</span><dd>${address}</dd></div>
        <div class="row"><dt>Mobile No.</dt><span class="sep">:</span><dd>${investor.phone}</dd></div>
        <div class="row"><dt>Email ID</dt><span class="sep">:</span><dd>${investor.email}</dd></div>
        <div class="row"><dt>Nominee Name</dt><span class="sep">:</span><dd>${nomineeName}</dd></div>
        <div class="row"><dt>Nominee Relation</dt><span class="sep">:</span><dd>${nomineeRelation}</dd></div>
        <div class="row"><dt>Principal Amount</dt><span class="sep">:</span><dd>₹ ${principalAmount.toLocaleString()}/-</dd></div>
        <div class="row"><dt>Maturity Period</dt><span class="sep">:</span><dd>${maturityPeriodMonths} ${maturityPeriodMonths === 1 ? "Month" : "Months"}</dd></div>
        <div class="row"><dt>Amount Payable on Maturity</dt><span class="sep">:</span><dd>₹ ${maturityAmount.toLocaleString()}/- (${numberToWords(maturityAmount)} Only)</dd></div>
      </dl>

      <section class="tc">
        <h3>Terms &amp; Conditions</h3>
        <ol>
          <li>The Company shall pay interest at the rate of ${growthRate}% per month on the principal amount.</li>
          <li>The principal amount shall be repaid at the end of ${maturityPeriodMonths} months from the date of issue, subject to the terms of the Debenture Trust Deed and applicable laws.</li>
          <li>The Debenture is secured by a charge on the Company’s specified assets, as per the Debenture Trust Deed.</li>
          <li>This Debenture is non-convertible and not transferable without the prior written consent of the Company.</li>
          <li>In case of default, the Company shall be liable to pay penal interest as per the terms in the Debenture Trust Deed.</li>
          <li>This Debenture is issued in compliance with the Companies Act, 2013, SEBI (Issue and Listing of Non-Convertible Securities) Regulations, 2021, FEMA/RBI guidelines and other applicable laws.</li>
        </ol>
      </section>
    </div>

    <div class="grid-cert" style="margin-top: 4px">
      <div>
        <p class="value">For value received, the Company hereby acknowledges the terms of this Debenture and agrees to be bound by the same.</p>
        <p class="for-company">For Niventra Capital Advisory India Pvt Ltd</p>
      </div>
      <div class="ack" style="align-self: end">
        <h4>Investor’s Acknowledgement</h4>
        <p>I/We hereby confirm receipt of this Debenture Certificate and agree to abide by the terms and conditions mentioned herein.</p>
      </div>
    </div>

    <div class="signs">
      <div class="sig">
        <div class="line" style="position: relative;">
          <span style="position: absolute; bottom: 4px; width: 100%; text-align: center; font-family: 'Brush Script MT', 'Dancing Script', cursive; font-size: 28px; color: #134086; opacity: 0.8;">Deepak Dyal</span>
        </div>
        <strong>Authorized Signatory</strong>
        <span>(Deepak Dyal)</span>
      </div>

      <div class="seal">
        <svg viewBox="0 0 240 240" role="img" aria-label="Company seal">
          <defs>
            <linearGradient id="gm" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#8d6b12"/><stop offset="22%" stop-color="#f6e39c"/>
              <stop offset="45%" stop-color="#c9a227"/><stop offset="68%" stop-color="#fff3c4"/>
              <stop offset="100%" stop-color="#9c7a15"/>
            </linearGradient>
            <linearGradient id="gm2" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stop-color="#b4901e"/><stop offset="50%" stop-color="#f3dd93"/>
              <stop offset="100%" stop-color="#a5801a"/>
            </linearGradient>
            <path id="arcTop" d="M120 120 m-86 0 a86 86 0 1 1 172 0" fill="none"/>
            <path id="arcBot" d="M120 120 m84 0 a84 84 0 1 1 -168 0" fill="none"/>
            <clipPath id="lg"><circle cx="120" cy="118" r="44"/></clipPath>
          </defs>

          <g fill="url(#gm2)" opacity=".95">
            <g>
              <path d="M52 62 C24 92 22 150 50 186 C42 146 40 100 52 62Z"/>
              <path d="M188 62 C216 92 218 150 190 186 C198 146 200 100 188 62Z"/>
            </g>
            <g id="leaves">
              <ellipse cx="34" cy="96" rx="13" ry="7" transform="rotate(-38 34 96)"/>
              <ellipse cx="29" cy="120" rx="13" ry="7" transform="rotate(-12 29 120)"/>
              <ellipse cx="31" cy="145" rx="13" ry="7" transform="rotate(14 31 145)"/>
              <ellipse cx="40" cy="168" rx="13" ry="7" transform="rotate(38 40 168)"/>
              <ellipse cx="55" cy="188" rx="13" ry="7" transform="rotate(58 55 188)"/>
              <ellipse cx="206" cy="96" rx="13" ry="7" transform="rotate(38 206 96)"/>
              <ellipse cx="211" cy="120" rx="13" ry="7" transform="rotate(12 211 120)"/>
              <ellipse cx="209" cy="145" rx="13" ry="7" transform="rotate(-14 209 145)"/>
              <ellipse cx="200" cy="168" rx="13" ry="7" transform="rotate(-38 200 168)"/>
              <ellipse cx="185" cy="188" rx="13" ry="7" transform="rotate(-58 185 188)"/>
            </g>
          </g>

          <circle cx="120" cy="120" r="92" fill="url(#gm)"/>
          <circle cx="120" cy="120" r="84" fill="none" stroke="#7d5f10" stroke-width="1.6" opacity=".7"/>
          <circle cx="120" cy="120" r="64" fill="#fdfaf1"/>
          <circle cx="120" cy="120" r="64" fill="none" stroke="#8d6b12" stroke-width="2"/>
          <circle cx="120" cy="120" r="58" fill="none" stroke="#c9a227" stroke-width="1"/>

          <g fill="#6b5210" font-family="Cinzel, serif" font-size="13.5" font-weight="700" letter-spacing="2.4">
            <text><textPath href="#arcTop" startOffset="50%" text-anchor="middle">SECURED DEBENTURE</textPath></text>
            <text><textPath href="#arcBot" startOffset="50%" text-anchor="middle">TRUST CERTIFICATE</textPath></text>
          </g>

          <g clip-path="url(#lg)">
            <!-- We replaced the logo tag entirely so no base64 needed here because we didn't get logo.png base64 for download-bond. But wait, in download-bond we need the same logoBase64 -->
            <image href="${logoBase64}" x="78" y="80" width="84" height="78" preserveAspectRatio="xMidYMid meet"/>
          </g>

          <g fill="#8d6b12">
            <path d="M104 170 l2.6 5.6 6.1.8 -4.5 4.3 1.1 6.1 -5.3-2.9 -5.3 2.9 1.1-6.1 -4.5-4.3 6.1-.8Z"/>
            <path d="M120 170 l2.6 5.6 6.1.8 -4.5 4.3 1.1 6.1 -5.3-2.9 -5.3 2.9 1.1-6.1 -4.5-4.3 6.1-.8Z"/>
            <path d="M136 170 l2.6 5.6 6.1.8 -4.5 4.3 1.1 6.1 -5.3-2.9 -5.3 2.9 1.1-6.1 -4.5-4.3 6.1-.8Z"/>
          </g>
        </svg>
      </div>

      <div class="sig">
        <div class="line" style="position: relative;">
          ${investor.bondAgreement?.signatureText ? (
            investor.bondAgreement.signatureText.startsWith('data:image/') 
              ? `<img src="${investor.bondAgreement.signatureText}" alt="Investor Signature" style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); max-height: 60px; max-width: 90%; object-fit: contain;" />`
              : `<span style="position: absolute; bottom: 4px; left: 0; width: 100%; text-align: center; font-family: 'Brush Script MT', 'Dancing Script', cursive; font-size: 28px; color: #134086; opacity: 0.8;">${investor.bondAgreement.signatureText}</span>`
          ) : ''}
        </div>
        <strong>Signature of Investor</strong>
        <span></span>
      </div>
    </div>

    <div class="footbar">Niventra Capital Advisory India Pvt Ltd &nbsp;|&nbsp; Invest Today Prosper Tomorrow</div>

   </div>
  </div>
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
