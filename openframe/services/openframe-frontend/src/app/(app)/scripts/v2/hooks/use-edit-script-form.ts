'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-relay';
import { z } from 'zod';
import type { createScriptMutation as CreateScriptMutationType } from '@/__generated__/createScriptMutation.graphql';
import type { updateScriptMutation as UpdateScriptMutationType } from '@/__generated__/updateScriptMutation.graphql';
import { safeBackOrReplace } from '@/app/hooks/use-safe-back';
import { createScriptMutation } from '@/graphql/scripts/create-script-mutation';
import { updateScriptMutation } from '@/graphql/scripts/update-script-mutation';
import { getRelayErrorMessage } from '@/lib/handle-api-error';
import { routes } from '@/lib/routes';
import { EDIT_SCRIPT_DEFAULT_VALUES, type EditScriptFormData, editScriptSchema } from '../../types/edit-script.types';
import { formToWriteInput } from '../utils/script-mappers';

// v2 tweaks to the shared schema:
// - script_body is required (drives the Syntax error state).
// - category is dropped — the native API has no such concept, so the field is
//   hidden and must not be a required validation gate.
const editScriptFormSchema = editScriptSchema.extend({
  script_body: z.string().min(1, 'Please add script content'),
  category: z.string(),
});

interface UseEditScriptFormOptions {
  scriptId: string | null;
  initialValues: EditScriptFormData | null;
  isEditMode: boolean;
}

// On the create page, start with one empty argument and one empty env-var row so
// the inputs are visible up front. Empty rows are filtered out on submit.
const CREATE_SCRIPT_DEFAULT_VALUES: EditScriptFormData = {
  ...EDIT_SCRIPT_DEFAULT_VALUES,
  args: [{ id: 'arg-0', key: '', value: '' }],
  env_vars: [{ id: 'env-0', key: '', value: '' }],
};

export function useEditScriptForm({ scriptId, initialValues, isEditMode }: UseEditScriptFormOptions) {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<EditScriptFormData>({
    resolver: zodResolver(editScriptFormSchema),
    defaultValues: isEditMode ? EDIT_SCRIPT_DEFAULT_VALUES : CREATE_SCRIPT_DEFAULT_VALUES,
    // `onChange` lets RHF own the validation lifecycle: errors set via `trigger`
    // (e.g. the Test pre-check) clear themselves as soon as the field becomes
    // valid, instead of needing a manual `clearErrors`.
    mode: 'onChange',
  });

  const { reset, handleSubmit } = form;
  const { isDirty } = form.formState;

  useEffect(() => {
    // Seed the form from the query. The detail query runs `store-and-network`, so a
    // background refresh can deliver a new `initialValues` reference after the user
    // has started editing — re-seeding then would wipe their in-progress changes.
    // Guard on `!isDirty`: apply fresh data only while the form is still pristine.
    if (initialValues && isEditMode && !isDirty) {
      reset(initialValues);
    }
  }, [initialValues, isEditMode, isDirty, reset]);

  const [commitCreate, isCreating] = useMutation<CreateScriptMutationType>(createScriptMutation);
  const [commitUpdate, isUpdating] = useMutation<UpdateScriptMutationType>(updateScriptMutation);

  const onSubmit = useCallback(
    (data: EditScriptFormData) => {
      const input = formToWriteInput(data);

      if (isEditMode && scriptId) {
        commitUpdate({
          variables: { input: { id: scriptId, ...input } },
          onCompleted: () => {
            toast({ title: 'Success', description: 'Script updated successfully', variant: 'success' });
            safeBackOrReplace(router, routes.scriptsV2.details(scriptId));
          },
          onError: err => {
            toast({
              title: 'Error',
              description: getRelayErrorMessage(err, 'Failed to update script'),
              variant: 'destructive',
            });
          },
        });
        return;
      }

      commitCreate({
        variables: { input },
        onCompleted: response => {
          toast({ title: 'Success', description: 'Script created successfully', variant: 'success' });
          const newId = response.createScript?.id;
          router.replace(newId ? routes.scriptsV2.details(newId) : routes.scriptsV2.list);
        },
        onError: err => {
          toast({
            title: 'Error',
            description: getRelayErrorMessage(err, 'Failed to create script'),
            variant: 'destructive',
          });
        },
      });
    },
    [isEditMode, scriptId, commitCreate, commitUpdate, router, toast],
  );

  const handleSave = useCallback(() => {
    handleSubmit(onSubmit, errors => {
      const messages = Object.values(errors)
        .map(error => (error as { message?: string } | undefined)?.message)
        .filter((message): message is string => Boolean(message));
      toast({
        title: 'Cannot save yet',
        description: messages.length > 0 ? messages.join(', ') : 'Please fill in all required fields.',
        variant: 'destructive',
      });
    })();
  }, [handleSubmit, onSubmit, toast]);

  return { form, isSubmitting: isCreating || isUpdating, handleSave };
}
