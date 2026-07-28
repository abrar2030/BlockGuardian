import { useState } from "react";
import PublicLayout from "../components/layout/PublicLayout";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { validateEmail, validateRequired } from "../lib/validators";

const SUPPORT_EMAIL = "support@blockguardian.app";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState({});

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {
      name: validateRequired(form.name, "Name"),
      email: validateEmail(form.email),
      message: validateRequired(form.message, "Message"),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const subject = encodeURIComponent(`Message from ${form.name}`);
    const body = encodeURIComponent(
      `${form.message}\n\n— ${form.name} (${form.email})`,
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <PublicLayout title="Contact · BlockGuardian">
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">
            Get in touch
          </h1>
          <p className="mt-4 text-gray-500 dark:text-gray-400">
            Questions about your account or the platform? Send us a message and
            we&apos;ll open it in your email client, ready to send.
          </p>
        </div>

        <Card className="p-7 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                id="contactName"
                label="Your name"
                value={form.name}
                onChange={update("name")}
                error={errors.name}
                required
              />
              <Input
                id="contactEmail"
                label="Email address"
                type="email"
                value={form.email}
                onChange={update("email")}
                error={errors.email}
                required
              />
            </div>
            <div>
              <label
                htmlFor="contactMessage"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Message<span className="text-red-500 ml-0.5">*</span>
              </label>
              <textarea
                id="contactMessage"
                rows={5}
                className="input resize-none"
                value={form.message}
                onChange={update("message")}
              />
              {errors.message && (
                <p className="mt-1.5 text-sm text-red-500">{errors.message}</p>
              )}
            </div>
            <Button type="submit" fullWidth size="lg">
              Send message
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-8">
          Or email us directly at{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </section>
    </PublicLayout>
  );
}
