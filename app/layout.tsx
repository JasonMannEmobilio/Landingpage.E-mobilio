import type { Metadata } from "next";
import { Lexend, Source_Sans_3 } from "next/font/google";
import "./globals.css";

/*
 * "Corporate Trust" pairing (ui-ux-pro-max, typography domain): Lexend for
 * headings, Source Sans 3 for body — recommended for finance/government and
 * accessibility-focused interfaces. Lexend is specifically designed for reading
 * ease, which matters on a page where customers type an IBAN and a card number.
 */
const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ladekarten-Aktivierung",
  description: "Aktivieren Sie hier Ihre Ladekarte.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${lexend.variable} ${sourceSans.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
