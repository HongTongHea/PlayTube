import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ApiKeyModal from "@/components/ApiKeyModal";
import StreamPlayer from "@/components/StreamPlayer";

export const metadata: Metadata = {
  title: "VibePlay — Clean, Ad-Free Music & Video Streaming",
  description:
    "Minimalist, distraction-free, ad-free music and video streaming experience powered by Next.js and YouTube Data API v3.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col selection:bg-red-500 selection:text-white pb-20 md:pb-16">
        <AppProvider>
          <Navbar />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
          <StreamPlayer />
          <ApiKeyModal />
        </AppProvider>
      </body>
    </html>
  );
}
