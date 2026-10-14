import { Footer, Header } from "@/components/ruangkeruang";

export default function RuangkeruangPublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white text-[#1c1c19]"><Header /><main className="pt-20">{children}</main><Footer /></div>;
}
