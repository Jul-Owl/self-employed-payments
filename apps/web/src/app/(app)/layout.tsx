import { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50">
        <div className="px-4 pb-20 pt-4">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}