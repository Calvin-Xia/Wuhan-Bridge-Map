import type { VoiceRecord } from "../lib/data-validation";

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
  container.innerHTML = voices
    .map(
      (voice) => `
        <li class="voice-item">
          <blockquote class="voice-quote">“${escapeHtml(voice.quote)}”</blockquote>
          <p class="voice-meta"><b>${escapeHtml(voice.theme)}</b><span>${escapeHtml(voice.source)} · 匿名</span></p>
          ${voice.note ? `<p class="voice-note">${escapeHtml(voice.note)}</p>` : ""}
        </li>`,
    )
    .join("");

  bindCollapseToggle(container, ".voice-item", COLLAPSED_COUNT, {
    expand: (rest) => `展开其余 ${rest} 条`,
    collapse: (rest) => `收起其余 ${rest} 条`,
  });
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
