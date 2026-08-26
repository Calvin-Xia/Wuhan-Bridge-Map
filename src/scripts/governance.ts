import type { GovernanceQuote, GovernanceRecord, GovernanceStatGroup } from "../lib/data-validation";
import { stripTrailingPeriod } from "../lib/final-period";
import { DESKTOP_COLLAPSE_QUERY, resolveCollapseState } from "../lib/responsive-collapse";

const DEFAULT_VISIBLE_STAT_GROUPS = 2;
const DEFAULT_VISIBLE_QUOTES = 2;

void initGovernance();

async function initGovernance() {
  const intro = document.getElementById("governance-intro");
  const statGroups = document.getElementById("governance-stat-groups");
  const quotes = document.getElementById("governance-quotes");
  const disclaimers = document.getElementById("governance-disclaimers");

  if (!intro || !statGroups || !quotes || !disclaimers) return;

  try {
    const governance = await fetchJson<GovernanceRecord>("/data/governance.json");

    intro.textContent = governance.intro;
    renderStatGroups(statGroups, governance.statGroups);
    renderQuotes(quotes, governance.quotes);
    renderDisclaimers(disclaimers, governance.disclaimers);

    // 数据卡与引语各自默认收起一部分,双向切换;口径说明始终可见。
    bindCollapseToggle(statGroups, ".governance-group", DEFAULT_VISIBLE_STAT_GROUPS);
    bindCollapseToggle(quotes, ".governance-quote", DEFAULT_VISIBLE_QUOTES);

    statGroups.setAttribute("aria-busy", "false");
    quotes.setAttribute("aria-busy", "false");
    document.getElementById("section-governance")?.setAttribute("aria-busy", "false");
  } catch (error) {
    console.error("Failed to load governance records", error);
    intro.textContent = "治理数据载入失败，请检查 public/data/governance.json。";
  }
}

function renderStatGroups(container: HTMLElement, groups: GovernanceStatGroup[]) {
  container.innerHTML = groups
    .map(
      (group) => `
        <li class="governance-group">
          <h3>${escapeHtml(group.title)}</h3>
          <ul class="governance-stats">
            ${group.items
              .map(
                (item) => `
                  <li class="governance-stat">
                    <span class="governance-stat-value">${escapeHtml(item.value)}</span>
                    <span class="governance-stat-body">
                      <span class="governance-stat-label">${escapeHtml(item.label)}</span>
                    </span>
                  </li>`,
              )
              .join("")}
          </ul>
        </li>`,
    )
    .join("");
}

function renderQuotes(container: HTMLElement, quotes: GovernanceQuote[]) {
  container.innerHTML = quotes
    .map(
      (quote) => `
        <li class="governance-quote">
          <blockquote class="quote quote--institution">${escapeHtml(stripTrailingPeriod(quote.text))}</blockquote>
          ${quote.note ? `<p class="governance-note">${escapeHtml(stripTrailingPeriod(quote.note))}</p>` : ""}
        </li>`,
    )
    .join("");
}

function renderDisclaimers(container: HTMLElement, disclaimers: string[]) {
  container.innerHTML = disclaimers.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

/**
 * Attach a two-way collapse toggle to a list: the first `visibleCount`
 * items stay visible, the rest are hidden until expanded.
 */
function bindCollapseToggle(list: HTMLElement, itemSelector: string, collapsedCount: number) {
  const items = Array.from(list.children).filter(
    (element): element is HTMLElement => element.matches(itemSelector),
  );
  const desktop = window.matchMedia(DESKTOP_COLLAPSE_QUERY);
  let toggleItem: HTMLLIElement | null = null;
  let button: HTMLButtonElement | null = null;
  let expanded = false;

  const apply = () => {
    const visibleCount = resolveCollapseState(desktop.matches, collapsedCount).visibleCount;
    if (visibleCount === null) {
      // 桌面：恒全展开，折叠按钮不渲染。
      for (const item of items) item.hidden = false;
      toggleItem?.remove();
      toggleItem = null;
      button = null;
      return;
    }
    // 移动端：探头式收起 + 按钮（首次或断点翻转时创建）。
    if (!toggleItem) {
      toggleItem = document.createElement("li");
      toggleItem.className = "voice-expand";
      button = document.createElement("button");
      button.type = "button";
      button.className = "voice-expand-toggle";
      button.addEventListener("click", () => {
        expanded = !expanded;
        apply();
      });
      toggleItem.appendChild(button);
      list.appendChild(toggleItem);
    }
    const rest = items.slice(visibleCount);
    rest.forEach((item) => {
      item.hidden = !expanded;
    });
    if (button) {
      button.textContent = expanded ? "收起" : "展开";
      button.setAttribute("aria-expanded", String(expanded));
    }
  };

  // 断点翻转即重置默认（移动端手动展开不跨断点记忆）。
  desktop.addEventListener("change", () => {
    expanded = false;
    apply();
  });

  apply();
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
