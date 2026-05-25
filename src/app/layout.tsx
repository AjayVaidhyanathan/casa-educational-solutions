import type { Metadata } from "next";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import { AuthProvider } from "@/lib/unistay/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "CASA Educational Solutions | Study, Work & Live in Germany",
  description: "The One-Stop-Shop Where Your German Dream Begins. We simplify eligibility checks, university admissions, student visa assistance, accommodation, and integration.",
  icons: {
    icon: "/images/tab.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
