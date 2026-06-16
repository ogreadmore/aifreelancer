const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const heroSlider = document.querySelector("[data-slider]");
const slides = Array.from(document.querySelectorAll("[data-slide]"));
const dots = Array.from(document.querySelectorAll("[data-dot]"));
const contactForm = document.querySelector("[data-contact-form]");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

if (header) {
  const updateScrolledHeader = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 6);
  };

  updateScrolledHeader();
  window.addEventListener("scroll", updateScrolledHeader, { passive: true });
}

if (navToggle && header) {
  navToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    header?.classList.remove("nav-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

if (slides.length && dots.length) {
  let activeIndex = 0;
  let sliderTimer = null;

  const showSlide = (index) => {
    activeIndex = index;

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === activeIndex);
    });

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === activeIndex);
      dot.setAttribute("aria-pressed", String(dotIndex === activeIndex));
    });
  };

  const startSlider = () => {
    if (reducedMotionQuery.matches) {
      return;
    }

    clearInterval(sliderTimer);
    sliderTimer = setInterval(() => {
      const nextIndex = (activeIndex + 1) % slides.length;
      showSlide(nextIndex);
    }, 6500);
  };

  const stopSlider = () => {
    clearInterval(sliderTimer);
    sliderTimer = null;
  };

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const index = Number(dot.dataset.dot);

      if (!Number.isNaN(index)) {
        showSlide(index);
        startSlider();
      }
    });
  });

  showSlide(activeIndex);
  startSlider();

  heroSlider?.addEventListener("mouseenter", stopSlider);
  heroSlider?.addEventListener("mouseleave", startSlider);
  heroSlider?.addEventListener("focusin", stopSlider);
  heroSlider?.addEventListener("focusout", (event) => {
    if (!(event.relatedTarget instanceof Node) || !heroSlider.contains(event.relatedTarget)) {
      startSlider();
    }
  });

  reducedMotionQuery.addEventListener("change", (event) => {
    if (event.matches) {
      stopSlider();
    } else {
      startSlider();
    }
  });
}

if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const values = Object.fromEntries(formData.entries());

    const subjectParts = ["Mobile Cryo Pro — New inquiry"];
    if (values.name) {
      subjectParts.push(`from ${values.name}`);
    }

    const lines = [
      `Name: ${values.name || ""}`,
      `Email: ${values.email || ""}`,
      `Phone: ${values.phone || ""}`,
      "",
      "Message:",
      values.message || "",
    ];

    const params = new URLSearchParams({
      subject: subjectParts.join(" "),
      body: lines.join("\n"),
    });

    window.location.href = `mailto:info@mobilecryopro.com?${params.toString()}`;
  });
}

if (document.body.classList.contains("home-page") && !reducedMotionQuery.matches) {
  const motionTargets = [];

  const addMotionTargets = (selector, options = {}) => {
    const {
      baseDelay = 0,
      stagger = 80,
      kind = "motion-rise",
    } = options;

    document.querySelectorAll(selector).forEach((element, index) => {
      element.classList.add("mcp-motion-item", kind);
      element.style.setProperty("--motion-delay", `${baseDelay + index * stagger}ms`);
      motionTargets.push(element);
    });
  };

  addMotionTargets(
    ".home-flagship-hero .services-hero-copy > .eyebrow, .home-flagship-hero .services-hero-copy > h1, .home-flagship-hero .services-hero-copy > p, .home-flagship-hero .services-hero-actions, .home-flagship-hero .hero-trust-row",
    { baseDelay: 90, stagger: 110, kind: "motion-hero" }
  );
  addMotionTargets(".home-proof-panel article", { baseDelay: 120, stagger: 70, kind: "motion-pop" });
  addMotionTargets(".home-story-grid > *", { stagger: 120, kind: "motion-rise" });
  addMotionTargets(".home-video-band .section-heading, .home-video-band .bio-video-frame", {
    stagger: 130,
    kind: "motion-rise",
  });
  addMotionTargets(".home-services-pricing-band .section-heading, .home-menu-grid .menu-preview-card, .home-inline-cta", {
    stagger: 85,
    kind: "motion-rise",
  });
  addMotionTargets(".home-context-band .section-heading, .coverage-card, .service-map-card, .home-context-band > .cta-actions", {
    stagger: 85,
    kind: "motion-rise",
  });

  const revealMotionTarget = (element) => {
    element.classList.add("is-motion-visible");

    const delay = Number.parseFloat(element.style.getPropertyValue("--motion-delay")) || 0;
    window.setTimeout(() => {
      element.style.setProperty("--motion-delay", "0ms");
    }, delay + 850);
  };

  const revealVisibleMotionTargets = () => {
    motionTargets.forEach((element) => {
      const rect = element.getBoundingClientRect();

      if (rect.top < window.innerHeight * 0.9) {
        revealMotionTarget(element);
      }
    });
  };

  if ("IntersectionObserver" in window) {
    const motionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealMotionTarget(entry.target);
            motionObserver.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.16,
      }
    );

    motionTargets.forEach((element) => motionObserver.observe(element));
  } else {
    motionTargets.forEach(revealMotionTarget);
  }

  document.body.classList.add("motion-ready");
  window.requestAnimationFrame(() => {
    document.body.classList.add("motion-started");
    revealVisibleMotionTargets();
  });

  reducedMotionQuery.addEventListener("change", (event) => {
    if (event.matches) {
      document.body.classList.remove("motion-ready", "motion-started");
      motionTargets.forEach((element) => {
        element.classList.remove("mcp-motion-item", "is-motion-visible");
        element.style.removeProperty("--motion-delay");
      });
    }
  });
}
