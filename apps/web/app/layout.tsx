import type { Metadata } from "next";
import localFont from "next/font/local";

import { Providers } from "./providers";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Lernard — Your personal tutor. Always ready.",
  description: "AI-powered adaptive learning, tailored to you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans bg-background text-text-primary antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
