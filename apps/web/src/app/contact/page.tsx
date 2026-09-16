"use client";

import { useState } from "react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    // In a real implementation, this would call an API endpoint
    setSubmitted(true);
    setFormData({ name: "", email: "", subject: "", message: "" });
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Contact Us</h1>
        <p className="text-neutral-500">Have questions or feedback? We'd love to hear from you.</p>
      </div>

      {submitted ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="mb-4 text-4xl">✓</div>
          <h2 className="text-xl font-semibold text-green-800">Message sent!</h2>
          <p className="mt-2 text-green-700">
            Thank you for reaching out. We'll get back to you as soon as possible.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-4 rounded-md border border-green-300 px-4 py-2 text-green-700 hover:bg-green-100"
          >
            Send another message
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-neutral-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2"
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-neutral-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2"
                  placeholder="your.email@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="subject" className="mb-2 block text-sm font-medium text-neutral-700">
                Subject
              </label>
              <input
                id="subject"
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                placeholder="What's this about?"
              />
            </div>

            <div>
              <label htmlFor="message" className="mb-2 block text-sm font-medium text-neutral-700">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                rows={6}
                placeholder="How can we help you?"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-brand-600 py-3 text-white font-medium hover:bg-brand-700"
            >
              Send Message
            </button>
          </form>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Other ways to reach us</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">📧</span>
            <div>
              <p className="font-medium">Email</p>
              <p className="text-sm text-neutral-600">support@scholartrack.example</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl">📍</span>
            <div>
              <p className="font-medium">Location</p>
              <p className="text-sm text-neutral-600">Douala, Cameroon</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl">⏰</span>
            <div>
              <p className="font-medium">Response time</p>
              <p className="text-sm text-neutral-600">Usually within 24-48 hours</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-sm text-neutral-500">
        <p>For technical issues or bug reports, please include details about your browser and device.</p>
      </div>
    </div>
  );
}