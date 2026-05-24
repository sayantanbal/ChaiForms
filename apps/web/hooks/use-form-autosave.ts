import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { trpc } from "~/trpc/client";
import { FieldSchemaUnion } from "@repo/schemas";
import { toast } from "sonner";

export type SaveState = "idle" | "saving" | "saved" | "error";

export function useFormAutosave(formId: string) {
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const updateFieldsMutation = trpc.forms.fieldsUpsert.useMutation({
    onMutate: () => {
      setSaveState("saving");
    },
    onSuccess: () => {
      setSaveState("saved");
      // Reset to idle after 2 seconds
      setTimeout(() => setSaveState("idle"), 2000);
    },
    onError: (error) => {
      setSaveState("error");
      toast.error(error.message || "Failed to save form");
    },
  });

  const debouncedSave = useDebouncedCallback(
    (fields: FieldSchemaUnion[], pages?: any[]) => {
      updateFieldsMutation.mutate({
        formId,
        fields,
        pages,
      });
    },
    1000
  );

  return {
    debouncedSave,
    saveState,
  };
}
