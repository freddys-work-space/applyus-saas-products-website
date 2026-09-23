/**
 * ApplyUs — SaaS Product Engineering Platform JavaScript
 * Interactive Features per PRD: Mobile menu, Showcase tabs, Single-open FAQ, Animated Stats
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 2. Set current year in footer
  const yearDisplay = document.getElementById('year-display');
  if (yearDisplay) {
    yearDisplay.textContent = new Date().getFullYear();
  }

  // 3. Mobile Navigation Hamburger & Drawer
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');

  if (mobileMenuBtn && mobileDrawer) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileDrawer.classList.toggle('open');
    });

    document.querySelectorAll('.mobile-nav-item').forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
      });
    });
  }

  // 4. Section 13: Featured Product Showcase Tabs
  const showcaseTabBtns = document.querySelectorAll('.showcase-tab-btn');
  const showcaseTabPanels = document.querySelectorAll('.showcase-tab-panel');

  showcaseTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      showcaseTabBtns.forEach(b => b.classList.remove('active'));
      showcaseTabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = btn.getAttribute('data-tab');
      const targetPanel = document.getElementById(`tab-${targetTab}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
        if (window.lucide) window.lucide.createIcons();
      }
    });
  });

  // 5. Section 20: FAQ Accordion (Single-Open Only per PRD)
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const faqBtn = item.querySelector('.faq-btn');
    if (faqBtn) {
      faqBtn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        // Close all items
        faqItems.forEach(i => i.classList.remove('active'));
        // If wasn't active, open it
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });

  // 6. Section 7: Statistics Number Count-Up Animation
  const countUpElements = document.querySelectorAll('.count-up');
  let hasAnimated = false;

  const statsSection = document.getElementById('stats');
  if (statsSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasAnimated) {
          hasAnimated = true;
          countUpElements.forEach(el => {
            const target = parseFloat(el.getAttribute('data-target'));
            const isDecimal = target % 1 !== 0;
            let current = 0;
            const increment = target / 35;
            const timer = setInterval(() => {
              current += increment;
              if (current >= target) {
                current = target;
                clearInterval(timer);
              }
              el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
            }, 35);
          });
        }
      });
    }, { threshold: 0.25 });

    observer.observe(statsSection);
  }

  // 8. Section 8.5: Dynamic Auto-Discovering Looping Carousel
  initAutoDiscoveringCarousel();

  async function initAutoDiscoveringCarousel() {
    const viewport = document.getElementById('carousel-viewport');
    const thumbnailsContainer = document.getElementById('carousel-thumbnails');
    const dotsContainer = document.getElementById('carousel-dots');
    const prevBtn = document.getElementById('carousel-prev-btn');
    const nextBtn = document.getElementById('carousel-next-btn');
    const slideNumIndicator = document.getElementById('slide-num-indicator');
    const carouselUrl = document.getElementById('carousel-current-url');
    const playPauseBtn = document.getElementById('carousel-play-pause');
    const playPauseIcon = document.getElementById('play-pause-icon');
    const carouselWrapper = document.querySelector('.work-carousel-wrapper');

    if (!viewport) return;

    // Project metadata dictionary for nice titles/tags
    const projectMetadata = [
      { title: "Live Gold & Silver Billing Engine with Instant Estimation Receipt", tag: "FINTECH & BILLING", label: "01. Billing Screen", url: "app.applyus.io/billing-engine/live" },
      { title: "Accounts & Daily EOD Day Book (Cash Counter, Scrap & Net Profit)", tag: "ACCOUNTING & ERP", label: "02. EOD Day Book", url: "app.applyus.io/accounts/eod-day-book" },
      { title: "Chronological Daily Entry Log (248+ Real-Time Transactions)", tag: "FINANCIAL LEDGER", label: "03. Daily Log", url: "app.applyus.io/ledger/chronological-log" },
      { title: "Multi-Category Inventory & Stock Tracking with Reorder Alerts", tag: "INVENTORY & LOGISTICS", label: "04. Inventory Stock", url: "app.applyus.io/inventory/stock-management" },
      { title: "Craftsman Order Dispatch & Real-Time Job Progress Tracking", tag: "WORKFLOW AUTOMATION", label: "05. Worker Dispatch", url: "app.applyus.io/workers/craftsman-dispatch" },
      { title: "Responsive Craftsman Mobile Portal with Live Metal Balances", tag: "MOBILE APPS & SAAS", label: "06. Craftsman App", url: "app.applyus.io/mobile/craftsman-portal" },
      { title: "Real-Time Order Dispatch Chat with Photo Attachments", tag: "MESSENGER & AI CHAT", label: "07. Order Chat", url: "app.applyus.io/mobile/order-dispatch-chat" },
      { title: "Mobile Ledger & Metal Statement with Filterable Records", tag: "DIGITAL LEDGER", label: "08. Statement", url: "app.applyus.io/mobile/transaction-statement" },
    ];

    // Helper: test if an image URL exists
    function testImage(url) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ exists: true, width: img.naturalWidth, height: img.naturalHeight, src: url });
        img.onerror = () => resolve({ exists: false, src: url });
        img.src = url;
      });
    }

    // Auto-probe images from carousel/image-1 to image-50
    const discoveredImages = [];
    const extensions = ['webp', 'png', 'jpg', 'jpeg'];
    let consecutiveMisses = 0;

    for (let i = 1; i <= 50; i++) {
      let foundForIndex = null;
      for (const ext of extensions) {
        const candidateUrl = `./carousel/image-${i}.${ext}`;
        const result = await testImage(candidateUrl);
        if (result.exists) {
          foundForIndex = { index: i, ...result };
          break;
        }
      }

      if (foundForIndex) {
        discoveredImages.push(foundForIndex);
        consecutiveMisses = 0;
      } else {
        consecutiveMisses++;
        // If 4 consecutive numbers miss, stop probing
        if (consecutiveMisses >= 4 && i > 8) break;
      }
    }

    // If images discovered, dynamically render the carousel
    if (discoveredImages.length > 0) {
      viewport.innerHTML = '';
      if (thumbnailsContainer) thumbnailsContainer.innerHTML = '';
      if (dotsContainer) dotsContainer.innerHTML = '';

      discoveredImages.forEach((imgData, i) => {
        const meta = projectMetadata[i] || {
          title: `Project Deployment #${imgData.index} — Custom SaaS Application`,
          tag: "PRODUCTION SOFTWARE",
          label: `Project ${imgData.index}`,
          url: `app.applyus.io/projects/image-${imgData.index}`
        };

        const isPortrait = imgData.height > imgData.width * 1.25;

        // 1. Build Slide
        const slide = document.createElement('div');
        slide.className = `carousel-slide ${i === 0 ? 'active' : ''}`;
        slide.setAttribute('data-index', i);
        slide.setAttribute('data-url', meta.url);
        slide.setAttribute('data-title', meta.title);
        slide.setAttribute('data-tag', meta.tag);
        slide.innerHTML = `
          <img src="${imgData.src}" alt="${meta.title}" class="carousel-slide-img ${isPortrait ? 'mobile-portrait-img' : ''}" />
          <div class="slide-caption-bar">
            <div class="caption-content">
              <span class="caption-tag">${meta.tag}</span>
              <h4 class="caption-title">${i + 1 < 10 ? '0' + (i + 1) : i + 1}. ${meta.title}</h4>
            </div>
            <a href="#contact" class="btn btn-primary btn-sm">Build Similar Software <i class="fa-solid fa-arrow-right"></i></a>
          </div>
        `;
        viewport.appendChild(slide);

        // 2. Build Thumbnail
        if (thumbnailsContainer) {
          const thumbBtn = document.createElement('button');
          thumbBtn.className = `thumb-btn ${i === 0 ? 'active' : ''}`;
          thumbBtn.setAttribute('data-slide', i);
          thumbBtn.innerHTML = `
            <img src="${imgData.src}" alt="${meta.label}" />
            <span>${meta.label}</span>
          `;
          thumbBtn.addEventListener('click', () => goToSlide(i));
          thumbnailsContainer.appendChild(thumbBtn);
        }

        // 3. Build Dot
        if (dotsContainer) {
          const dot = document.createElement('span');
          dot.className = `dot-indicator ${i === 0 ? 'active' : ''}`;
          dot.setAttribute('data-slide', i);
          dot.addEventListener('click', () => goToSlide(i));
          dotsContainer.appendChild(dot);
        }
      });
    }

    // Active Slide Controller with Infinite Loop
    const allSlides = viewport.querySelectorAll('.carousel-slide');
    const allThumbs = thumbnailsContainer ? thumbnailsContainer.querySelectorAll('.thumb-btn') : [];
    const allDots = dotsContainer ? dotsContainer.querySelectorAll('.dot-indicator') : [];
    const totalSlides = allSlides.length;

    if (totalSlides === 0) return;

    let currentSlideIndex = 0;
    let autoPlayInterval = null;
    let isPlaying = true;

    function goToSlide(index) {
      currentSlideIndex = (index + totalSlides) % totalSlides;

      allSlides.forEach((slide, i) => {
        slide.classList.toggle('active', i === currentSlideIndex);
      });

      allThumbs.forEach((btn, i) => {
        btn.classList.toggle('active', i === currentSlideIndex);
      });

      allDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlideIndex);
      });

      if (slideNumIndicator) {
        slideNumIndicator.textContent = `Project ${currentSlideIndex + 1} of ${totalSlides}`;
      }

      const activeSlide = allSlides[currentSlideIndex];
      if (activeSlide && carouselUrl) {
        const url = activeSlide.getAttribute('data-url') || `app.applyus.io/projects/image-${currentSlideIndex + 1}`;
        carouselUrl.textContent = url;
      }

      if (allThumbs[currentSlideIndex]) {
        allThumbs[currentSlideIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }

    function nextSlide() {
      goToSlide(currentSlideIndex + 1);
    }

    function prevSlide() {
      goToSlide(currentSlideIndex - 1);
    }

    function startAutoPlay() {
      if (!autoPlayInterval && isPlaying) {
        autoPlayInterval = setInterval(nextSlide, 5000);
      }
    }

    function stopAutoPlay() {
      if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
      }
    }

    if (nextBtn) {
      nextBtn.onclick = () => { nextSlide(); };
    }
    if (prevBtn) {
      prevBtn.onclick = () => { prevSlide(); };
    }

    if (playPauseBtn && playPauseIcon) {
      playPauseBtn.onclick = () => {
        isPlaying = !isPlaying;
        if (isPlaying) {
          playPauseIcon.className = 'fa-solid fa-pause';
          startAutoPlay();
        } else {
          playPauseIcon.className = 'fa-solid fa-play';
          stopAutoPlay();
        }
      };
    }

    if (carouselWrapper) {
      carouselWrapper.addEventListener('mouseenter', stopAutoPlay);
      carouselWrapper.addEventListener('mouseleave', () => {
        if (isPlaying) startAutoPlay();
      });

      let touchStartX = 0;
      let touchEndX = 0;

      carouselWrapper.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        stopAutoPlay();
      }, { passive: true });

      carouselWrapper.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 45) {
          nextSlide();
        } else if (touchEndX - touchStartX > 45) {
          prevSlide();
        }
        if (isPlaying) startAutoPlay();
      }, { passive: true });
    }

    // Keyboard Arrow Keys
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    });

    goToSlide(0);
    startAutoPlay();
  }

  // 9. Smooth Scroll for internal navigation links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href && href !== '#') {
        const targetElement = document.querySelector(href);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });
});
