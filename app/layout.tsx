import "./globals.css";
import { Poppins } from "next/font/google";
import "katex/dist/katex.min.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"]
});

// ✅ METADATA BIASA
export const metadata = {
  title: "Gachaverse.id"
};

// ✅ VIEWPORT FIX UNTUK MOBILE
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" // ✅ PENTING UNTUK SAFE AREA HP
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${poppins.className} h-full overflow-hidden`}>
        {children}
      </body>
    </html>
  );
}
