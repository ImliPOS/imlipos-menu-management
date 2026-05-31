"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AuthPanel } from "@/components/ui/sign-in";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit({ email, password }: { email: string; password: string }) {
    setError(null);
    setNotice(null);
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    if (data.session) router.replace("/onboarding");
    else setNotice("Check your email to confirm your account, then sign in.");
  }

  return (
    <AuthPanel
      title={<span className="font-light tracking-tighter">Create your account</span>}
      description="Set up ImliPos to run your cafe’s digital menus."
      heroVideoSrc="/auth-hero.mp4"
      submitLabel="Create account"
      busy={busy}
      error={error}
      notice={notice}
      footerPrompt="Already have an account?"
      footerActionLabel="Sign in"
      onFooterAction={() => router.push("/signin")}
      onSubmit={onSubmit}
    />
  );
}
