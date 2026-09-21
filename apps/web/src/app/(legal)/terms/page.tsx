import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, PolicySection } from "@/components/legal/PolicyPage";

export const metadata: Metadata = {
  title: "Terms & Conditions — ImliPos",
  description:
    "Terms and conditions for using ImliPos, the digital menu display platform for restaurants and cafes.",
};

export default function TermsPage() {
  return (
    <PolicyPage title="Terms & Conditions" effectiveDate="13 July 2026">
      <PolicySection heading="1. About the service">
        <p>
          ImliPos (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;the Service&rdquo;)
          is a subscription software service operated by ARCKS Technosoft Private Limited
          that lets restaurants and cafes manage their menus and display them on
          TV screens. The Service consists of a web dashboard for managing
          menus, plans, and displays, and a companion TV application.
        </p>
        <p>
          By creating an account or using the Service you agree to these Terms.
          If you do not agree, do not use the Service.
        </p>
      </PolicySection>

      <PolicySection heading="2. Accounts">
        <p>
          You must provide accurate information when creating an account and
          keep your credentials secure. You are responsible for all activity
          under your account. You must be authorised to act for the business
          (shop/cafe/restaurant) you register.
        </p>
      </PolicySection>

      <PolicySection heading="3. Licences and billing">
        <ul>
          <li>
            The Service is licensed per display. Each display you pair requires
            its own licence, billed <strong>yearly in advance</strong> in Indian
            Rupees (₹). To run additional displays, purchase one licence for each.
          </li>
          <li>
            The licence price is shown in the app before you pay. Payments are
            processed by our payment partner (Paytm); we do not store your card,
            UPI, or bank details.
          </li>
          <li>
            Each licence covers a one-year term and does not renew
            automatically unless stated in the app at the time of purchase.
          </li>
          <li>
            Prices may change; a change applies only to new purchases and
            renewals, never to a licence term you have already paid for.
          </li>
        </ul>
        <p>
          Cancellations and refunds are governed by our{" "}
          <Link href="/refunds" className="underline hover:text-foreground">
            Refund &amp; Cancellation Policy
          </Link>
          .
        </p>
      </PolicySection>

      <PolicySection heading="4. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>use the Service for any unlawful purpose;</li>
          <li>
            upload content you do not have rights to, or content that is
            offensive, misleading, or infringes third-party rights;
          </li>
          <li>
            attempt to breach, probe, or overload our systems, or access other
            customers&rsquo; data;
          </li>
          <li>resell or sublicense the Service without our written consent.</li>
        </ul>
      </PolicySection>

      <PolicySection heading="5. Your content">
        <p>
          You retain ownership of the menu content, images, and videos you
          upload. You grant us a licence to store, process, and display that
          content solely to provide the Service (for example, rendering your
          menu on your paired displays).
        </p>
      </PolicySection>

      <PolicySection heading="6. Availability and changes">
        <p>
          We aim for high availability but do not guarantee uninterrupted
          service. We may modify features over time. If we discontinue the
          Service, we will provide reasonable notice to active subscribers.
        </p>
      </PolicySection>

      <PolicySection heading="7. Termination">
        <p>
          You may stop using the Service and delete your account at any time
          from the app&rsquo;s settings. We may suspend or terminate accounts
          that violate these Terms. On termination your subscription ends per
          the Refund &amp; Cancellation Policy and your data is deleted as
          described in the{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </PolicySection>

      <PolicySection heading="8. Limitation of liability">
        <p>
          To the maximum extent permitted by law, the Service is provided
          &ldquo;as is&rdquo; and our total liability for any claim arising out
          of the Service is limited to the amount you paid us in the twelve (12)
          months preceding the claim. We are not liable for indirect or
          consequential losses, including lost profits or business
          interruption.
        </p>
      </PolicySection>

      <PolicySection heading="9. Governing law">
        <p>
          These Terms are governed by the laws of India. Courts at
          Bengaluru, Karnataka shall have exclusive jurisdiction.
        </p>
      </PolicySection>

      <PolicySection heading="10. Contact">
        <p>
          Questions about these Terms:{" "}
          <a
            href="mailto:support@arckstechnosoft.com"
            className="underline hover:text-foreground"
          >
            support@arckstechnosoft.com
          </a>{" "}
          — see our{" "}
          <Link href="/contact" className="underline hover:text-foreground">
            Contact page
          </Link>{" "}
          for full business details.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
