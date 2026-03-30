import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { Montserrat } from "next/font/google";

import { ThemeProvider } from "../components/theme-provider";
import { TooltipProvider } from "../components/ui/tooltip";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Credit Union Admin",
  description: "Admin shell for the microfinance credit union platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={montserrat.variable} lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
