import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCsrf } from "@/lib/auth/csrf";
import { validateIndianPincode } from "@/lib/locations/indiaLocations";
import { PartOrderItem, PartOrderStatus } from "@/lib/db/types";

export async function POST(req: NextRequest) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid && csrf.response) {
      return csrf.response;
    }

    const body = await req.json();
    const {
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      items,
      paymentMethod,
    } = body;

    // 1. Customer Details Validation
    if (!customerName || typeof customerName !== "string" || customerName.trim().length < 2) {
      return NextResponse.json({ error: "Valid customer name is required." }, { status: 400 });
    }

    const cleanPhone = (customerPhone || "").replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json({ error: "Valid 10-digit mobile number is required." }, { status: 400 });
    }

    // 2. Shipping Address & Indian PIN Code Validation
    if (!shippingAddress || !shippingAddress.addressLine || !shippingAddress.city || !shippingAddress.pincode) {
      return NextResponse.json({ error: "Complete shipping address with PIN code is required." }, { status: 400 });
    }

    const pinCheck = validateIndianPincode(shippingAddress.pincode);
    if (!pinCheck.valid) {
      return NextResponse.json({ error: pinCheck.error || "Invalid PIN code." }, { status: 400 });
    }

    // 3. Cart Items & Server-Side Inventory/Price Revalidation
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty. Please add items before checking out." }, { status: 400 });
    }

    const verifiedOrderItems: PartOrderItem[] = [];
    let subtotalINR = 0;
    let shippingINR = 0;

    for (const item of items) {
      if (!item.productId || typeof item.quantity !== "number" || item.quantity <= 0) {
        return NextResponse.json({ error: "Invalid item specification in cart." }, { status: 400 });
      }

      const product = await db.getPartProductById(item.productId);
      if (!product || product.status === "ARCHIVED" || product.status === "REJECTED") {
        return NextResponse.json(
          { error: `Item "${item.productId}" is no longer available in the catalogue.` },
          { status: 400 }
        );
      }

      if (product.stockQuantity < item.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for "${product.title}". Requested: ${item.quantity}, Available: ${product.stockQuantity}.`,
          },
          { status: 400 }
        );
      }

      // Compute tamper-proof price from verified database records
      const itemPrice = product.priceINR || product.price || 0;
      subtotalINR += itemPrice * item.quantity;
      shippingINR += (product.shippingChargeINR || 0) * item.quantity;

      verifiedOrderItems.push({
        productId: product.id,
        title: product.title,
        slug: product.slug,
        brand: product.brand,
        partNumber: product.partNumber || "",
        price: itemPrice,
        priceINR: itemPrice,
        mrpINR: product.mrpINR,
        mrp: product.mrp,
        quantity: item.quantity,
        subtotal: itemPrice * item.quantity,
        image: product.images && product.images.length > 0 ? product.images[0] : "/parts/image-unavailable.svg",
        sellerId: product.sellerId,
      });
    }

    // Free shipping threshold
    if (subtotalINR >= 999) {
      shippingINR = 0;
    }

    const totalINR = subtotalINR + shippingINR;

    // 4. Payment Provider Abstraction
    const method = paymentMethod || "MOCK_PAYMENT";
    let paymentStatus: "PENDING" | "CONFIRMED" | "FAILED" = "PENDING";
    let orderStatus: PartOrderStatus = "PENDING_PAYMENT";
    let txnId: string | undefined = undefined;

    if (method === "MOCK_PAYMENT" || method === "UPI" || method === "CARD") {
      // Development mock payment gateway simulation
      paymentStatus = "CONFIRMED";
      orderStatus = "PAYMENT_CONFIRMED";
      txnId = `TXN-MOCK-${Date.now()}`;
    } else if (method === "COD") {
      paymentStatus = "PENDING";
      orderStatus = "PROCESSING";
      txnId = `COD-${Date.now()}`;
    }

    // 5. Create Order & Atomically Decrement Inventory
    const order = await db.createPartOrder({
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      customerEmail: (customerEmail || "").trim(),
      shippingAddress: {
        addressLine: shippingAddress.addressLine.trim(),
        city: shippingAddress.city.trim(),
        district: shippingAddress.district?.trim() || "",
        state: shippingAddress.state?.trim() || "Karnataka",
        pincode: pinCheck.normalized!,
      },
      items: verifiedOrderItems,
      subtotalINR,
      subtotal: subtotalINR,
      shippingINR,
      discountINR: 0,
      totalINR,
      totalAmount: totalINR,
      paymentMethod: method,
      paymentStatus,
      paymentTransactionId: txnId,
      orderStatus,
    });

    return NextResponse.json({
      success: true,
      message: "Order placed successfully.",
      orderNumber: order.orderNumber,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        totalINR: order.totalINR,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        itemsCount: order.items.length,
      },
    });
  } catch (error: unknown) {
    console.error("POST /api/spare-parts/checkout error:", error);
    return NextResponse.json({ error: "Failed to process checkout." }, { status: 500 });
  }
}
