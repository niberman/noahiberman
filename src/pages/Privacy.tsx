import { LegalPage } from "@/components/LegalPage";
import legal from "@/data/legal.json";

export default function Privacy() {
  return (
    <LegalPage
      path="privacy"
      heading="Privacy Policy"
      title="Privacy Policy | Noah Berman"
      description="What noahiberman.com collects, why, who processes it, and how to have it deleted."
      body={legal.privacy}
    />
  );
}
