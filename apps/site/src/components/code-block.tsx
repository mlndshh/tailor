"use client";
import { Signal } from "@tailor/react";
import { useState } from "react";

export function CodeBlock({ code, signal }: { code: string; signal: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-xl bg-[#09111f] ring-1 ring-white/10">
      <pre className="overflow-x-auto p-5 pr-20 font-mono text-[13px] leading-relaxed text-chalk"><code>{code}</code></pre>
      <Signal label={signal}>
        <button
          className="absolute right-3 top-3 rounded-full border border-dashed border-stitch px-3 py-1 text-xs text-muted transition-colors hover:border-tape hover:text-tape"
          onClick={() => {
            void navigator.clipboard?.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1_200);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </Signal>
    </div>
  );
}
