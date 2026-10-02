export type FormState = {
  ok: boolean;
  message: string;
  at?: number;
  fields?: Record<string, string>;
};

export const INITIAL_STATE: FormState = { ok: false, message: '' };
