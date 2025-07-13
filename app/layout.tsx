import type { Metadata } from "next";
import "./globals.css";
import FooterWrapper from "./components/FooterWrapper";

export const metadata: Metadata = {
  title: "Generic Control DashBoard",
  description: "In House Reconcilation Framework.",
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </head>
      <body>
        {children}
        <FooterWrapper />
      </body>
    </html>
  );
}
