"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// --- TYPES ---
export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface AuthPanelProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Path to a video used as the hero (right column). */
  heroVideoSrc?: string;
  testimonials?: Testimonial[];
  /** Submit label, e.g. "Sign in" / "Create account". */
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  notice?: string | null;
  /** Footer link prompt + label + handler (e.g. switch to sign-up). */
  footerPrompt: string;
  footerActionLabel: string;
  onFooterAction: () => void;
  onSubmit: (values: { email: string; password: string }) => void;
}

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
    {children}
  </div>
);

const TestimonialCard = ({
  testimonial,
  delay,
}: {
  testimonial: Testimonial;
  delay: string;
}) => (
  <div
    className={`animate-testimonial ${delay} flex w-64 items-start gap-3 rounded-3xl border border-white/10 bg-card/40 p-5 backdrop-blur-xl`}
  >
    <img
      src={testimonial.avatarSrc}
      className="h-10 w-10 rounded-2xl object-cover"
      alt="avatar"
    />
    <div className="text-sm leading-snug">
      <p className="font-medium">{testimonial.name}</p>
      <p className="text-muted-foreground">{testimonial.handle}</p>
      <p className="mt-1 text-foreground/80">{testimonial.text}</p>
    </div>
  </div>
);

export const AuthPanel: React.FC<AuthPanelProps> = ({
  title,
  description,
  heroVideoSrc,
  testimonials = [],
  submitLabel,
  busy = false,
  error,
  notice,
  footerPrompt,
  footerActionLabel,
  onFooterAction,
  onSubmit,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit({ email, password });
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col md:flex-row">
      {/* Left column: auth form */}
      <section className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <h1 className="animate-element animate-delay-100 text-4xl font-semibold leading-tight md:text-5xl">
              {title}
            </h1>
            <p className="animate-element animate-delay-200 text-muted-foreground">
              {description}
            </p>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-muted-foreground">
                  Email address
                </label>
                <GlassInputWrapper>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@cafe.com"
                    className="w-full rounded-2xl bg-transparent p-4 text-sm focus:outline-none"
                  />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-muted-foreground">
                  Password
                </label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-2xl bg-transparent p-4 pr-12 text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute inset-y-0 right-3 flex items-center"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
                      ) : (
                        <Eye className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
                      )}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              {error && (
                <p className="animate-element text-sm text-red-400">{error}</p>
              )}
              {notice && (
                <p className="animate-element text-sm text-green-400">{notice}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="animate-element animate-delay-600 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? "Please wait…" : submitLabel}
              </button>
            </form>

            <p className="animate-element animate-delay-900 text-center text-sm text-muted-foreground">
              {footerPrompt}{" "}
              <button
                type="button"
                onClick={onFooterAction}
                className="text-violet-400 transition-colors hover:underline"
              >
                {footerActionLabel}
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* Right column: video hero + optional testimonials */}
      {heroVideoSrc && (
        <section className="relative hidden flex-1 p-4 md:block">
          <video
            className="animate-slide-right animate-delay-300 absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] rounded-3xl object-cover"
            src={heroVideoSrc}
            autoPlay
            loop
            muted
            playsInline
          />
          {testimonials.length > 0 && (
            <div className="absolute bottom-8 left-1/2 flex w-full -translate-x-1/2 justify-center gap-4 px-8">
              <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
              {testimonials[1] && (
                <div className="hidden xl:flex">
                  <TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1000" />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
