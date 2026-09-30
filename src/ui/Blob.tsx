import { useEffect, useState } from 'react';

/* A stored photo or recording, shown through a short-lived object URL that is released when it leaves the screen. */
function useBlobUrl(blob?: Blob) {
  const [url, setUrl] = useState<string>();
  useEffect(() => { if (!blob) return; const u = URL.createObjectURL(blob); setUrl(u); return () => { URL.revokeObjectURL(u); setUrl(undefined); }; }, [blob]);
  return url;
}
export function BlobImg({ blob, alt, className }: { blob?: Blob; alt: string; className?: string }) {
  const url = useBlobUrl(blob);
  return url ? <img src={url} alt={alt} className={className} /> : <span className={className} role={alt ? 'img' : undefined} aria-label={alt || undefined} />;
}
export function BlobAudio({ blob, label }: { blob: Blob; label: string }) {
  const url = useBlobUrl(blob);
  return <audio controls preload="none" src={url} aria-label={label} />;
}
