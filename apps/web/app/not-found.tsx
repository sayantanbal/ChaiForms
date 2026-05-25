import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white flex-col gap-4">
      <h2 className="text-3xl font-bold">404 - Not Found</h2>
      <p className="text-gray-400">Could not find requested resource</p>
      <Link href="/" className="px-4 py-2 bg-orange-500 rounded-lg text-white font-semibold">
        Return Home
      </Link>
    </div>
  );
}
