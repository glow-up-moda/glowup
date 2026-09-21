"use client";

import {
  type FormEvent,
  startTransition,
  useActionState,
  useEffect,
  useRef,
} from "react";

/** Lo que devuelve una acción de formulario, en el panel y en la tienda. */
export type FormState = {
  message?: string;
  error?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

export const emptyForm: FormState = {};

/**
 * Envía el formulario sin el reset automático de React 19. Con
 * <form action={...}> React vuelve cada campo a su valor inicial al terminar,
 * y en un <select> eso cambia lo elegido aunque la acción haya fallado: un
 * error en una venta dejaba el formulario en "Entró mercadería". Así, si hay
 * error queda todo como estaba; si sale bien, onSuccess decide qué limpiar.
 */
export function useFormAction(
  action: (prev: FormState, formData: FormData) => Promise<FormState>,
  { onSuccess }: { onSuccess?: (form: HTMLFormElement) => void } = {},
) {
  const [state, dispatch, pending] = useActionState(action, emptyForm);
  const formRef = useRef<HTMLFormElement>(null);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    if (state.message && !state.error && !state.errors && formRef.current) {
      onSuccessRef.current?.(formRef.current);
    }
  }, [state]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return { state, pending, formRef, onSubmit };
}

/** Vacía los campos indicados de un formulario. */
export function clearFields(form: HTMLFormElement, names: string[]) {
  for (const name of names) {
    const field = form.elements.namedItem(name);
    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement
    )
      field.value = "";
  }
}
