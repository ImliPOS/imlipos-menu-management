import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, PolicySection } from "@/components/legal/PolicyPage";

export const metadata: Metadata = {
  title: "About Us — ImliPos",
  description:
    "ImliPos is a digital menu display platform for restaurants and cafes, built by ARCKS Technosoft Private Limited in Bengaluru.",
};

const FEATURES: { title: string; body: string }[] = [
  {
    title: "One menu, every screen",
    body: "Add categories, items, prices and photos once in the web dashboard. Every paired TV picks up the change in seconds.",
  },
  {
    title: "Live sold-out updates",
    body: "Mark an item unavailable from your phone or laptop and it disappears from the displays straight away. No more crossing things off by hand.",
  },
  {
    title: "Layouts that fit your counter",
    body: "Pick a ready-made template for landscape or portrait screens, mix menu blocks with images and video, and set colours, frames and your logo to match your brand.",
  },
  {
    title: "Keeps running offline",
    body: "Each display keeps a copy of its last menu, so a dropped Wi-Fi connection never leaves a blank screen in front of your customers.",
  },
];

export default function AboutPage() {
  return (
    <PolicyPage title="About Us">
      <PolicySection heading="Who we are">
        <p>
          ImliPos is a digital menu display platform for restaurants, cafes and
          quick-service counters. It is built and operated by{" "}
          <strong className="text-foreground">ARCKS Technosoft Private Limited</strong>,
          a software company based in Bengaluru, Karnataka.
        </p>
        <p>
          Printed menu boards go out of date the moment a price changes or an
          item runs out. ImliPos puts your menu on a TV screen and keeps it
          current from a single dashboard.
        </p>
      </PolicySection>

      <PolicySection heading="Line of business">
        <p>
          <strong className="text-foreground">Software as a Service (SaaS).</strong>{" "}
          We sell subscription licences for ImliPos, our digital menu display
          software for restaurants and cafes. Each licence covers one display
          for one year.
        </p>
        <p>
          Everything we sell is software, delivered online: the web dashboard
          and the TV app. We do not sell or ship physical goods. You use your
          own TV or tablet.
        </p>
      </PolicySection>

      <PolicySection heading="What ImliPos does">
        <ul className="!list-none !pl-0 space-y-4">
          {FEATURES.map(({ title, body }) => (
            <li key={title} className="!ml-0">
              <span className="block font-medium text-foreground">{title}</span>
              <span className="mt-1 block">{body}</span>
            </li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection heading="How it works">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Sign up and add your menu in the ImliPos web dashboard.</li>
          <li>
            Install the Imli Menu management app on an Android TV or tablet. It
            shows a pairing code.
          </li>
          <li>
            Enter the code in the dashboard, choose a layout and the categories
            to show, and the display goes live.
          </li>
        </ol>
      </PolicySection>

      <PolicySection heading="Pricing">
        <p>
          ImliPos is licensed per display and billed yearly in Indian Rupees
          (₹). The price is shown in the app before you pay, and payments are
          handled by our payment partner. See our{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link href="/refunds" className="underline hover:text-foreground">
            Refund Policy
          </Link>{" "}
          for details.
        </p>
      </PolicySection>

      <PolicySection heading="Get in touch">
        <p>
          Questions, a demo, or help setting up your screens? Email{" "}
          <a
            href="mailto:support@arckstechnosoft.com"
            className="underline hover:text-foreground"
          >
            support@arckstechnosoft.com
          </a>{" "}
          or call{" "}
          <a href="tel:+919741452947" className="underline hover:text-foreground">
            +91 97414 52947
          </a>{" "}
          (Mon – Sat, 9:00 AM – 9:00 PM). Our full business details are on the{" "}
          <Link href="/contact" className="underline hover:text-foreground">
            Contact
          </Link>{" "}
          page.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
