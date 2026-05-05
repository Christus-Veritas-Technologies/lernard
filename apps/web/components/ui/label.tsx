import * as React from "react";

import { cn } from "@/lib/cn";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
    ({ className, ...props }, ref) => (
        <label
            className={cn("text-sm font-medium text-text-primary", className)}
            ref={ref}
            {...props}
        />
    ),
);
Label.displayName = "Label";

export { Label };
