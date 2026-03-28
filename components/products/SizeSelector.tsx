"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SizeOption {
  name: string;
  measurements?: string;
  inStock: boolean;
}

interface SizeSelectorProps {
  sizes: SizeOption[];
  selectedSize: string | null;
  onChange: (size: string) => void;
}

export default function SizeSelector({ sizes, selectedSize, onChange }: SizeSelectorProps) {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const button = (
            <Button
              key={size.name}
              variant={selectedSize === size.name ? "default" : "outline"}
              size="sm"
              disabled={!size.inStock}
              onClick={() => onChange(size.name)}
              className={!size.inStock ? "line-through text-muted-foreground" : ""}
            >
              {size.name}
            </Button>
          );

          if (size.measurements) {
            return (
              <Tooltip key={size.name}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent>
                  <p>{size.measurements}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return button;
        })}
      </div>
    </TooltipProvider>
  );
}
