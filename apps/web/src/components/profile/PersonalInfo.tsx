"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, UploadCloudIcon, TrashIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Owner personal info — persisted to Supabase auth user_metadata. */
export function PersonalInfo() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const m = data.user?.user_metadata ?? {};
      setFirstName(m.first_name ?? "");
      setLastName(m.last_name ?? "");
      setPhone(m.phone ?? "");
      setPreview(m.avatar_url ?? null);
    });
  }, []);

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return alert("Please select an image file");
    if (f.size > 1024 * 1024) return alert("File must be smaller than 1MB");
    setPreview(URL.createObjectURL(f));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    await supabase.auth.updateUser({
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      },
    });
    setBusy(false);
    setSaved(true);
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col space-y-1">
        <h3 className="font-semibold">Personal Information</h3>
        <p className="text-sm text-muted-foreground">
          Manage your name, phone, and avatar.
        </p>
      </div>

      <div className="space-y-6 lg:col-span-2">
        <div className="space-y-2">
          <Label>Your avatar</Label>
          <div className="flex items-center gap-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              className="flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-border hover:opacity-90"
            >
              {preview ? (
                <img src={preview} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onSelect}
              />
              <Button variant="outline" onClick={() => inputRef.current?.click()}>
                <UploadCloudIcon className="size-4" />
                Upload avatar
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPreview(null)}
                disabled={!preview}
                className="text-red-400"
              >
                <TrashIcon className="size-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Pick a photo up to 1MB. (Preview only for now.)
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first-name">First name</Label>
            <Input
              id="first-name"
              placeholder="John"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-name">Last name</Label>
            <Input
              id="last-name"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setSaved(false);
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-sm text-green-400">Saved ✓</span>}
          <Button onClick={save} disabled={busy} className="max-sm:w-full">
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
