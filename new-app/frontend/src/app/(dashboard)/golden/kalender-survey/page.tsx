import { KalenderSurvey } from "@/components/kalender-survey";
import { KalenderAfterPengerjaan } from "@/components/kalender-pengerjaan";

export const metadata = { title: "Kalender Survey — RubahrumahxGolden" };

export default function GoldenKalenderSurveyPage() {
  return (
    <div className="space-y-12">
      <KalenderSurvey modul="golden" />
      <hr className="border-dashed border-gray-300" />
      <KalenderAfterPengerjaan modul="golden" />
    </div>
  );
}
