import { FollowUpLeads } from "@/components/follow-up-leads";

export const metadata = { title: "Follow Up Leads — RubahrumahxGolden" };

export default function GoldenFollowUpPage() {
  return (
    <FollowUpLeads
      modul="golden"
      campaignSelectUrl="/golden/meta-ads/campaigns-select"
    />
  );
}
