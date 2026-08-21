import type { VoiceRecord } from "../lib/data-validation";

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
