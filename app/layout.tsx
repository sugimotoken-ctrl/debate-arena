import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Debate Arena — Claude vs GPT",
  description:
    "Two AI models debate opposing sides of a topic, with a neutral moderator scoring agreement and summarizing the outcome.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
