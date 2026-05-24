import React from "react";

interface FormClosedProps {
  status: "draft" | "archived" | "expired" | "limit_reached";
}

export function FormClosed({ status }: FormClosedProps) {
  let emoji = "🔒";
  let title = "Form Closed";
  let message = "This form is not currently accepting responses.";

  switch (status) {
    case "draft":
      emoji = "🚧";
      title = "Under Construction";
      message = "This form is still a draft and has not been published yet.";
      break;
    case "archived":
      emoji = "📦";
      title = "Form Archived";
      message = "This form has been archived by its creator and is no longer accepting responses.";
      break;
    case "expired":
      emoji = "⏳";
      title = "Form Expired";
      message = "The deadline to submit responses for this form has passed.";
      break;
    case "limit_reached":
      emoji = "🛑";
      title = "Response Limit Reached";
      message = "This form has reached its maximum number of allowed responses.";
      break;
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 sm:p-12 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="text-6xl mb-6">{emoji}</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {title}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          {message}
        </p>
      </div>
    </div>
  );
}
