import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/dictionaries";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIGGIE - Gestion des GIE Agricoles",
  description: "SaaS de gestion des GIE agricoles au Sénégal",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const isRtl = locale === 'ar';

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} className={`${inter.variable} ${outfit.variable} h-full antialiased`}>
      <body className={`min-h-full flex flex-col ${isRtl ? 'font-sans-arabic' : ''}`}>{children}</body>
    </html>
  );
}
