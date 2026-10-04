import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cosmic EdTech Quiz - Classroom Team Battle",
  description: "Real-time gamified classroom team quiz platform with cosmic space theme.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen cosmic-bg text-slate-100 antialiased selection:bg-cosmic-cyan selection:text-slate-950">
        {/* Subtle background star elements */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="star w-1 h-1 top-[10%] left-[15%]" style={{ "--duration": "4s", "--delay": "0s" } as CSSProperties} />
          <div className="star w-1.5 h-1.5 top-[25%] left-[80%]" style={{ "--duration": "3s", "--delay": "1s" } as CSSProperties} />
          <div className="star w-1 h-1 top-[60%] left-[10%]" style={{ "--duration": "5s", "--delay": "2s" } as CSSProperties} />
          <div className="star w-2 h-2 top-[80%] left-[70%]" style={{ "--duration": "3.5s", "--delay": "0.5s" } as CSSProperties} />
          <div className="star w-1 h-1 top-[40%] left-[45%]" style={{ "--duration": "4.5s", "--delay": "1.5s" } as CSSProperties} />
        </div>
        
        {/* Main Application Container */}
        <div className="relative z-10 flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
