"use client";

import { useParams } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const FormBuilderClient = dynamic(
  () => import("./form-builder-client").then((mod) => mod.FormBuilderClient),
  {
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false,
  },
);

export default function FormBuilderPage() {
  const { formId } = useParams<{ formId: string }>();
  const { data: form, isLoading } = trpc.forms.getById.useQuery({ formId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <div className="text-muted-foreground">Form not found</div>
        <Link href="/dashboard/forms" className="text-primary hover:underline">
          ← Back to forms
        </Link>
      </div>
    );
  }

  return <FormBuilderClient initialForm={form} />;
}
