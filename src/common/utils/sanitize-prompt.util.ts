/** Reduces prompt-injection surface for user-provided text sent to the model. */
export function sanitizeForAiPrompt(input: string, maxLength: number): string {
  const trimmed = input.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').trim();
  return trimmed.slice(0, maxLength);
}
