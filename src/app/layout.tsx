import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BloomBoard — Kanban for Bloom Growth",
  description:
    "Visualize your Bloom Growth Rocks, Milestones, To-Dos and Issues on a Kanban board.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
