import type { Metadata } from "next";

import { AdminClient } from "./admin-client";

export const metadata: Metadata = {
  title: "運営確認箱 | リュウゼツランマップ",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminClient />;
}
