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

    const subjectParts = [
      contactForm.dataset.formSubject || "Mobile Cryo Pro — New inquiry",
    ];
    if (values.name) {
      subjectParts.push(`from ${values.name}`);
    }

    const fieldLabels = {
      name: "Name",
      email: "Email",
      phone: "Phone",
      city: "City",
      state: "State",
      desired_territory: "Desired territory",
      occupation: "Current occupation",
      business_experience: "Business experience",
      preferred_time: "Preferred contact time",
    };

    const lines = Object.entries(fieldLabels)
      .filter(([key]) => key in values)
      .map(([key, label]) => `${label}: ${values[key] || ""}`);

    lines.push("", "Message:", values.message || "");

    const params = new URLSearchParams({
      subject: subjectParts.join(" "),
      body: lines.join("\n"),
    });

    window.location.href = `mailto:info@mobilecryopro.com?${params.toString()}`;
  });
}
