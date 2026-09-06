import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "リュウゼツランマップ",
  description: "巨大なリュウゼツランの開花状況を、安全に投稿・共有する地図。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
