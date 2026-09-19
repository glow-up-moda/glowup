"use client";

import { Button } from "@/components/ui/button";
import { IconPrinter } from "@/components/ui/icons";

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="print:hidden">
      <IconPrinter />
      Imprimir
    </Button>
  );
}
