import type { Metadata } from "next";

import { CouponForm } from "@/components/admin/coupon-form";
import { PageHeader, Section } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth/admin";

import { createCoupon } from "../actions";

export const metadata: Metadata = { title: "Nuevo cupón" };

export default async function NewCouponPage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Nuevo cupón"
        back={{ href: "/admin/cupones", label: "Cupones" }}
      />
      <Section>
        <CouponForm action={createCoupon} mode="create" />
      </Section>
    </>
  );
}
