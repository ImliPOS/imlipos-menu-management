"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AuthPanel } from "@/components/ui/sign-in";

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
    else router.replace("/dashboard");
  }

  return (
    <AuthPanel
      title={<span className="font-light tracking-tighter">Welcome back</span>}
      description="Sign in to manage your menus and screens."
      heroVideoSrc="/auth-hero.mp4"
      submitLabel="Sign in"
      busy={busy}
      error={error}
      footerPrompt="New to ImliPos?"
      footerActionLabel="Create an account"
      onFooterAction={() => router.push("/signup")}
      onSubmit={onSubmit}
    />
  );
}
