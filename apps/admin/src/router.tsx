import { createBrowserRouter } from "react-router-dom";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { SignIn } from "@/pages/SignIn";
import { Overview } from "@/pages/Overview";
import { Customers } from "@/pages/Customers";
import { CustomerDetail } from "@/pages/CustomerDetail";
import { Plans } from "@/pages/Plans";
import { Subscriptions } from "@/pages/Subscriptions";

export const router = createBrowserRouter([
  { path: "/signin", element: <SignIn /> },
  {
    element: <AuthGate />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <Overview /> },
          { path: "/customers", element: <Customers /> },
          { path: "/customers/:shopId", element: <CustomerDetail /> },
          { path: "/plans", element: <Plans /> },
          { path: "/subscriptions", element: <Subscriptions /> },
        ],
      },
    ],
  },
]);
