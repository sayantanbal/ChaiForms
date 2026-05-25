import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ErrorBoundary } from "~/components/error-boundary";
import { GlobalProviders } from "~/providers/global";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "ChaiForms",
  description: "Media Forwarding",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ErrorBoundary>
          <GlobalProviders>{children}</GlobalProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
