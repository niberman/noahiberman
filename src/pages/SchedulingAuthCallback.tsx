import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import {
  schedulingApiNeedsPublicBase,
  useExchangeSchedulingAuthCode,
} from "@/hooks/use-scheduling";

export default function SchedulingAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const exchangeCode = useExchangeSchedulingAuthCode();

  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const apiMisconfigured = schedulingApiNeedsPublicBase();

  useEffect(() => {
    if (!code || error || apiMisconfigured || exchangeCode.isSuccess) return;
    if (exchangeCode.isPending || exchangeCode.isError) return;

    exchangeCode.mutate(code, {
      onSuccess: () => {
        window.setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
      },
    });
  }, [
    apiMisconfigured,
    code,
    error,
    exchangeCode,
    navigate,
  ]);

  const title = exchangeCode.isSuccess
    ? "Google Calendar connected"
    : error || exchangeCode.isError || !code || apiMisconfigured
    ? "Google Calendar connection failed"
    : "Connecting Google Calendar";

  return (
    <>
      <SEO
        title={title}
        description="Connect Google Calendar for scheduling."
      />

      <div className="min-h-screen bg-gradient-dusk pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-xl">
          <Card className="bg-card/95 backdrop-blur animate-slide-up">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                {exchangeCode.isSuccess ? (
                  <CheckCircle2 className="h-14 w-14 text-green-400" />
                ) : error || exchangeCode.isError || !code || apiMisconfigured ? (
                  <AlertCircle className="h-14 w-14 text-destructive" />
                ) : (
                  <Loader2 className="h-14 w-14 animate-spin text-secondary" />
                )}
              </div>
              <CardTitle className="text-2xl font-display">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              {exchangeCode.isSuccess ? (
                <p className="text-muted-foreground">
                  Your refresh token was saved successfully. You will be taken
                  back to the dashboard shortly.
                </p>
              ) : null}

              {apiMisconfigured ? (
                <p className="text-sm text-destructive">
                  The frontend is running against a local scheduling API. Set
                  `VITE_API_BASE` to your deployed backend URL before using
                  Google Calendar auth from production.
                </p>
              ) : null}

              {error ? (
                <p className="text-sm text-destructive">
                  {errorDescription || "Google returned an authorization error."}
                </p>
              ) : null}

              {!code && !error && !apiMisconfigured ? (
                <p className="text-sm text-destructive">
                  Missing OAuth code in the callback URL.
                </p>
              ) : null}

              {exchangeCode.isError ? (
                <p className="text-sm text-destructive">
                  {exchangeCode.error instanceof Error
                    ? exchangeCode.error.message
                    : "Failed to exchange the Google authorization code."}
                </p>
              ) : null}

              {error || exchangeCode.isError || !code || apiMisconfigured ? (
                <Button asChild variant="outline">
                  <Link to="/dashboard">Return to dashboard</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
