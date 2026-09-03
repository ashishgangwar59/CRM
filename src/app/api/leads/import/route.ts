import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Lead } from "@/lib/models/Lead";
import { LeadActivity } from "@/lib/models/LeadActivity";
import * as XLSX from "xlsx";
import { verifyAccessToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { User } = await import("@/lib/models/User");
    const user = await User.findById((payload as any).userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "KEY_ADMIN" && (!user.accessibleModules || !user.accessibleModules.includes("Leads CSV Actions"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { Employee } = await import("@/lib/models/Employee");
    const currentEmployee = await Employee.findOne({ email: user.email }).lean();
    const currentOwnerId = currentEmployee ? currentEmployee._id : user._id;

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let rows: any[] = [];
    
    // If it's a CSV, we can try parsing the text directly to avoid delimiter splitting errors
    if (file.name.endsWith(".csv")) {
      try {
        const csvText = await file.text();
        // Split by lines and remove carriage returns
        const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        
        if (lines.length > 1) {
          const headerLine = lines[0];
          // Detect delimiter: comma, semicolon, or tab
          let delimiter = ",";
          if (headerLine.includes(";")) delimiter = ";";
          else if (headerLine.includes("\t")) delimiter = "\t";
          
          // Split headers and clean them
          const headers = headerLine.split(delimiter).map(h => 
            h.replace(/^\uFEFF/, "").replace(/^"+|"+$/g, "").trim().toLowerCase()
          );
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            // Split row cells, taking care of simple quotes
            const values = line.split(delimiter).map(v => 
              v.replace(/^"+|"+$/g, "").trim()
            );
            
            const cleanRow: any = {};
            headers.forEach((header, index) => {
              cleanRow[header] = values[index] || "";
            });
            rows.push(cleanRow);
          }
        }
      } catch (csvError) {
        console.error("Direct CSV parse failed, falling back to XLSX reader:", csvError);
      }
    }
    
    // Fallback to XLSX reader (works for both Excel binary sheets and standard CSV files)
    if (rows.length === 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const xlsxRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      
      for (const row of xlsxRows) {
        const cleanRow: any = {};
        for (const key of Object.keys(row)) {
          const cleanKey = key.replace(/^\uFEFF/, "").trim().toLowerCase();
          cleanRow[cleanKey] = row[key];
        }
        rows.push(cleanRow);
      }
    }

    let importedCount = 0;
    const errors = [];

    for (const row of rows) {
      try {
        // Clean keys: trim whitespace, remove BOM, convert to lowercase
        const cleanRow: any = {};
        for (const key of Object.keys(row)) {
          const cleanKey = key.replace(/^\uFEFF/, "").trim().toLowerCase();
          cleanRow[cleanKey] = row[key];
        }

        const keys = Object.keys(cleanRow);
        
        // Robust partial matching to handle truncated headers (e.g. FIRST_NA, SECOND_I)
        const firstNameKey = keys.find(k => k.startsWith("first") || k.includes("first_na") || k.includes("firstname"));
        const lastNameKey = keys.find(k => k.startsWith("second") || k.startsWith("last") || k.includes("second_i") || k.includes("second_n"));
        const phoneKey = keys.find(k => k.startsWith("mobile") || k.startsWith("phone") || k === "contact");
        const companyKey = keys.find(k => k.startsWith("company"));
        const address1Key = keys.find(k => k === "address1" || k === "address 1" || k.startsWith("address1") || k.includes("address_1"));
        const address2Key = keys.find(k => k === "address2" || k === "address 2" || k.startsWith("address2") || k.includes("address_2"));
        const address3Key = keys.find(k => k === "address3" || k === "address 3" || k.startsWith("address3") || k.includes("address_3"));
        const cityKey = keys.find(k => k.startsWith("city"));
        const stateKey = keys.find(k => k.startsWith("state"));
        const pinKey = keys.find(k => k.startsWith("pin"));
        const remarkKey = keys.find(k => k.startsWith("remark"));

        const firstName = firstNameKey ? cleanRow[firstNameKey] : undefined;

        if (!firstName || !firstName.toString().trim()) {
          // If the row is completely empty, ignore it silently
          const hasAnyData = Object.values(cleanRow).some(val => val !== undefined && val !== null && val.toString().trim() !== "");
          if (!hasAnyData) continue;
          
          errors.push(`Row missing FIRST_NAME (parsed keys: ${keys.join(", ")})`);
          continue;
        }

        const lastName = lastNameKey ? cleanRow[lastNameKey] : "";
        const phone = phoneKey ? cleanRow[phoneKey] : "";
        const company = companyKey ? cleanRow[companyKey] : "";
        const address1 = address1Key ? cleanRow[address1Key] : "";
        const address2 = address2Key ? cleanRow[address2Key] : "";
        const address3 = address3Key ? cleanRow[address3Key] : "";
        const city = cityKey ? cleanRow[cityKey] : "";
        const state = stateKey ? cleanRow[stateKey] : "";
        const pinCode = pinKey ? cleanRow[pinKey] : "";
        const remark = remarkKey ? cleanRow[remarkKey] : "";

        // Create the lead
        const lead = await Lead.create({
          firstName: firstName.toString().trim(),
          lastName: lastName.toString().trim(),
          phone: phone.toString().trim(),
          company: company.toString().trim(),
          address1: address1.toString().trim(),
          address2: address2.toString().trim(),
          address3: address3.toString().trim(),
          city: city.toString().trim(),
          state: state.toString().trim(),
          pinCode: pinCode.toString().trim(),
          remark: remark.toString().trim(),
          source: "Website",
          status: "Open",
          stage: "New",
          priority: "Medium",
          ownerId: currentOwnerId
        });

        // If there's a remark, log it in activity
        if (remark.toString().trim()) {
          await LeadActivity.create({
            leadId: lead._id,
            type: "Note",
            content: `Import Remark: ${remark.toString().trim()}`,
            createdBy: payload.userId
          });
        } else {
          // Default initial activity
          await LeadActivity.create({
            leadId: lead._id,
            type: "StatusChange",
            content: "Lead imported successfully.",
            createdBy: payload.userId
          });
        }

        importedCount++;
      } catch (err: any) {
        errors.push(`Failed to import row: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      errors
    });
  } catch (error: any) {
    console.error("Import Leads Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
