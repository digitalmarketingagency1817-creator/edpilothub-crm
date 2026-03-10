"use client";

import { ThemeProvider } from "next-themes";
import { TRPCReactProvider } from "@/trpc/client";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <NuqsAdapter>
        <TRPCReactProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </TRPCReactProvider>
      </NuqsAdapter>
    </ThemeProvider>
  );
}
