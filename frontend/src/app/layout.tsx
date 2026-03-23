import "./globals.css";
import type { ReactNode } from "react";
import { PageViewLogger } from "@/components/molecules/PageViewLogger";

export const metadata = {
  title: "BI Service PoC",
  description: "Internal BI dashboards"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <PageViewLogger />
        {children}
      </body>
    </html>
  );
}
