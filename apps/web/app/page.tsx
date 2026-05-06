import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign in — Lernard",
  description: "Sign in to continue your personalized learning journey on Lernard.",
};

export default function RootPage() {
  redirect("/login");
}
