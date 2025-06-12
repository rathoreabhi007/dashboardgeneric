import type { Metadata } from "next";
import "./globals.css";
import FooterWrapper from "./components/FooterWrapper";

export const metadata: Metadata = {
  title: "Generic Control DashBoard",
  description: "In House Reconcilation Framework.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
          {children}
        <FooterWrapper />
      </body>
    </html>
  );
}
