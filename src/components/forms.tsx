'use client';

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { INITIAL_STATE, type FormState } from '@/lib/form-state';

export type ServerAction = (prev: FormState, fd: FormData) => Promise<FormState>;

/** Form gönderiminde alanları sıfırlamadan sunucu işlemini çağırır. */
export function useFormAction(action: ServerAction) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.name) fd.set(submitter.name, submitter.value);
    startTransition(() => formAction(fd));
  };
  return { state, pending, onSubmit };
}

export function FormMessage({ state, testId }: { state: FormState; testId?: string }) {
  if (!state.message) return null;
  return (
    <p className={state.ok ? 'msg msg-ok' : 'msg msg-err'} role={state.ok ? 'status' : 'alert'} data-testid={testId} key={state.at}>
      {state.message}
    </p>
  );
}

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = 'Kaydediliyor…',
  className = 'form',
  resetOnSuccess = false,
  testId,
  buttonClass = 'btn btn-primary',
}: {
  action: ServerAction;
  children: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
  testId?: string;
  buttonClass?: string;
}) {
  const { state, pending, onSubmit } = useFormAction(action);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} onSubmit={onSubmit} className={className} data-testid={testId} noValidate>
      {children}
      <div className="form-foot">
        <button type="submit" className={buttonClass} disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/** Onay gerektiren basit buton formu (server action'ı bağlanmış hâliyle alır). */
export function ConfirmButton({
  action,
  label,
  confirmLabel = 'Eminim, devam et',
  className = 'btn btn-ghost btn-sm',
}: {
  action: () => Promise<void>;
  label: string;
  confirmLabel?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details className="confirm" ref={ref}>
      <summary className={className}>{label}</summary>
      <div className="confirm-pop">
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => {
            startTransition(async () => {
              await action();
              if (ref.current) ref.current.open = false;
            });
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </details>
  );
}
