import "./globals.css";
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { ReactNode } from "react";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Credit Union Admin",
  description: "Admin shell for the microfinance credit union platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body>{children}</body>
    </html>
  );
}
