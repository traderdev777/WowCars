import { Metadata } from "next";
import CartClient from "./CartClient";

export const metadata: Metadata = {
  title: "Shopping Cart — Spare Parts & Equipment | WowCars India",
  description:
    "Review your automotive spare parts and tools order, revalidate live warehouse stock, check delivery serviceability by PIN code, and proceed to secure checkout.",
};

export default function CartPage() {
  return <CartClient />;
}
