"use client";

import { useState } from "react";
import Image from "next/image";

interface MediaItem {
  storageId: string;
  type: "image" | "video";
  sortOrder: number;
  url: string | null;
}

interface MediaGalleryProps {
  media: MediaItem[];
}

export default function MediaGallery({ media }: MediaGalleryProps) {
  const sorted = [...media].sort((a, b) => a.sortOrder - b.sortOrder);
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (sorted.length === 0) {
    return (
      <div className="aspect-square relative overflow-hidden rounded border bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-sm">No image</span>
      </div>
    );
  }

  const selected = sorted[selectedIndex];

  return (
    <div className="space-y-3">
      <div className="aspect-square relative overflow-hidden rounded border bg-muted">
        {selected.url ? (
          selected.type === "video" ? (
            <video
              src={selected.url}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <Image
              src={selected.url}
              alt="Product media"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground text-sm">No image</span>
          </div>
        )}
      </div>

      {sorted.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {sorted.map((item, index) => (
            <button
              key={item.storageId}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`w-16 h-16 rounded border-2 overflow-hidden relative bg-muted flex-shrink-0 ${
                index === selectedIndex ? "border-primary" : "border-muted"
              }`}
            >
              {item.url ? (
                item.type === "video" ? (
                  <video src={item.url} className="w-full h-full object-cover" />
                ) : (
                  <Image
                    src={item.url}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                )
              ) : (
                <div className="w-full h-full" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
