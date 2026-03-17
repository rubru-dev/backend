"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProgresPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/aktivitas"); }, [router]);
  return null;
}
