import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CycleEats — PCOS Nutrition Manager",
  description: "Analyze your meals for PCOS-friendly nutrition",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
