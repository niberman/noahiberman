import { Link } from "react-router-dom";
import { Construction, ArrowLeft } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Inoah() {
  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="iNoah | Under Construction"
        description="iNoah, Noah Berman's AI digital twin, is temporarily offline while we rebuild it."
        canonical="https://noahiberman.com/inoah"
      />
      <section className="container mx-auto px-4 pt-28 pb-16">
        <div className="max-w-2xl mx-auto">
          <Card className="border-secondary/30 bg-card/90 backdrop-blur shadow-elegant">
            <CardHeader className="space-y-3 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-secondary/20 flex items-center justify-center">
                <Construction className="h-7 w-7 text-secondary" aria-hidden="true" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl">iNoah is under construction</CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                The digital twin is temporarily offline while we rebuild it. Check back soon.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-8">
              <Button asChild variant="outline">
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to home
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
