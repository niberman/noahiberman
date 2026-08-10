import { LegalPage } from "@/components/LegalPage";
import legal from "@/data/legal.json";

export default function Terms() {
  return (
    <LegalPage
      path="terms"
      heading="Terms of Use"
      title="Terms of Use | Noah Berman"
      description="Terms of use for noahiberman.com."
      body={legal.terms}
    />
  );
}
