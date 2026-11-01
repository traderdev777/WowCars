import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/auth/customerAuth";
import { db } from "@/lib/db";
import { PartProduct } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId");

    if (!vehicleId) {
      return NextResponse.json(
        { error: "vehicleId query parameter is required." },
        { status: 400 }
      );
    }

    const vehicle = await db.getCustomerVehicleById(vehicleId);
    if (!vehicle || vehicle.customerId !== auth.customer.id) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Retrieve active spare parts
    const { products } = await db.getPartProducts({ status: "PUBLISHED" });

    const vehicleMakeLower = vehicle.make.toLowerCase();
    const vehicleModelLower = vehicle.model.toLowerCase();
    const vehicleYear = vehicle.year;

    // Filter and score compatibility
    const matchedParts = products
      .map((part) => {
        let confidence: "EXACT" | "HIGH" | "UNIVERSAL" | "NONE" = "NONE";
        let matchReason = "";

        // Check compatibility list
        const fitment = (part.compatibleVehicles || []).find((c) => {
          const makeMatches = c.make.toLowerCase() === vehicleMakeLower;
          const modelMatches = !c.model || c.model.toLowerCase() === vehicleModelLower;
          const yearMatches =
            (!c.startYear || c.startYear <= vehicleYear) &&
            (!c.endYear || c.endYear >= vehicleYear);
          return makeMatches && modelMatches && yearMatches;
        });

        if (fitment) {
          confidence = "EXACT";
          matchReason = `Directly verified for ${vehicle.make} ${vehicle.model} (${vehicle.year})`;
        } else if (
          part.title.toLowerCase().includes(vehicleMakeLower) &&
          part.title.toLowerCase().includes(vehicleModelLower)
        ) {
          confidence = "HIGH";
          matchReason = `Catalog title match for ${vehicle.make} ${vehicle.model}`;
        } else if (part.categorySlug === "accessories" || part.categoryName?.toLowerCase().includes("accessories")) {
          confidence = "UNIVERSAL";
          matchReason = "Universal fitment across automotive platforms";
        }

        return {
          part,
          confidence,
          matchReason,
        };
      })
      .filter((item) => item.confidence !== "NONE")
      .sort((a, b) => {
        const order = { EXACT: 3, HIGH: 2, UNIVERSAL: 1, NONE: 0 };
        return order[b.confidence] - order[a.confidence];
      });

    return NextResponse.json({
      vehicle: {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        variant: vehicle.variant,
      },
      matchedCount: matchedParts.length,
      recommendations: matchedParts.slice(0, 16).map((item) => ({
        ...item.part,
        compatibilityConfidence: item.confidence,
        matchReason: item.matchReason,
      })),
    });
  } catch (error) {
    console.error("Error matching compatible parts:", error);
    return NextResponse.json({ error: "Failed to match compatible parts" }, { status: 500 });
  }
}
