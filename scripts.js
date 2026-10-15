// Mobile menu toggle
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");

    menuToggle.classList.toggle("open", isOpen);

    menuToggle.setAttribute("aria-expanded", String(isOpen));

    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation menu" : "Open navigation menu"
    );
  });

  // Close mobile menu when a navigation link is clicked
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuToggle.classList.remove("open");

      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation menu");
    });
  });
}

// Automatically update copyright year
const yearElement = document.getElementById("year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// Highlight active navbar section
const sections = document.querySelectorAll("main section[id]");
const navItems = document.querySelectorAll(".nav-link");

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        navItems.forEach((link) => {
          const isActive =
            link.getAttribute("href") === `#${entry.target.id}`;

          link.classList.toggle("active", isActive);
        });
      });
    },
    {
      rootMargin: "-20% 0px -65% 0px"
    }
  );

  sections.forEach((section) => {
    sectionObserver.observe(section);
  });
}

// Hero image carousel

const carousel = document.querySelector(".hero-carousel");

if (carousel) {
  const slides = carousel.querySelectorAll(".carousel-slide");
  const dots = carousel.querySelectorAll(".dot");
  const prevBtn = carousel.querySelector(".prev");
  const nextBtn = carousel.querySelector(".next");

  let currentIndex = 0;
  let carouselTimer;

  function showSlide(index) {
    currentIndex = (index + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      slide.classList.toggle("active", i === currentIndex);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === currentIndex);
    });
  }

  function nextSlide() {
    showSlide(currentIndex + 1);
  }

  function prevSlide() {
    showSlide(currentIndex - 1);
  }

  nextBtn?.addEventListener("click", nextSlide);
  prevBtn?.addEventListener("click", prevSlide);

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => showSlide(index));
  });

  function startCarousel() {
    clearInterval(carouselTimer);
    carouselTimer = setInterval(nextSlide, 3000);
  }

  function stopCarousel() {
    clearInterval(carouselTimer);
  }

  carousel.addEventListener("mouseenter", stopCarousel);
  carousel.addEventListener("mouseleave", startCarousel);

  showSlide(0);
  startCarousel();
}
