import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { PageHeader, PageShell } from "@/components/editorial/EditorialPage";
import { rise } from "@/components/editorial/fx";
import { useExchangeSchedulingAuthCode } from "@/hooks/use-scheduling";

export default function SchedulingAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const exchangeCode = useExchangeSchedulingAuthCode();

  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  useEffect(() => {
    if (!code || error || exchangeCode.isSuccess) return;
    if (exchangeCode.isPending || exchangeCode.isError) return;

    exchangeCode.mutate(code, {
      onSuccess: () => {
        window.setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
      },
    });
  }, [
    code,
    error,
    exchangeCode,
    navigate,
  ]);

  const title = exchangeCode.isSuccess
    ? "Google Calendar connected"
    : error || exchangeCode.isError || !code
    ? "Google Calendar connection failed"
    : "Connecting Google Calendar";

  return (
    <>
      <SEO
        title={title}
        description="Connect Google Calendar for scheduling."
      />

      <PageShell width="max-w-[720px]">
          <PageHeader
            align="center"
            eyebrow={
              exchangeCode.isSuccess ? (
                <CheckCircle2 className="mx-auto h-7 w-7 text-ed-light" />
              ) : error || exchangeCode.isError || !code ? (
                <AlertCircle className="mx-auto h-7 w-7 text-destructive" />
              ) : (
                <Loader2 className="mx-auto h-7 w-7 animate-spin text-ed-light" />
              )
            }
            title={title}
          />
          <div className="ed-rise space-y-4 text-center" style={rise(0.6)}>
              {exchangeCode.isSuccess ? (
                <p className="text-[15px] font-light text-ed-body">
                  Your refresh token was saved successfully. You will be taken
                  back to the dashboard shortly.
                </p>
              ) : null}

              {error ? (
                <p className="text-sm text-destructive">
                  {errorDescription || "Google returned an authorization error."}
                </p>
              ) : null}

              {!code && !error ? (
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

              {error || exchangeCode.isError || !code ? (
                <Button asChild variant="outline">
                  <Link to="/dashboard">Return to dashboard</Link>
                </Button>
              ) : null}
          </div>
      </PageShell>
    </>
  );
}
