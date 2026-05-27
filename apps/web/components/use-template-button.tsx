"use client";

import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";
import { redirectToLoginIfNeeded, redirectToLoginOnTrpcError } from "~/lib/auth/require-session";

interface UseTemplateButtonProps {
  templateId: string;
  gradient: string;
  /** When false, click goes straight to login without calling the API. */
  isAuthenticated?: boolean;
}

export function UseTemplateButton({
  templateId,
  gradient,
  isAuthenticated,
}: UseTemplateButtonProps) {
  const router = useRouter();

  const mutation = trpc.forms.createFromTemplate.useMutation({
    onSuccess: (form) => {
      toast.success("Form created from template!");
      router.push(`/dashboard/forms/${form.id}/edit`);
    },
    onError: (e) => {
      if (redirectToLoginOnTrpcError(e, router)) return;
      toast.error(e.message);
    },
  });

  const handleClick = async () => {
    if (isAuthenticated === false) {
      router.push("/login");
      return;
    }
    if (!(await redirectToLoginIfNeeded(router))) return;
    mutation.mutate({ templateId });
  };

  return (
    <button
      id={`use-template-${templateId}`}
      onClick={() => void handleClick()}
      disabled={mutation.isPending}
      className={`text-xs px-4 py-2 bg-gradient-to-r ${gradient} text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5`}
    >
      {mutation.isPending ? (
        <>
          <svg
            className="w-3 h-3 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Creating...
        </>
      ) : (
        "Use Template →"
      )}
    </button>
  );
}
