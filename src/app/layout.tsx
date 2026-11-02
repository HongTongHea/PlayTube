import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ApiKeyModal from "@/components/ApiKeyModal";

export const metadata: Metadata = {
  title: "PlayTube — Clean, Ad-Free YouTube Web App",
  description:
    "Minimalist, distraction-free, ad-free video streaming experience powered by Next.js and YouTube Data API v3.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col selection:bg-red-500 selection:text-white">
        <AppProvider>
          <Navbar />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
          <ApiKeyModal />
        </AppProvider>
      </body>
    </html>
  );
}
