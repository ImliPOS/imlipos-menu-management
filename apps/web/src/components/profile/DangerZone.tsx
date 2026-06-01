"use client";

import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** Permanently delete the account (shop + all menus/screens/devices + login). */
export function DangerZone() {
  const router = useRouter();

  async function deleteAccount() {
    try {
      await api.deleteAccount();
    } finally {
      await supabase.auth.signOut();
      router.replace("/signin");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col space-y-1">
        <h3 className="font-semibold">Danger Zone</h3>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account. This removes your shop, menus, screens,
          and paired displays, and cannot be undone.
        </p>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardContent>
            <div className="flex justify-between gap-4 max-lg:flex-col lg:items-center">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Delete account</h3>
                <p className="text-sm text-muted-foreground">
                  All your data will be removed. This action is irreversible.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-red-600/60 text-red-400 hover:bg-red-600/10 max-lg:w-full"
                  >
                    <Trash2Icon className="size-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This deletes your shop, all categories, items, screens, and
                      paired displays, plus your login. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteAccount}>
                      Delete account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
