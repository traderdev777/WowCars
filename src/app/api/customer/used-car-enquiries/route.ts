import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/auth/customerAuth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const cleanCustPhone = auth.customer.phone.replace(/\D/g, "").slice(-10);

    // Retrieve enquiries for this customer phone
    const allEnquiries = await db.getEnquiries();
    const customerEnquiries = allEnquiries.filter(
      (e) => (e.buyerPhone || "").replace(/\D/g, "").slice(-10) === cleanCustPhone
    );

    // Populate car summary details for each enquiry
    const enrichedEnquiries = await Promise.all(
      customerEnquiries.map(async (enq) => {
        const car = await db.getCarById(enq.carId);
        return {
          ...enq,
          carSummary: car
            ? {
                id: car.id,
                title: `${car.year} ${car.make} ${car.model} ${car.variant || ""}`.trim(),
                price: car.priceINR,
                city: car.city,
                locality: car.locality,
                imageUrl: car.images && car.images[0] ? car.images[0] : null,
                status: car.status,
              }
            : null,
        };
      })
    );

    return NextResponse.json({
      enquiries: enrichedEnquiries,
      count: enrichedEnquiries.length,
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Error fetching customer car enquiries:", error);
    return NextResponse.json({ error: "Failed to fetch enquiries" }, { status: 500 });
  }
}
