const progress = document.querySelector(".progress");
const navLinks = [...document.querySelectorAll(".nav a[href^='#']")];
const sections = [...document.querySelectorAll("main section[id]")];

function updateProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
  progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
}

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.hash === `#${visible.target.id}`);
    });
  },
  { rootMargin: "-30% 0px -55% 0px", threshold: [0.05, 0.25, 0.5] }
);

sections.forEach((section) => observer.observe(section));
window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();

let printDetailState = [];

window.addEventListener("beforeprint", () => {
  printDetailState = [...document.querySelectorAll("details")].map((item) => item.open);
  document.querySelectorAll("details").forEach((item) => {
    item.open = true;
  });
});

window.addEventListener("afterprint", () => {
  document.querySelectorAll("details").forEach((item, index) => {
    item.open = printDetailState[index] ?? item.open;
  });
});

document.querySelector("[data-print]")?.addEventListener("click", () => window.print());

document.querySelector("[data-expand]")?.addEventListener("click", (event) => {
  const details = [...document.querySelectorAll("details")];
  const shouldOpen = details.some((item) => !item.open);
  details.forEach((item) => {
    item.open = shouldOpen;
  });
  event.currentTarget.textContent = shouldOpen ? "Collapse detail" : "Expand detail";
});

const assistantOpen = document.querySelector("[data-assistant-open]");
const assistantPanel = document.querySelector("#plan-assistant");
const assistantClose = document.querySelector("[data-assistant-close]");
const assistantScrim = document.querySelector("[data-assistant-scrim]");

function setAssistant(open) {
  if (!assistantPanel || !assistantOpen || !assistantScrim) return;
  assistantPanel.hidden = !open;
  assistantScrim.hidden = !open;
  assistantOpen.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("assistant-is-open", open);
  if (open) {
    assistantClose?.focus();
  } else {
    assistantOpen.focus();
  }
}

assistantOpen?.addEventListener("click", () => setAssistant(true));
assistantClose?.addEventListener("click", () => setAssistant(false));
assistantScrim?.addEventListener("click", () => setAssistant(false));
document.addEventListener("keydown", (event) => {
  if (assistantPanel?.hidden) return;
  if (event.key === "Escape") {
    setAssistant(false);
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = [...assistantPanel.querySelectorAll("button, a[href]")].filter(
    (item) => !item.hasAttribute("disabled")
  );
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
});
