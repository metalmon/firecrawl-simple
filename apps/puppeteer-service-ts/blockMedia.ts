import type { IBlockedResourceType } from "@ulixee/hero-interfaces/ITabOptions";

/**
 * Subresource types to skip at the network layer (Hero mitm).
 * Keep document / XHR / fetch / JS / CSS so SPAs and anti-bot scripts still run.
 */
export function heroBlockedResourceTypes(
  enabled: boolean,
): IBlockedResourceType[] | undefined {
  if (!enabled) {
    return undefined;
  }
  return ["BlockImages", "BlockMedia", "BlockFonts"];
}
