import type { Metadata } from "next";
import Link from "next/link";

import { ActionButton } from "@/components/admin/action-button";
import { FilterNav } from "@/components/admin/filter-nav";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { IconStar } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { requireAdmin } from "@/lib/auth/admin";
import { formatDate } from "@/lib/format";
import { param } from "@/lib/params";

import { approveReview, rejectReview, resetReview } from "./actions";

export const metadata: Metadata = { title: "Reseñas" };

const TABS = [
  { value: "pendientes", label: "Esperando", status: "pending" },
  { value: "publicadas", label: "Publicadas", status: "approved" },
  { value: "rechazadas", label: "Rechazadas", status: "rejected" },
] as const;

type Tab = (typeof TABS)[number]["value"];

const empty: Record<Tab, string> = {
  pendientes: "No hay reseñas esperando. Cuando entre una, aparece acá.",
  publicadas: "Todavía no publicaste ninguna reseña.",
  rechazadas: "No rechazaste ninguna reseña.",
};

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-coral"
      aria-label={`${rating} de 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <IconStar
          key={star}
          width={18}
          height={18}
          className={star <= rating ? "" : "text-crema-oscuro"}
        />
      ))}
    </span>
  );
}

export default async function ReviewsPage({
  searchParams,
}: PageProps<"/admin/resenas">) {
  const { supabase } = await requireAdmin();
  const estado = param((await searchParams).estado);
  const tab: Tab =
    TABS.find((item) => item.value === estado)?.value ?? "pendientes";
  const status = TABS.find((item) => item.value === tab)!.status;

  const [{ data: reviews, error }, { count: pendientes }] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, rating, text, name, created_at, products(name, slug)")
      .eq("status", status)
      .order("created_at", { ascending: status === "pending" })
      .limit(50),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return (
    <>
      <PageHeader
        title="Reseñas"
        description="Lo que escriben las clientas después de recibir el pedido. Se publican cuando las aprobás."
      />

      <FilterNav
        label="Estado de las reseñas"
        items={TABS.map((item) => ({
          href: `/admin/resenas?estado=${item.value}`,
          label: item.label,
          active: item.value === tab,
          count: item.value === "pendientes" ? (pendientes ?? 0) : undefined,
        }))}
      />

      {error ? (
        <Notice tone="error">
          No pudimos cargar las reseñas. Recargá la página.
        </Notice>
      ) : reviews && reviews.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-card bg-crema-oscuro/60 p-4 md:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars rating={review.rating} />
                <span className="text-sm">{formatDate(review.created_at)}</span>
              </div>

              <p className="mt-2">{review.text}</p>

              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{review.name}</span>
                {review.products && (
                  <>
                    <span aria-hidden="true">·</span>
                    <Link
                      href={`/producto/${review.products.slug}`}
                      target="_blank"
                      className="underline underline-offset-4"
                    >
                      {review.products.name}
                    </Link>
                  </>
                )}
                {status !== "pending" && (
                  <Badge tone={status === "approved" ? "success" : "neutral"}>
                    {status === "approved" ? "Publicada" : "Rechazada"}
                  </Badge>
                )}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                {status !== "approved" && (
                  <ActionButton action={approveReview.bind(null, review.id)}>
                    Publicar
                  </ActionButton>
                )}
                {status !== "rejected" && (
                  <ActionButton
                    action={rejectReview.bind(null, review.id)}
                    variant="secondary"
                  >
                    No publicar
                  </ActionButton>
                )}
                {status !== "pending" && (
                  <ActionButton
                    action={resetReview.bind(null, review.id)}
                    variant="quiet"
                  >
                    Volver a la cola
                  </ActionButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Notice>{empty[tab]}</Notice>
      )}
    </>
  );
}
