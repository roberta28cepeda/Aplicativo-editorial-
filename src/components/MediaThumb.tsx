"use client";

import { useEffect, useState } from "react";
import { getSignedUrl } from "@/lib/supabase/storage";

export default function MediaThumb({
  path,
  alt,
  className,
}: {
  path: string | null;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (path) {
      getSignedUrl(path)
        .then((signed) => {
          if (active) setUrl(signed);
        })
        .catch(() => {
          if (active) setUrl(null);
        });
    }
    return () => {
      active = false;
    };
  }, [path]);

  if (!path || !url) {
    return (
      <div
        className={`flex items-center justify-center bg-neutral-100 text-neutral-400 ${className ?? ""}`}
      >
        <span className="text-xs">Sem imagem</span>
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}
