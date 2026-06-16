(function initHomeScrollReveals() {
  var body = document.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (
    !body ||
    !body.classList.contains("home-page") ||
    reduceMotion.matches ||
    !("IntersectionObserver" in window)
  ) {
    return;
  }

  var revealGroups = [
    [".home-proof-panel", "article", 56],
    [".home-story-band", ".section-grid > *", 90],
    [".home-video-band", ":scope > .section-heading, :scope > .bio-video-frame", 100],
    [".home-services-pricing-band", ".section-heading, .menu-preview-card, .home-inline-cta", 80],
    [".home-context-band", ".section-heading, .coverage-card, .service-map-card, .cta-actions", 80],
  ];

  var revealItems = [];

  revealGroups.forEach(function (group) {
    var section = document.querySelector(group[0]);
    if (!section) return;

    section.querySelectorAll(group[1]).forEach(function (item, index) {
      item.classList.add("home-reveal");
      item.style.setProperty("--reveal-delay", Math.min(index * group[2], 320) + "ms");
      revealItems.push(item);
    });
  });

  if (!revealItems.length) return;

  document.documentElement.classList.add("home-reveal-ready");

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px 12% 0px",
      threshold: 0.05,
    },
  );

  revealItems.forEach(function (item) {
    observer.observe(item);
  });
})();
