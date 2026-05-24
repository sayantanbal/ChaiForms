import React from "react";
import Link from "next/link";

export function FormNotFound() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 sm:p-12 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="text-6xl mb-6">🏜️</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Form Not Found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg mb-8">
          The form you are looking for does not exist or has been deleted. Please check the URL and try again.
        </p>
        <Link
          href="/explore"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity"
        >
          Explore Public Forms
        </Link>
      </div>
    </div>
  );
}
