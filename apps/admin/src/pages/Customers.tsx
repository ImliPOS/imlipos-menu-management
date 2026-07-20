import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageSpinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";

const PAGE_SIZE = 20;

export function Customers() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const customers = useQuery({
    queryKey: ["admin", "customers", { query, page }],
    queryFn: () => api.listCustomers({ search: query, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const totalPages = customers.data
    ? Math.max(1, Math.ceil(customers.data.total / PAGE_SIZE))
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Customers</h1>
        <form
          className="relative w-full max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(search.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search shop or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
      </div>

      {customers.isLoading ? (
        <PageSpinner />
      ) : customers.isError ? (
        <p className="text-sm text-red-400">Failed to load: {String(customers.error)}</p>
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Shop</TH>
                <TH>Owner</TH>
                <TH>Plan</TH>
                <TH className="text-right">Devices</TH>
                <TH className="text-right">Screens</TH>
                <TH className="text-right">Items</TH>
                <TH>Joined</TH>
              </TR>
            </THead>
            <TBody>
              {customers.data!.rows.map((c) => (
                <TR key={c.shopId}>
                  <TD>
                    <Link
                      to={`/customers/${c.shopId}`}
                      className="font-medium hover:underline"
                    >
                      {c.shopName}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">{c.ownerEmail ?? "—"}</TD>
                  <TD>
                    {c.subscription ? (
                      <span className="inline-flex items-center gap-2">
                        {c.subscription.planName}
                        <StatusBadge status={c.subscription.status} />
                      </span>
                    ) : (
                      <Badge variant="outline">no plan</Badge>
                    )}
                  </TD>
                  <TD className="text-right tabular-nums">{c.deviceCount}</TD>
                  <TD className="text-right tabular-nums">{c.screenCount}</TD>
                  <TD className="text-right tabular-nums">{c.itemCount}</TD>
                  <TD className="text-muted-foreground">
                    {formatDate(c.shopCreatedAt)}
                  </TD>
                </TR>
              ))}
              {customers.data!.rows.length === 0 && (
                <TR>
                  <TD colSpan={7} className="py-8 text-center text-muted-foreground">
                    No customers found{query ? ` for “${query}”` : ""}.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {customers.data!.total} customer{customers.data!.total === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
