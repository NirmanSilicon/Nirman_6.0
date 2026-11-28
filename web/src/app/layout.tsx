import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "AGENT X — Security for autonomous systems", description: "The security and governance layer for AI agents." };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
