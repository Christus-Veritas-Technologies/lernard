"use client";

import * as SwitchPrimitives from "@radix-ui/react-switch";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ElementRef } from "react";

import { cn } from "@/lib/cn";

export const Switch = forwardRef<
    ElementRef<typeof SwitchPrimitives.Root>,
    ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(function Switch({ className, ...props }, ref) {
    return (
        <SwitchPrimitives.Root
            className={cn(
                "peer inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-transparent bg-background-subtle p-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=checked]:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
            ref={ref}
        >
            <SwitchPrimitives.Thumb
                className={cn(
                    "block h-5 w-5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
                )}
            />
        </SwitchPrimitives.Root>
    );
});