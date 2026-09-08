import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "リュウゼツランマップ｜アオノリュウゼツラン開花マップ",
    template: "%s | リュウゼツランマップ",
  },
  description: "アオノリュウゼツランの開花中・開花前・枯死後の記録を、観察履歴と地図で共有するフィールドアトラス。",
  applicationName: "リュウゼツランマップ",
  authors: [{ name: "リュウゼツランマップ運営" }],
  category: "nature",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "リュウゼツランマップ",
    title: "リュウゼツランマップ｜アオノリュウゼツラン開花マップ",
    description: "アオノリュウゼツランの開花中・開花前・枯死後の記録を、観察履歴と地図で共有するフィールドアトラス。",
  },
  twitter: {
    card: "summary",
    title: "リュウゼツランマップ｜アオノリュウゼツラン開花マップ",
    description: "アオノリュウゼツランの開花記録を、観察履歴と地図で共有するフィールドアトラス。",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: "/favicon.svg?v=2",
    shortcut: "/favicon.svg?v=2",
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
