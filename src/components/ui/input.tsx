import * as React from "react";

import { cn } from "@/lib/utils";

function placeCursorAtEnd(input: HTMLInputElement) {
  const end = input.value.length;
  window.requestAnimationFrame(() => {
    try {
      input.setSelectionRange(end, end);
    } catch {
      try {
        const currentValue = input.value;
        input.value = "";
        input.value = currentValue;
      } catch {
        // Some native numeric inputs do not expose text selection APIs.
      }
    }
  });
}

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, inputMode, onFocus, ...props }, ref) => {
    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      onFocus?.(event);

      const mode = inputMode ? String(inputMode) : "";
      const isNumericInput =
        type === "number" ||
        type === "tel" ||
        mode === "numeric" ||
        mode === "decimal" ||
        mode === "tel";

      if (isNumericInput) {
        placeCursorAtEnd(event.currentTarget);
      }
    };

    return (
      <input
        type={type}
        inputMode={inputMode}
        onFocus={handleFocus}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
