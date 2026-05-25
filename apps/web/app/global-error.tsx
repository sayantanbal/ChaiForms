"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <p className="text-gray-400 mb-6">{error.message || "A critical error occurred."}</p>
            <button
              type="button"
              onClick={() => reset()}
              className="px-4 py-2 bg-orange-500 rounded-lg text-white font-semibold"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
