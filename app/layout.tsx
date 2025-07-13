import type { Metadata } from "next";
import "./globals.css";
import FooterWrapper from "./components/FooterWrapper";

export const metadata: Metadata = {
  title: "Generic Control DashBoard",
  description: "In House Reconcilation Framework.",
  icons: {
    icon: [
      {
        url: '/hsbc.png',
        sizes: 'any',
      },
    ],
    shortcut: '/hsbc.png',
    apple: '/hsbc.png',
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
        <link rel="icon" type="image/png" href="/hsbc.png" />
        <link rel="shortcut icon" href="/hsbc.png" />
        <link rel="apple-touch-icon" href="/hsbc.png" />
      </head>
      <body>
        {children}
        <FooterWrapper />
      </body>
    </html>
  );
}
