import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { ScrollReset } from "./scroll-reset";

export const metadata: Metadata = {
  title: {
    default: "アオノリュウゼツランの開花情報・見られる場所｜リュウゼツランマップ",
    template: "%s | リュウゼツランマップ",
  },
  description: "リュウゼツラン（アオノリュウゼツラン）の開花状況・見られる場所・観察履歴を地図で探せるサイト。開花中、花茎が伸びている株、枯死後・子株の記録を掲載しています。",
  applicationName: "リュウゼツランマップ",
  authors: [{ name: "リュウゼツランマップ運営" }],
  category: "nature",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "リュウゼツランマップ",
    title: "アオノリュウゼツランの開花情報・見られる場所｜リュウゼツランマップ",
    description: "リュウゼツラン（アオノリュウゼツラン）の開花状況・見られる場所・観察履歴を地図で探せるサイト。",
  },
  twitter: {
    card: "summary",
    title: "アオノリュウゼツランの開花情報・見られる場所｜リュウゼツランマップ",
    description: "リュウゼツラン（アオノリュウゼツラン）の開花状況と観察記録を地図で探せるサイト。",
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
      <body className="antialiased site-frame">
        <ScrollReset />
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-49RK7F8S5B" />
        <Script id="google-analytics">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-49RK7F8S5B');`}
        </Script>
        <SiteHeader />
        <div className="site-page-content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
