import React from 'react';
import { Loader2 } from 'lucide-react';

export const PageLoader = () => (
  <div role="status" aria-live="polite" className="flex-1 min-h-[50vh] flex flex-col items-center justify-center gap-3 text-secondary">
    <Loader2 size={28} strokeWidth={1.75} className="animate-spin" aria-hidden="true" />
    <span className="text-footnote">Loading</span>
  </div>
);
