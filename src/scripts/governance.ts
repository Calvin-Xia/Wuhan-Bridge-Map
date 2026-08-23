import type { GovernanceQuote, GovernanceRecord, GovernanceStatGroup } from "../lib/data-validation";

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
    bindCollapseToggle(statGroups, ".governance-group", DEFAULT_VISIBLE_STAT_GROUPS, {
      expand: (rest) => `展开其余 ${rest} 组数据`,
      collapse: (rest) => `收起其余 ${rest} 组数据`,
    });
    bindCollapseToggle(quotes, ".governance-quote", DEFAULT_VISIBLE_QUOTES, {
      expand: (rest) => `展开其余 ${rest} 条引语`,
      collapse: (rest) => `收起其余 ${rest} 条引语`,
    });

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
                      <span class="governance-stat-source">${escapeHtml(item.source)}</span>
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
          <blockquote class="quote quote--institution">${escapeHtml(quote.text)}<cite>${escapeHtml(quote.cite)}</cite></blockquote>
          ${quote.note ? `<p class="governance-note">${escapeHtml(quote.note)}</p>` : ""}
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
function bindCollapseToggle(
  list: HTMLElement,
  itemSelector: string,
  visibleCount: number,
  labels: { expand: (rest: number) => string; collapse: (rest: number) => string },
) {
  const items = Array.from(list.children).filter(
    (element): element is HTMLElement => element.matches(itemSelector),
  );
  const rest = items.slice(visibleCount);
  if (rest.length === 0) return;

  const toggleItem = document.createElement("li");
  toggleItem.className = "voice-expand";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "voice-expand-toggle";
  button.setAttribute("aria-expanded", "false");

  let expanded = false;
  const update = () => {
    rest.forEach((item) => {
      item.hidden = !expanded;
    });
    button.textContent = expanded ? labels.collapse(rest.length) : labels.expand(rest.length);
    button.setAttribute("aria-expanded", String(expanded));
  };

  button.addEventListener("click", () => {
    expanded = !expanded;
    update();
  });

  toggleItem.appendChild(button);
  list.appendChild(toggleItem);
  update();
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
