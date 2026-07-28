"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset(): void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section
        role="alert"
        className="max-w-lg rounded-lg border p-6 shadow-sm"
      >
        <h1 className="text-lg font-semibold">
          Unable to load this conversation
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Check that the local LangGraph service is running, then try again.
        </p>
        <Button
          className="mt-4"
          onClick={reset}
        >
          Try again
        </Button>
      </section>
    </main>
  );
}
