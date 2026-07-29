/**
 * Validation and field-reading for the shared feedback form.
 *
 * Pure and dependency-free, so a site's form action, its tests and plain
 * `node --test` all load the same rules. The storage half is NOT here — see
 * "Server code" in the README: each site writes the accepted fields into its
 * own database, because putting `mongodb` in this package to save twenty lines
 * would force the driver onto every consumer.
 */
export interface FeedbackLimits {
    /** Below this a message is not worth the round trip; also stops "ok". */
    messageMin: number;
    messageMax: number;
    nameMax: number;
    contactMax: number;
}
export declare const DEFAULT_FEEDBACK_LIMITS: FeedbackLimits;
export interface FeedbackInput {
    message: unknown;
    name: unknown;
    contact: unknown;
    /** Honeypot — hidden in the UI, so anything non-empty is a bot. */
    website: unknown;
}
export interface FeedbackFields {
    message: string;
    name?: string;
    contact?: string;
}
/** The raw strings, echoed back so a failed no-JS submit keeps the text. */
export interface FeedbackValues {
    message: string;
    name: string;
    contact: string;
}
export interface FeedbackSubmission {
    input: FeedbackInput;
    values: FeedbackValues;
}
export type FeedbackValidation = {
    ok: true;
    fields: FeedbackFields;
} | {
    ok: false;
    error: string;
};
/**
 * Pull the form's fields out of a POSTed `FormData`.
 *
 * The field names live here rather than in each site's action for one reason:
 * `FeedbackForm.svelte` in this same package is what renders the `name=`
 * attributes. Split across packages, renaming an input would leave every
 * consumer's action silently reading `undefined` — a form that accepts
 * everything and stores nothing, with no error anywhere to notice.
 */
export declare function readFeedbackForm(form: FormData): FeedbackSubmission;
/**
 * Check a submission against the limits.
 *
 * A rejected honeypot returns the same shape as any other failure, and the
 * message says nothing about why — a bot that learns which field gave it away
 * just stops filling that field in.
 */
export declare function validateFeedback(input: FeedbackInput, limits?: FeedbackLimits): FeedbackValidation;
