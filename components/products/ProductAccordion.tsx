"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ProductAccordionProps {
  description: string;
  fabricAndCare?: string;
  shippingInfo?: string;
}

export default function ProductAccordion({ description, fabricAndCare, shippingInfo }: ProductAccordionProps) {
  return (
    <Accordion type="single" collapsible defaultValue="description">
      <AccordionItem value="description">
        <AccordionTrigger>Description</AccordionTrigger>
        <AccordionContent>
          <p className="whitespace-pre-wrap text-sm">{description}</p>
        </AccordionContent>
      </AccordionItem>

      {fabricAndCare && (
        <AccordionItem value="fabric-care">
          <AccordionTrigger>Fabric &amp; Care</AccordionTrigger>
          <AccordionContent>
            <p className="whitespace-pre-wrap text-sm">{fabricAndCare}</p>
          </AccordionContent>
        </AccordionItem>
      )}

      {shippingInfo && (
        <AccordionItem value="shipping">
          <AccordionTrigger>Shipping Info</AccordionTrigger>
          <AccordionContent>
            <p className="whitespace-pre-wrap text-sm">{shippingInfo}</p>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}
