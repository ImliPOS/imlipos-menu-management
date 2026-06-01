import { Separator } from "@/components/ui/separator";
import { PersonalInfo } from "@/components/profile/PersonalInfo";
import { EmailPassword } from "@/components/profile/EmailPassword";
import { ShopSettings } from "@/components/profile/ShopSettings";
import { DangerZone } from "@/components/profile/DangerZone";

export default function Profile() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PersonalInfo />
      <Separator className="my-10" />
      <EmailPassword />
      <Separator className="my-10" />
      <ShopSettings />
      <Separator className="my-10" />
      <DangerZone />
    </section>
  );
}
