import "./globals.css";
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { ReactNode } from "react";


const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Credit Union Admin",
  description: "Admin shell for the microfinance credit union platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={montserrat.variable}>{children}</body>
    </html>
  );
}
