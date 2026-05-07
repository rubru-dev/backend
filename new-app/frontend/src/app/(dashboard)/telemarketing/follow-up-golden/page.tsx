import { FollowUpLeads } from "@/components/follow-up-leads";

export const metadata = { title: "Follow Up Leads Golden" };

export default function TelemarketingFollowUpGoldenPage() {
  return (
    <FollowUpLeads
      modul="golden"
      campaignSelectUrl="/golden/meta-ads/campaigns-select"
    />
  );
}
