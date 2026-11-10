/**
 * Host half of dsh-codex-usage-panel.
 *
 * The panel has no host-side work of its own: quota is read from the Codex
 * plugin over that plugin's authenticated browser bridge
 * (`POST /api/codex-subscription/{status,usage}`), which the Codex host half
 * registers. This half exists only so the bundle resolves a Loader entry, which
 * is the condition the client-module system uses to publish `./client`.
 *
 * That is also why nothing here duplicates the Codex quota reader: a second
 * reader would need the same OAuth credential and could disagree with the Codex
 * panel beside it. The browser half treats a missing Codex plugin as "do not
 * render", so an uninstalled dependency degrades to no surface instead of an
 * error card.
 *
 * @module dsh-codex-usage-panel
 */

/** No services are required: this half registers nothing. */
export const inject = []

/**
 * Bundle row entry point. Intentionally empty — see the module doc.
 */
export function apply() {}
