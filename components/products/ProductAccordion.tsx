"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ProductAccordionProps {
  description: string;
}

export default function ProductAccordion({ description }: ProductAccordionProps) {
  return (
    <Accordion type="single" collapsible defaultValue="description">
      <AccordionItem value="description">
        <AccordionTrigger>Description</AccordionTrigger>
        <AccordionContent>
          <p className="whitespace-pre-wrap text-sm">{description}</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
