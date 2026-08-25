/**
 * URL hash helpers for deep-linking.
 *
 * - Bridge deep link: `#bridge-<id>` is a **one-shot** entry point — it selects
 *   the bridge on load (and opens the story modal on mobile), then the hash is
 *   cleared from the URL by the client. Selection never writes the hash back,
 *   so refreshing or switching bridges never re-triggers the modal.
 * - Section anchors (`#section-map` etc.) use native anchor scrolling.
 */

const BRIDGE_HASH_PREFIX = "bridge-";

/** Extract a bridge id from a location hash, or `null` when it is not a bridge hash. */
export function parseBridgeHash(hash: string): string | null {
  const prefix = `#${BRIDGE_HASH_PREFIX}`;
  if (!hash.startsWith(prefix)) return null;

  const encoded = hash.slice(prefix.length);
  if (!encoded) return null;

  try {
    const id = decodeURIComponent(encoded);
    return id || null;
  } catch {
    return null;
  }
}

/** Build a bridge deep link hash from a bridge id. */
export function buildBridgeHash(bridgeId: string): string {
  return `#${BRIDGE_HASH_PREFIX}${encodeURIComponent(bridgeId)}`;
}
