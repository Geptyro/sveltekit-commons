/**
 * Validation and field-reading for the shared feedback form.
 *
 * Pure and dependency-free, so a site's form action, its tests and plain
 * `node --test` all load the same rules. The storage half is NOT here — see
 * "Server code" in the README: each site writes the accepted fields into its
 * own database, because putting `mongodb` in this package to save twenty lines
 * would force the driver onto every consumer.
 */
export const DEFAULT_FEEDBACK_LIMITS = {
    messageMin: 10,
    messageMax: 4000,
    nameMax: 80,
    contactMax: 120
};
function trimmed(v) {
    return typeof v === 'string' ? v.trim() : '';
}
/**
 * Pull the form's fields out of a POSTed `FormData`.
 *
 * The field names live here rather than in each site's action for one reason:
 * `FeedbackForm.svelte` in this same package is what renders the `name=`
 * attributes. Split across packages, renaming an input would leave every
 * consumer's action silently reading `undefined` — a form that accepts
 * everything and stores nothing, with no error anywhere to notice.
 */
export function readFeedbackForm(form) {
    const get = (field) => form.get(field);
    return {
        input: {
            message: get('message'),
            name: get('name'),
            contact: get('contact'),
            website: get('website')
        },
        values: {
            message: String(get('message') ?? ''),
            name: String(get('name') ?? ''),
            contact: String(get('contact') ?? '')
        }
    };
}
/**
 * Check a submission against the limits.
 *
 * A rejected honeypot returns the same shape as any other failure, and the
 * message says nothing about why — a bot that learns which field gave it away
 * just stops filling that field in.
 */
export function validateFeedback(input, limits = DEFAULT_FEEDBACK_LIMITS) {
    if (trimmed(input.website))
        return { ok: false, error: 'Submission rejected.' };
    const message = trimmed(input.message);
    if (message.length < limits.messageMin) {
        return { ok: false, error: `Please write at least ${limits.messageMin} characters.` };
    }
    if (message.length > limits.messageMax) {
        return { ok: false, error: `Message too long (max ${limits.messageMax} characters).` };
    }
    const name = trimmed(input.name);
    if (name.length > limits.nameMax) {
        return { ok: false, error: `Name too long (max ${limits.nameMax} characters).` };
    }
    const contact = trimmed(input.contact);
    if (contact.length > limits.contactMax) {
        return { ok: false, error: `Contact too long (max ${limits.contactMax} characters).` };
    }
    const fields = { message };
    if (name)
        fields.name = name;
    if (contact)
        fields.contact = contact;
    return { ok: true, fields };
}
