import axios from 'axios';

// Extracts a human-readable error message from an Axios error, never surfacing
// the raw "Request failed with status code 400" string to the user.
//
// The backend returns errors in two shapes:
//   1. Zod validation:  { error: 'Invalid request body', details: { field: [msg, ...] } }
//   2. Business error:  { error: 'Some message' }
//
// Priority: details (Zod field errors) -> errors (array) -> error -> message -> fallback.
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          details?: Record<string, string[] | undefined>;
          errors?: string[] | unknown;
          error?: string;
          message?: string;
        }
      | undefined;

    // 1. Zod field errors (flatten().fieldErrors) — join all messages.
    if (data?.details && typeof data.details === 'object') {
      const messages = Object.values(data.details)
        .flat()
        .filter((m): m is string => typeof m === 'string' && m.length > 0);
      if (messages.length > 0) {
        return messages.join(' · ');
      }
    }

    // 2. Array of error strings (defensive).
    if (Array.isArray(data?.errors)) {
      const messages = data.errors.filter((m): m is string => typeof m === 'string' && m.length > 0);
      if (messages.length > 0) {
        return messages.join(' · ');
      }
    }

    // 3. Single error string (business errors / "Invalid request body").
    if (typeof data?.error === 'string' && data.error.length > 0) {
      return data.error;
    }

    // 4. Generic message field (defensive).
    if (typeof data?.message === 'string' && data.message.length > 0) {
      return data.message;
    }
  }

  // 5. Non-Axios Error instances (e.g. thrown in queryFn).
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return fallback;
};
