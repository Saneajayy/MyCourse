/**
 * Formats a raw database UUID or internal order ID into a clean customer-facing order reference.
 * Example:
 *   "0192df4b-e854-7f12-a1b2-c3d4e5f67890" -> "ORD-#0192DF4B"
 *   "183bheb3-xxxx-xxxx"                   -> "ORD-#183BHEB3"
 */
export function formatDisplayOrderId(id: string | null | undefined): string {
  if (!id) return '';
  if (/^ORD-#[A-Z0-9]+$/i.test(id)) {
    return id.toUpperCase();
  }
  const clean = id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
  return `ORD-#${clean}`;
}
