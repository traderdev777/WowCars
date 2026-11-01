import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/auth/customerAuth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await context.params;
    const vehicle = await db.getCustomerVehicleById(id);

    if (!vehicle || vehicle.customerId !== auth.customer.id) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error("Error getting vehicle:", error);
    return NextResponse.json({ error: "Failed to get vehicle" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await context.params;
    const vehicle = await db.getCustomerVehicleById(id);

    if (!vehicle || vehicle.customerId !== auth.customer.id) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};

    if (body.mileageKm !== undefined) updates.mileageKm = parseInt(body.mileageKm, 10);
    if (body.insuranceExpiryDate !== undefined) updates.insuranceExpiryDate = String(body.insuranceExpiryDate);
    if (body.pollutionExpiryDate !== undefined) updates.pollutionExpiryDate = String(body.pollutionExpiryDate);
    if (body.nextServiceDueDate !== undefined) updates.nextServiceDueDate = String(body.nextServiceDueDate);
    if (body.regNumber !== undefined) updates.regNumber = String(body.regNumber).trim().toUpperCase();
    if (body.variant !== undefined) updates.variant = String(body.variant).trim();

    const updated = await db.updateCustomerVehicle(id, updates);

    return NextResponse.json({
      success: true,
      vehicle: updated,
    });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await context.params;
    const vehicle = await db.getCustomerVehicleById(id);

    if (!vehicle || vehicle.customerId !== auth.customer.id) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const deleted = await db.deleteCustomerVehicle(id, auth.customer.id);

    return NextResponse.json({
      success: deleted,
      message: "Vehicle removed from My Garage.",
    });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    return NextResponse.json({ error: "Failed to delete vehicle" }, { status: 500 });
  }
}
