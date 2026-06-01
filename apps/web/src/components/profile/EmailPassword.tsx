"use client";

import { useEffect, useMemo, useState } from "react";
import { MailIcon, EyeIcon, EyeOffIcon, CheckIcon, XIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const requirements = [
  { regex: /.{8,}/, text: "At least 8 characters" },
  { regex: /[a-z]/, text: "At least 1 lowercase letter" },
  { regex: /[A-Z]/, text: "At least 1 uppercase letter" },
  { regex: /[0-9]/, text: "At least 1 number" },
  { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/, text: "At least 1 special character" },
];

function color(score: number) {
  if (score === 0) return "bg-border";
  if (score <= 1) return "bg-red-500";
  if (score <= 2) return "bg-orange-500";
  if (score <= 3) return "bg-amber-500";
  if (score === 4) return "bg-yellow-400";
  return "bg-green-500";
}
function text(score: number) {
  if (score === 0) return "Enter a password";
  if (score <= 2) return "Weak password";
  if (score <= 3) return "Medium password";
  if (score === 4) return "Strong password";
  return "Very strong password";
}

/** Show email (read-only) and change password (Supabase). */
export function EmailPassword() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const strength = requirements.map((r) => ({ met: r.regex.test(password), text: r.text }));
  const score = useMemo(() => strength.filter((r) => r.met).length, [strength]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (score < requirements.length) {
      return setMsg({ ok: false, text: "Password doesn't meet all requirements." });
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setMsg({ ok: false, text: error.message });
    else {
      setMsg({ ok: true, text: "Password updated." });
      setPassword("");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col space-y-1">
        <h3 className="font-semibold">Email &amp; Password</h3>
        <p className="text-sm text-muted-foreground">
          Your sign-in email and password.
        </p>
      </div>

      <form onSubmit={save} className="space-y-6 lg:col-span-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Input id="email" type="email" value={email} disabled className="pr-9" />
            <MailIcon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Email changes aren’t supported here.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={show ? "text" : "password"}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>

          <div className="mt-2 flex h-1 w-full gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-full flex-1 rounded-full transition-all",
                  i < score ? color(score) : "bg-border",
                )}
              />
            ))}
          </div>
          <p className="text-sm font-medium">{text(score)}. Must contain:</p>
          <ul className="space-y-1.5">
            {strength.map((req, i) => (
              <li key={i} className="flex items-center gap-2">
                {req.met ? (
                  <CheckIcon className="size-4 text-green-400" />
                ) : (
                  <XIcon className="size-4 text-muted-foreground" />
                )}
                <span className={cn("text-xs", req.met ? "text-green-400" : "text-muted-foreground")}>
                  {req.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {msg && (
          <p className={cn("text-sm", msg.ok ? "text-green-400" : "text-red-400")}>
            {msg.text}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={busy || password.length === 0} className="max-sm:w-full">
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
