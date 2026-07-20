import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, PolicySection } from "@/components/legal/PolicyPage";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — ImliPos",
  description:
    "How subscription cancellations and payment refunds work for ImliPos.",
};

export default function RefundsPage() {
  return (
    <PolicyPage title="Refund & Cancellation Policy" effectiveDate="13 July 2026">
      <PolicySection heading="1. Nature of the service">
        <p>
          ImliPos is a <strong>digital software licence</strong>, sold per
          display. Nothing physical is shipped, so no shipping or delivery terms
          apply. A licence is activated immediately after successful payment and
          lets you pair and run one display for a one-year term.
        </p>
      </PolicySection>

      <PolicySection heading="2. Purchases are non-refundable once in use">
        <p>
          Once a licence has been activated and your menu is being displayed on
          a TV or display, the licence fee for that term is{" "}
          <strong>non-refundable</strong>. In particular, the following do{" "}
          <strong>not</strong> qualify for a refund:
        </p>
        <ul>
          <li>deciding you no longer need a display;</li>
          <li>cancelling or stopping use before the one-year term ends;</li>
          <li>reducing the number of displays you run.</li>
        </ul>
      </PolicySection>

      <PolicySection heading="3. When we do issue a refund">
        <p>
          We refund only when the fault is on our side and we are unable to
          resolve it within a reasonable time:
        </p>
        <ul>
          <li>
            <strong>Failure to deliver</strong> — payment was taken but the
            licence was not activated / you were unable to pair your display,
            and we cannot resolve it within 7 business days.
          </li>
          <li>
            <strong>Service not working</strong> — a technical fault in our
            software or display service prevents your menu from being displayed,
            and we are unable to fix it within a reasonable time.
          </li>
          <li>
            <strong>Duplicate or incorrect charge</strong> — you were charged
            more than once for the same licence, or an amount different from the
            price shown at checkout.
          </li>
        </ul>
        <p>
          Approved refunds are processed to the{" "}
          <strong>original payment method within 5–7 business days</strong> of
          approval. Depending on your bank, it may take additional time for the
          amount to reflect in your account.
        </p>
      </PolicySection>

      <PolicySection heading="4. Cancellation">
        <p>
          You can cancel at any time from <em>Settings → Billing</em> in the
          dashboard, or by writing to us. Cancellation stops future renewals;
          your licence stays active until the end of the term you have already
          paid for, after which the display is unpaired. Cancellation on its own
          does not trigger a refund (see sections 2 and 3).
        </p>
      </PolicySection>

      <PolicySection heading="5. How to request a refund">
        <p>
          Email{" "}
          <a
            href="mailto:support@arckstechnosoft.com"
            className="underline hover:text-foreground"
          >
            support@arckstechnosoft.com
          </a>{" "}
          from your registered email address with your shop name, the payment
          date, the amount, and the transaction/order reference. We respond to
          refund requests within 48 hours on business days.
        </p>
      </PolicySection>

      <PolicySection heading="6. Contact">
        <p>
          Full business and contact details are on our{" "}
          <Link href="/contact" className="underline hover:text-foreground">
            Contact page
          </Link>
          .
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
