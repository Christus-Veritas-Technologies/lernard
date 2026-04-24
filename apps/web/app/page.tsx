import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Welcome — Lernard",
  description: "Start your Lernard journey with sign-in, onboarding, and your first tailored learning steps.",
};

export default function RootPage() {
  redirect("/welcome");
}
