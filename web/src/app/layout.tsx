import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Agent-X | Evaluation and guarded agents", description: "Inspect task contracts, real policy decisions, mock effects, and validated agent results." };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
