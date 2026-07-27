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
