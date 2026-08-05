import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { Invoice } from "@/lib/models/Invoice";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoices = await Invoice.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: invoices });
  } catch (error) {
    console.error("GET Invoices Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      invoiceNo,
      invoiceDate,
      reverseCharge,
      state,
      stateCode,
      billToName,
      billToAddress,
      billToState,
      billToStateCode,
      items
    } = body;

    if (!invoiceNo || !invoiceDate || !billToName || !billToAddress || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing required invoice fields" }, { status: 400 });
    }

    // Check if invoice number is unique
    const existing = await Invoice.findOne({ invoiceNo });
    if (existing) {
      return NextResponse.json({ error: "Invoice number already exists" }, { status: 400 });
    }

    const newInvoice = await Invoice.create({
      invoiceNo,
      invoiceDate,
      reverseCharge,
      state,
      stateCode,
      billToName,
      billToAddress,
      billToState,
      billToStateCode,
      items
    });

    return NextResponse.json({ success: true, data: newInvoice, message: "Invoice saved successfully" });
  } catch (error) {
    console.error("POST Invoice Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
