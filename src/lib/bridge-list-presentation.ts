import type { BridgeFeature } from "./data-validation";

export function createBridgeListMarkup(bridges: BridgeFeature[], activeBridgeId: string): string {
  return bridges
    .map((bridge) => {
      const { properties } = bridge;
      const selection = getBridgeSelectionAttributes(properties.id === activeBridgeId);
      const activeClass = selection.isActive ? " is-active" : "";
      const ariaCurrent = selection.ariaCurrent ? ` aria-current="${selection.ariaCurrent}"` : "";

      return `<li><button class="bridge-item${activeClass}" type="button" data-bridge-id="${escapeHtml(properties.id)}"${ariaCurrent}>
        <strong>${escapeHtml(properties.name)}</strong>
        <span class="bridge-meta"><span>${properties.openedYear}</span><span>${escapeHtml(properties.bridgeType)}</span><b>${escapeHtml(properties.researchStatus)}</b></span>
        <span>${escapeHtml(properties.question)}</span>
      </button></li>`;
    })
    .join("");
}

export function getBridgeSelectionAttributes(isActive: boolean): {
  ariaCurrent: "true" | undefined;
  isActive: boolean;
} {
  return {
    ariaCurrent: isActive ? "true" : undefined,
    isActive,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
