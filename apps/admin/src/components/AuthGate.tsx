import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { ShieldX } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

/**
 * Gates the app shell: requires a Supabase session whose app_metadata.role is
 * "super_admin". This is UX only — the API enforces the role on every /admin
 * request via requireSuperAdmin.
 */
export function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return <PageSpinner />;
  if (!session) return <Navigate to="/signin" replace />;

  if (session.user.app_metadata?.role !== "super_admin") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldX className="size-12 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold">Not authorized</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            This console is for platform operators only. If you were just
            granted access, sign out and sign back in to refresh your session.
          </p>
        </div>
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>
          Sign out
        </Button>
      </div>
    );
  }

  return <Outlet />;
}
