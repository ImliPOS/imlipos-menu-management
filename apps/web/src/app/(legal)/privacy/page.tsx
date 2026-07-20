import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, PolicySection } from "@/components/legal/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy — ImliPos",
  description: "How ImliPos collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy Policy" effectiveDate="13 July 2026">
      <PolicySection heading="1. Data we collect">
        <ul>
          <li>
            <strong>Account data</strong> — email address, name, phone number,
            and password (stored as a secure hash by our authentication
            provider).
          </li>
          <li>
            <strong>Business data</strong> — your shop name, menu categories,
            items, prices, and the images/videos you upload.
          </li>
          <li>
            <strong>Device data</strong> — identifiers and status of the TV
            displays you pair (resolution, last-seen time).
          </li>
          <li>
            <strong>Billing data</strong> — the display licences on your
            account, their status and term dates, and your order/payment
            history. <strong>We do not collect or store card, UPI, or bank
            details</strong> — payments are handled entirely by our payment
            partner (Paytm) on their systems.
          </li>
        </ul>
      </PolicySection>

      <PolicySection heading="2. How we use it">
        <ul>
          <li>to provide the Service (render your menus on your displays);</li>
          <li>
            to process display-licence purchases and renewals and send
            billing-related emails;
          </li>
          <li>to provide support and notify you of important changes;</li>
          <li>to secure the Service and prevent abuse.</li>
        </ul>
        <p>We do not sell your personal data.</p>
      </PolicySection>

      <PolicySection heading="3. Storage and security">
        <p>
          Data is stored with reputable cloud providers (database and
          authentication on Supabase, application hosting on Vercel/Render)
          using encryption in transit. Access to production data is restricted
          to authorised personnel.
        </p>
      </PolicySection>

      <PolicySection heading="4. Retention and deletion">
        <p>
          We keep your data while your account is active. Deleting your account
          from <em>Settings → Account</em> permanently removes your shop, menus,
          screens, paired displays, and login. Billing records may be retained
          where required by law (e.g. tax regulations).
        </p>
      </PolicySection>

      <PolicySection heading="5. Contact">
        <p>
          Privacy questions or data requests:{" "}
          <a
            href="mailto:support@arckstechnosoft.com"
            className="underline hover:text-foreground"
          >
            support@arckstechnosoft.com
          </a>{" "}
          — full details on our{" "}
          <Link href="/contact" className="underline hover:text-foreground">
            Contact page
          </Link>
          .
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
