import { Footer, Header } from "@/components/ruangkeruang";
import RuangkeruangHomePage from "./(public)/ruangkeruang/site/page";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-[#1c1c19]">
      <Header />
      <main className="pt-20">
        <RuangkeruangHomePage />
      </main>
      <Footer />
    </div>
  );
}
