const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const heroSlider = document.querySelector("[data-slider]");
const slides = Array.from(document.querySelectorAll("[data-slide]"));
const dots = Array.from(document.querySelectorAll("[data-dot]"));
const contactForm = document.querySelector("[data-contact-form]");
const siteFooter = document.querySelector(".site-footer");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

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
