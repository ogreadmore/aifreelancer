const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const heroSlider = document.querySelector("[data-slider]");
const slides = Array.from(document.querySelectorAll("[data-slide]"));
const dots = Array.from(document.querySelectorAll("[data-dot]"));
const ambientSnow = document.querySelector(".ambient-snow");
const contactForm = document.querySelector("[data-contact-form]");
const contactContext = document.querySelector("[data-contact-context]");
const siteFooter = document.querySelector(".site-footer");
const prefillLinks = Array.from(
  document.querySelectorAll(
    "[data-prefill-service], [data-prefill-goal], [data-prefill-details], [data-prefill-location], [data-prefill-party], [data-prefill-timing]",
  ),
);
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

if (ambientSnow) {
  let snowResizeTimer = null;

  const ambientImages = [
    'url("assets/snowflake-ornate-a.svg?v=5")',
    'url("assets/snowflake-ornate-b.svg?v=5")',
    'url("assets/snowflake-ornate-c.svg?v=5")',
    'url("assets/snowflake-outline-d.svg?v=2")',
  ];

  const buildAmbientSnow = () => {
    ambientSnow.classList.add("is-generated");
    ambientSnow.querySelectorAll(".generated-flake").forEach((flake) => flake.remove());

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width <= 760;
    const isTablet = width <= 1024;
    const cols = isMobile ? 5 : isTablet ? 8 : Math.min(18, Math.max(13, Math.round(width / 132)));
    const rows = isMobile ? 9 : isTablet ? 9 : Math.min(12, Math.max(10, Math.round(height / 118)));
    const cellWidth = width / cols;
    const cellHeight = height / rows;
    const baseSize = Math.min(cellWidth, cellHeight);
    const sizeRatios = isMobile ? [0.62, 0.76, 0.88] : [0.58, 0.72, 0.84, 0.92];
    const opacityValues = [0.18, 0.21, 0.24, 0.27];
    const xFractions = [0.42, 0.5, 0.58];
    const yFractions = [0.42, 0.5, 0.58];
    const fragment = document.createDocumentFragment();

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const index = row * cols + col;
        const size = Math.round(baseSize * sizeRatios[(row + col * 2) % sizeRatios.length]);
        const opacity = opacityValues[(row + col) % opacityValues.length];
        const xFraction = xFractions[(row * 2 + col) % xFractions.length];
        const yFraction = yFractions[(row + col * 3) % yFractions.length];
        const x = Math.round(col * cellWidth + cellWidth * xFraction - size / 2);
        const y = Math.round(row * cellHeight + cellHeight * yFraction - size / 2);
        const pulseDuration = 8 + Math.random() * 8;
        const pulseDelay = -Math.random() * pulseDuration;
        const minOpacity = Math.max(0.035, opacity * (0.16 + Math.random() * 0.18));
        const maxOpacity = Math.min(0.34, opacity * (1.02 + Math.random() * 0.26));
        const flake = document.createElement("span");

        flake.className = "ambient-flake generated-flake";
        flake.style.setProperty("--flake-image", ambientImages[(row * 3 + col) % ambientImages.length]);
        flake.style.setProperty("--flake-size", `${size}px`);
        flake.style.setProperty("--flake-opacity", String(opacity));
        flake.style.setProperty("--flake-opacity-min", minOpacity.toFixed(3));
        flake.style.setProperty("--flake-opacity-max", maxOpacity.toFixed(3));
        flake.style.setProperty("--flake-pulse-duration", `${pulseDuration.toFixed(2)}s`);
        flake.style.setProperty("--flake-pulse-delay", `${pulseDelay.toFixed(2)}s`);
        flake.style.setProperty("--flake-x", `${x}px`);
        flake.style.setProperty("--flake-y", `${y}px`);

        fragment.appendChild(flake);
      }
    }

    ambientSnow.appendChild(fragment);
  };

  buildAmbientSnow();

  window.addEventListener("resize", () => {
    window.clearTimeout(snowResizeTimer);
    snowResizeTimer = window.setTimeout(buildAmbientSnow, 120);
  });
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
  const setFieldValue = (name, value) => {
    if (!value) {
      return;
    }

    const field = contactForm.elements.namedItem(name);

    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLSelectElement ||
      field instanceof HTMLTextAreaElement
    ) {
      field.value = value;
    }
  };

  const setContextMessage = (message) => {
    if (!contactContext) {
      return;
    }

    if (!message) {
      contactContext.hidden = true;
      contactContext.textContent = "";
      return;
    }

    contactContext.hidden = false;
    contactContext.textContent = message;
  };

  const focusFirstOpenField = () => {
    const fieldOrder = ["name", "email", "phone", "location", "timing", "goal_area", "details"];

    for (const fieldName of fieldOrder) {
      const field = contactForm.elements.namedItem(fieldName);

      if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement
      ) {
        if (!field.value.trim()) {
          field.focus();
          return;
        }
      }
    }
  };

  const applyPrefill = (prefill, shouldFocus = false) => {
    const serviceField = contactForm.elements.namedItem("service");

    if (serviceField instanceof HTMLSelectElement && prefill.service) {
      const hasMatch = Array.from(serviceField.options).some((option) => option.value === prefill.service);

      if (hasMatch) {
        serviceField.value = prefill.service;
      }
    }

    setFieldValue("goal_area", prefill.goalArea);
    setFieldValue("details", prefill.details);
    setFieldValue("location", prefill.location);
    setFieldValue("party", prefill.party);
    setFieldValue("timing", prefill.timing);
    setContextMessage(prefill.contextMessage);

    if (shouldFocus) {
      window.setTimeout(() => {
        focusFirstOpenField();
      }, 120);
    }
  };

  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.has("service") || urlParams.has("goal") || urlParams.has("details")) {
    applyPrefill(
      {
        service: urlParams.get("service") || "",
        goalArea: urlParams.get("goal") || "",
        details: urlParams.get("details") || "",
        location: urlParams.get("location") || "",
        party: urlParams.get("party") || "",
        timing: urlParams.get("timing") || "",
        contextMessage: urlParams.get("label")
          ? `${urlParams.get("label")} is selected below.`
          : "",
      },
      window.location.hash === "#contact-form",
    );
  }

  prefillLinks.forEach((link) => {
    link.addEventListener("click", () => {
      applyPrefill(
        {
          service: link.dataset.prefillService || "",
          goalArea: link.dataset.prefillGoal || "",
          details: link.dataset.prefillDetails || "",
          location: link.dataset.prefillLocation || "",
          party: link.dataset.prefillParty || "",
          timing: link.dataset.prefillTiming || "",
          contextMessage: link.dataset.prefillLabel
            ? `${link.dataset.prefillLabel} is selected below.`
            : "Your selection is ready in the form below.",
        },
        true,
      );
    });
  });

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const values = Object.fromEntries(formData.entries());
    const subjectParts = ["Mobile Cryo Pro booking request"];

    if (values.service) {
      subjectParts.push(`for ${values.service}`);
    }

    if (values.name) {
      subjectParts.push(`from ${values.name}`);
    }

    const lines = [
      `Name: ${values.name || ""}`,
      `Email: ${values.email || ""}`,
      `Phone: ${values.phone || ""}`,
      `Service: ${values.service || ""}`,
      `Location: ${values.location || ""}`,
      `Preferred timing: ${values.timing || ""}`,
      `Goal or area: ${values.goal_area || ""}`,
      `People or horses: ${values.party || ""}`,
      "",
      "Notes:",
      values.details || "",
    ];

    const params = new URLSearchParams({
      subject: subjectParts.join(" "),
      body: lines.join("\n"),
    });

    window.location.href = `mailto:info@mobilecryopro.com?${params.toString()}`;
  });
}

if (header && siteFooter && "IntersectionObserver" in window) {
  const footerObserver = new IntersectionObserver(
    ([entry]) => {
      const shouldRecede = entry.isIntersecting;
      header.classList.toggle("is-receded", shouldRecede);
      header.toggleAttribute("inert", shouldRecede);

      if (shouldRecede) {
        header.setAttribute("aria-hidden", "true");
        header.classList.remove("nav-open");
        navToggle?.setAttribute("aria-expanded", "false");
      } else {
        header.removeAttribute("aria-hidden");
      }
    },
    {
      rootMargin: "0px 0px -40% 0px",
      threshold: 0.01,
    },
  );

  footerObserver.observe(siteFooter);
}
