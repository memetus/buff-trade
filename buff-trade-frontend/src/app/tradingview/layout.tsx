import React from "react";
import BaseLayout from "@/components/base/baseLayout/BaseLayout";

export default function TradingViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BaseLayout>{children}</BaseLayout>;
}
