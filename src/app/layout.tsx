import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "이세계 던전 탐험",
  description: "현실 정보 기반 캐릭터 생성과 랜덤 던전 탐험 웹 RPG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
