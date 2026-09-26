import { ContactForm } from "@/components/contact-form";

const TITLES: Record<string, string> = { walkthrough: "Book a walkthrough", founders: "Talk to the founders", "data-summary": "Request our data summary" };

export default async function Contact({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const topic = (await searchParams).topic ?? "general";
  return (
    <div className="pt-16">
      <p className="eyebrow">Contact</p>
      <h1 className="mt-2 text-4xl font-semibold text-white">{TITLES[topic] ?? "Get in touch"}</h1>
      <ContactForm topic={topic} />
    </div>
  );
}
