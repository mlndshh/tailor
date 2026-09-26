"use client";
import { useTailor } from "@tailor/react";
import { useState } from "react";

export function ContactForm({ topic }: { topic: string }) {
  const { track, decision } = useTailor();
  const [sent, setSent] = useState(false);
  if (sent) return <p className="card text-white">Thanks. We'll be in touch shortly.</p>;
  return (
    <form
      className="card mt-6 grid max-w-lg gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        track(`submitted the contact form about ${topic}`);
        await fetch("/api/contact", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ topic, name: form.get("name"), email: form.get("email"), message: form.get("message"), audiences: decision?.active ?? [] }),
        });
        setSent(true);
      }}
    >
      <input required name="name" placeholder="Name" className="rounded border border-slate-700 bg-transparent px-3 py-2" />
      <input required type="email" name="email" placeholder="Work email" className="rounded border border-slate-700 bg-transparent px-3 py-2" />
      <textarea name="message" placeholder="What would you like to talk about?" className="rounded border border-slate-700 bg-transparent px-3 py-2" />
      <button className="btn-primary justify-center">Send</button>
    </form>
  );
}
