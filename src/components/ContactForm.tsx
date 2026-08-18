"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import offers from "@/content/offers.json";
import kontakt from "@/content/kontakt.json";

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const { fields } = kontakt.form;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      company: String(formData.get("company") ?? ""),
      offerInterest: String(formData.get("offerInterest") ?? ""),
      preferredTime: String(formData.get("preferredTime") ?? ""),
      message: String(formData.get("message") ?? ""),
      consent: formData.get("consent") === "on",
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("request-failed");
      }

      setStatus("success");
      event.currentTarget.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="rounded-sm border-l-4 border-accent-500 bg-ink-100 p-6 text-sm text-ink-900"
      >
        {kontakt.form.successMessage}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-medium text-ink-900">
            {fields.name} *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className="mt-1.5 w-full rounded-sm border border-ink-300 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-ink-900 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-ink-900">
            {fields.email} *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1.5 w-full rounded-sm border border-ink-300 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-ink-900 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="company" className="text-sm font-medium text-ink-900">
          {fields.company}
        </label>
        <input
          id="company"
          name="company"
          type="text"
          autoComplete="organization"
          className="mt-1.5 w-full rounded-sm border border-ink-300 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-ink-900 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="offerInterest" className="text-sm font-medium text-ink-900">
          {fields.offerInterest}
        </label>
        <select
          id="offerInterest"
          name="offerInterest"
          defaultValue=""
          className="mt-1.5 w-full rounded-sm border border-ink-300 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-ink-900 focus:outline-none"
        >
          <option value="">{fields.offerInterestPlaceholder}</option>
          {offers.items.map((offer) => (
            <option key={offer.slug} value={offer.name}>
              {offer.name}
            </option>
          ))}
          <option value="other">{fields.offerInterestOther}</option>
        </select>
      </div>

      <div>
        <label htmlFor="preferredTime" className="text-sm font-medium text-ink-900">
          {fields.preferredTime}
        </label>
        <input
          id="preferredTime"
          name="preferredTime"
          type="text"
          placeholder={fields.preferredTimePlaceholder}
          className="mt-1.5 w-full rounded-sm border border-ink-300 bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-foreground-muted focus:border-ink-900 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="message" className="text-sm font-medium text-ink-900">
          {fields.message} *
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="mt-1.5 w-full rounded-sm border border-ink-300 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-ink-900 focus:outline-none"
        />
      </div>

      <div className="flex items-start gap-3">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          required
          className="mt-1 h-4 w-4 shrink-0 rounded-sm border-ink-300"
        />
        <label htmlFor="consent" className="text-sm text-foreground-muted">
          {fields.consent}{" "}
          <Link href="/datenschutz" className="underline underline-offset-2 hover:text-ink-900">
            {fields.consentLinkLabel}
          </Link>{" "}
          {fields.consentSuffix}
        </label>
      </div>

      <p className="text-xs text-foreground-muted">{kontakt.form.responseTimeText}</p>

      {status === "error" && (
        <p role="alert" className="text-sm text-red-700">
          {kontakt.form.errorMessage}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={status === "submitting"}>
        {status === "submitting" ? "Wird gesendet …" : fields.submit}
      </Button>
    </form>
  );
}
