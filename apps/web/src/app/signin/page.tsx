"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AuthPanel } from "@/components/ui/sign-in";
import { PublicFooter } from "@/components/legal/PublicFooter";

// TEMPORARY: test credentials for PhonePe Business verification.
// Remove this banner before merging to main/prod.
function TestCredentialsBanner() {
  return (
    <div className="animate-element animate-delay-200 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
      <p className="font-medium text-amber-400">Test account for verification</p>
      <p className="mt-1 text-muted-foreground">
        Email: <span className="select-all font-mono text-foreground">testimli@gmail.com</span>
      </p>
      <p className="text-muted-foreground">
        Password: <span className="select-all font-mono text-foreground">testimli</span>
      </p>
    </div>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit({ email, password }: { email: string; password: string }) {
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
    else router.replace("/menu");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <AuthPanel
        title={<span className="font-light tracking-tighter">Welcome back</span>}
        description="Sign in to manage your menus and screens."
        heroVideoSrc="/auth-hero.mp4"
        submitLabel="Sign in"
        busy={busy}
        error={error}
        banner={<TestCredentialsBanner />}
        footerPrompt="New to ImliPos?"
        footerActionLabel="Create an account"
        onFooterAction={() => router.push("/signup")}
        onSubmit={onSubmit}
      />
      <PublicFooter />
    </div>
  );
}
