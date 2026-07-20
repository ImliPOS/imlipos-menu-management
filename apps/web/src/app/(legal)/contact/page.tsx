import type { Metadata } from "next";
import { PolicyPage, PolicySection } from "@/components/legal/PolicyPage";

export const metadata: Metadata = {
  title: "Contact Us — ImliPos",
  description: "Business details and support contact information for ImliPos.",
};

const DETAILS: { label: string; value: string; href?: string }[] = [
  { label: "Business name", value: "ARCKS Technosoft Private Limited" },
  {
    label: "Registered address",
    value:
      "2nd floor, 259, 3rd Main Rd, above SBI, opp. BMTC Bus Stop, Kumaraswamy Layout 2nd Stage, ISRO Layout, Bengaluru, Karnataka 560078",
  },
  {
    label: "Support email",
    value: "support@arckstechnosoft.com",
    href: "mailto:support@arckstechnosoft.com",
  },
  { label: "Phone", value: "+91 97414 52947", href: "tel:+919741452947" },
  { label: "Support hours", value: "Mon – Sat, 9:00 AM – 9:00 PM" },
];

export default function ContactPage() {
  return (
    <PolicyPage title="Contact Us" effectiveDate="13 July 2026">
      <PolicySection heading="Business details">
        <dl className="divide-y divide-border">
          {DETAILS.map(({ label, value, href }) => (
            <div
              key={label}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-sm font-medium text-foreground">
                {href ? (
                  <a href={href} className="underline hover:text-foreground">
                    {value}
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </PolicySection>

      <PolicySection heading="Support">
        <p>
          For billing questions, refunds, or technical help, email us with your
          shop name and registered email address. We respond within 48 hours on
          business days.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
