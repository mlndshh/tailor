"use client";
import { Signal } from "@tailor/react";
import { useState } from "react";

export function CodeBlock({ code, signal }: { code: string; signal: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-lg border border-slate-800 bg-black/60">
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-slate-200"><code>{code}</code></pre>
      <Signal label={signal}>
        <button
          className="absolute right-2 top-2 rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-300 hover:border-slate-500"
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
