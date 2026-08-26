import type { VoiceRecord } from "../lib/data-validation";
import { stripTrailingPeriod } from "../lib/final-period";
import { DESKTOP_COLLAPSE_QUERY, resolveCollapseState } from "../lib/responsive-collapse";

const COLLAPSED_COUNT = 3;

void initVoices();

async function initVoices() {
  const onlineList = document.getElementById("voice-list-online");
  const fieldList = document.getElementById("voice-list-field");
  if (!onlineList || !fieldList) return;

  try {
    const voices = await fetchJson<VoiceRecord[]>("/data/voices.json");
    renderVoiceGroup(onlineList, voices.filter((voice) => voice.survey === "online"));
    renderVoiceGroup(fieldList, voices.filter((voice) => voice.survey === "field"));
  } catch (error) {
    console.error("Failed to load voice records", error);
    onlineList.textContent = "开放回答引语载入失败，请检查 public/data/voices.json。";
  }
}

function renderVoiceGroup(container: HTMLElement, voices: VoiceRecord[]) {
  container.setAttribute("aria-busy", "false");
  // 主题分组（2026-08）：同主题胶囊只出现一次，引语成组排在其下，
  // 消除逐条重复的出处/标签文字。
  const topics = new Map<string, VoiceRecord[]>();
  for (const voice of voices) {
    const group = topics.get(voice.theme) ?? [];
    group.push(voice);
    topics.set(voice.theme, group);
  }

  container.innerHTML = Array.from(topics.entries())
    .map(
      ([theme, items]) => `
        <li class="voice-topic">
          <p class="voice-meta"><b>${escapeHtml(theme)}</b></p>
          <ul class="voice-topic-items">
            ${items
              .map(
                (voice) => `
                  <li class="voice-item">
                    <blockquote class="voice-quote">“${escapeHtml(stripTrailingPeriod(voice.quote))}”</blockquote>
                    ${voice.note ? `<p class="voice-note">${escapeHtml(stripTrailingPeriod(voice.note))}</p>` : ""}
                  </li>`,
              )
              .join("")}
          </ul>
        </li>`,
    )
    .join("");

  bindCollapseToggle(container, ".voice-item", COLLAPSED_COUNT);
}

/**
 * Attach a two-way collapse toggle to a list: the first `visibleCount`
 * items stay visible, the rest are hidden until expanded.
 */
function bindCollapseToggle(list: HTMLElement, itemSelector: string, collapsedCount: number) {
  const items = Array.from(list.querySelectorAll<HTMLElement>(itemSelector));
  const desktop = window.matchMedia(DESKTOP_COLLAPSE_QUERY);
  let toggleItem: HTMLLIElement | null = null;
  let button: HTMLButtonElement | null = null;
  let expanded = false;

  const syncTopics = () => {
    // 主题分组下：整组引语均被收起时，隐藏该主题胶囊行（避免"有标签无内容"）。
    for (const topic of Array.from(list.querySelectorAll<HTMLElement>(".voice-topic"))) {
      const hasVisibleItem = Array.from(topic.querySelectorAll<HTMLElement>(itemSelector)).some(
        (item) => !item.hidden,
      );
      topic.hidden = !hasVisibleItem;
    }
  };

  const apply = () => {
    const visibleCount = resolveCollapseState(desktop.matches, collapsedCount).visibleCount;
    if (visibleCount === null) {
      // 桌面：恒全展开，折叠按钮不渲染。
      for (const item of items) item.hidden = false;
      syncTopics();
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
    syncTopics();
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
