"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Profile() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/signin");
  }

  return (
    <div className="mx-auto max-w-lg p-8">
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="font-medium">Account</h2>
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="text-foreground">{email || "—"}</p>
        </div>
        <button
          onClick={signOut}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-secondary/60"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
