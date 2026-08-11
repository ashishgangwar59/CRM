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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "0");

    let invoices;
    let total = 0;
    if (page > 0 && limit > 0) {
      total = await Invoice.countDocuments();
      invoices = await Invoice.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
    } else {
      invoices = await Invoice.find().sort({ createdAt: -1 });
    }

    return NextResponse.json({ 
      success: true, 
      data: invoices,
      pagination: page > 0 && limit > 0 ? {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      } : null
    });
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
      items,
      modeOfPayment,
      paymentModeOther,
      bankName,
      transactionUtrNo,
      chequeDdNo,
      chequeDdDate,
      drawnOnBank,
      attachments
    } = body;

    if (!invoiceNo || !invoiceDate || !billToName || !billToAddress || !items || items.length === 0 || !transactionUtrNo) {
      return NextResponse.json({ error: "Missing required fields: Invoice details and Transaction / UTR No. are required." }, { status: 400 });
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
      items,
      modeOfPayment,
      paymentModeOther,
      bankName,
      transactionUtrNo,
      chequeDdNo,
      chequeDdDate,
      drawnOnBank,
      attachments: attachments || []
    });

    return NextResponse.json({ success: true, data: newInvoice, message: "Invoice saved successfully" });
  } catch (error) {
    console.error("POST Invoice Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 });

    const body = await req.json();
    const updatedInvoice = await Invoice.findByIdAndUpdate(id, body, { new: true });
    
    if (!updatedInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedInvoice, message: "Invoice updated successfully" });
  } catch (error) {
    console.error("PUT Invoice Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 });

    const deleted = await Invoice.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("DELETE Invoice Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
