import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Cars | WowCars PAN-India",
  description: "Browse verified pre-owned vehicles on WowCars.",
};

/**
 * WowCars is NOT a public dealer directory.
 * Direct visits to /dealers are protected on the server and immediately redirected to the vehicle catalog (/cars).
 * Authorized administrators manage dealers privately inside the Admin Panel (/admin).
 */
export default function DealersPage() {
  redirect("/cars");
}
