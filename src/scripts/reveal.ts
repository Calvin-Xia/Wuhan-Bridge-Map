const revealElements = document.querySelectorAll<HTMLElement>(".reveal");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export {};

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealElements.forEach((element) => element.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries, activeObserver) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        activeObserver.unobserve(entry.target);
      }
    },
    { threshold: 0.16 },
  );

  revealElements.forEach((element) => observer.observe(element));
}
