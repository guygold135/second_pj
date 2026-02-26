import React, { forwardRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";

export interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
  ({ label = "Generate", onClick, className, children, ...props }, ref) => {
    const [isClicked, setIsClicked] = useState(false);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsClicked(true);
      setTimeout(() => setIsClicked(false), 200);
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={cn("glow-btn", className)}
        onClick={handleClick}
        data-state={isClicked ? "clicked" : undefined}
        {...props}
      >
        <span className="flex items-center justify-center gap-1.5">
          {children ?? label}
          <Sparkles size={16} className="ml-0.5 shrink-0" aria-hidden />
        </span>
      </button>
    );
  }
);

GlowButton.displayName = "GlowButton";
