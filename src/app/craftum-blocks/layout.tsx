import type { ReactNode } from "react";
import { CraftumBlocksNav } from "@/components/craftum-blocks/CraftumBlocksNav";

export default function CraftumBlocksLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <CraftumBlocksNav />
      {children}
    </div>
  );
}
