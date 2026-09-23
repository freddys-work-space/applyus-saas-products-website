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

    let discoveredImages = [];

    // 1. First try fetching dynamic carousel records from Neon PostgreSQL / S3 Bucket API
    try {
      const dbResponse = await fetch('/api/carousel');
      if (dbResponse.ok) {
        const dbJson = await dbResponse.json();
        if (dbJson.success && Array.isArray(dbJson.data) && dbJson.data.length > 0) {
          for (let i = 0; i < dbJson.data.length; i++) {
            const row = dbJson.data[i];
            const testRes = await testImage(row.image_url);
            discoveredImages.push({
              index: i + 1,
              src: row.image_url,
              width: testRes.width || 1200,
              height: testRes.height || 800,
              title: row.title,
              tag: row.tag,
              url: row.project_url
            });
          }
        }
      }
    } catch (e) {
      console.warn('Neon DB carousel fetch skipped, probing local files...', e);
    }

    // 2. Fallback to local probe if database returned no items
    if (discoveredImages.length === 0) {
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
          if (consecutiveMisses >= 4 && i > 8) break;
        }
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
          <img src="${imgData.src}" alt="${meta.title}" class="carousel-slide-img ${isPortrait ? 'mobile-portrait-img' : ''}" title="Click to view full preview & download image" />
          <div class="slide-caption-bar">
            <div class="caption-content">
              <span class="caption-tag">${meta.tag}</span>
              <h4 class="caption-title">${i + 1 < 10 ? '0' + (i + 1) : i + 1}. ${meta.title}</h4>
            </div>
            <a href="#contact" class="btn btn-primary btn-sm">Build Similar Software <i class="fa-solid fa-arrow-right"></i></a>
          </div>
        `;

        // Click slide image to preview & download
        slide.querySelector('.carousel-slide-img').addEventListener('click', () => {
          if (window.openLandingLightbox) {
            window.openLandingLightbox(imgData.src, meta.title, `${meta.tag} • High-Resolution Production UI`, meta.url);
          }
        });

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

      if (thumbnailsContainer && allThumbs[currentSlideIndex]) {
        const thumb = allThumbs[currentSlideIndex];
        const containerRect = thumbnailsContainer.getBoundingClientRect();
        const thumbRect = thumb.getBoundingClientRect();
        const targetScroll = thumbnailsContainer.scrollLeft + (thumbRect.left - containerRect.left) - (containerRect.width / 2) + (thumbRect.width / 2);
        thumbnailsContainer.scrollTo({ left: targetScroll, behavior: 'smooth' });
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

  // 8.8 Section 8.8: Live Websites & Production Hyperlinks Directory (Neon PostgreSQL Powered)
  initLiveWebsitesDirectory();

  async function initLiveWebsitesDirectory() {
    const grid = document.getElementById('websites-cards-grid');
    const loadingEl = document.getElementById('directory-loading') || document.getElementById('websites-loading');
    const emptyEl = document.getElementById('directory-empty') || document.getElementById('websites-empty');
    const searchInput = document.getElementById('websites-search-input');
    const chipsContainer = document.getElementById('category-filter-chips');
    const addBtn = document.getElementById('open-add-website-modal-btn') || document.getElementById('open-add-link-modal-btn');
    const modal = document.getElementById('add-website-modal') || document.getElementById('add-link-modal');
    const modalCloseBtn = document.getElementById('close-modal-btn') || document.getElementById('modal-close-btn');
    const modalCancelBtn = document.getElementById('cancel-modal-btn') || document.getElementById('modal-cancel-btn');
    const addForm = document.getElementById('add-website-form') || document.getElementById('add-link-form');
    const submitBtn = document.getElementById('submit-modal-btn') || document.getElementById('modal-submit-btn');
    const countAllEl = document.getElementById('count-all');
    const resetFilterBtn = document.getElementById('reset-filter-btn');

    if (!grid) return;

    let allWebsites = [];
    let currentCategory = 'all';
    let currentSearchQuery = '';

    // Fallback data in case server is viewed statically
    const fallbackWebsites = [
      {
        id: 1,
        title: "Jaya Bhavani Retail Gold & Silver Billing SaaS",
        category: "Billing Software",
        description: "Production-grade retail jewelry billing engine with live market rate sync, automated discount calculation, and thermal receipt printing.",
        url: "https://jb-billing.applyus.io",
        preview_image: "./carousel/image-1.webp",
        badge: "Live Production",
        tech_stack: ["React", "Node.js", "PostgreSQL", "Thermal API"],
        status: "Active"
      },
      {
        id: 2,
        title: "Autonomous Voice AI Inbound Support Telephony Bot",
        category: "AI Calling Agents",
        description: "Sub-50ms conversational telephony agent handling customer order status inquiries, bookings, and CRM deal qualification 24/7.",
        url: "https://voice.applyus.io/demo",
        preview_image: "./carousel/image-2.webp",
        badge: "Live Voice AI",
        tech_stack: ["WebSockets", "WebRTC", "OpenAI Whisper", "FastAPI"],
        status: "Active"
      },
      {
        id: 3,
        title: "ApplyUS Multi-Tenant Enterprise CRM & Deal Pipeline",
        category: "Enterprise CRM",
        description: "Tailored CRM with visual Kanban deal stages, automated WhatsApp notifications, email sequences, and lead attribution scoring.",
        url: "https://crm.applyus.io",
        preview_image: "./carousel/image-3.webp",
        badge: "Enterprise Live",
        tech_stack: ["Next.js", "Tailwind", "PostgreSQL", "Stripe"],
        status: "Active"
      },
      {
        id: 4,
        title: "Omnichannel Cloud ERP & Multi-Warehouse Logistics",
        category: "Cloud ERP",
        description: "Enterprise resource planning system tracking inventory across 5 branches, automated purchase orders, and worker accounting.",
        url: "https://erp.applyus.io",
        preview_image: "./carousel/image-4.webp",
        badge: "Cloud Deployment",
        tech_stack: ["React", "Express", "Neon PostgreSQL", "Docker"],
        status: "Active"
      },
      {
        id: 5,
        title: "Enterprise Knowledge RAG & Customer AI Assistant",
        category: "AI Chatbots",
        description: "Context-grounded conversational bot trained on internal documents with zero hallucinations, pgvector search, and citations.",
        url: "https://chat.applyus.io",
        preview_image: "./carousel/image-5.webp",
        badge: "RAG Live",
        tech_stack: ["pgvector", "LangChain", "Claude 3.5", "Next.js"],
        status: "Active"
      },
      {
        id: 6,
        title: "Craftsman Mobile Portal & Assigned Orders Tracker",
        category: "Mobile Apps",
        description: "Lightweight PWA for workers to track gold/silver balances, view assigned jobs, and upload finished item photos.",
        url: "https://craftsman.applyus.io",
        preview_image: "./carousel/image-6.webp",
        badge: "Mobile Live",
        tech_stack: ["PWA", "React", "Node.js", "AWS S3"],
        status: "Active"
      }
    ];

    // Load data from Neon PostgreSQL API
    async function loadWebsites() {
      if (loadingEl) loadingEl.style.display = 'flex';
      try {
        const response = await fetch('/api/websites');
        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data) && result.data.length > 0) {
            allWebsites = result.data;
          } else {
            allWebsites = fallbackWebsites;
          }
        } else {
          allWebsites = fallbackWebsites;
        }
      } catch (err) {
        console.warn('API fetch failed, falling back to cached datasets:', err);
        allWebsites = fallbackWebsites;
      } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (countAllEl) countAllEl.textContent = allWebsites.length;
        renderCards();
      }
    }

    // Render Website Cards
    function renderCards() {
      const filtered = allWebsites.filter(site => {
        const matchesCategory = currentCategory === 'all' || 
          (site.category && site.category.toLowerCase().trim() === currentCategory.toLowerCase().trim());
        
        const q = currentSearchQuery.toLowerCase().trim();
        const matchesSearch = !q ||
          (site.title && site.title.toLowerCase().includes(q)) ||
          (site.description && site.description.toLowerCase().includes(q)) ||
          (site.category && site.category.toLowerCase().includes(q)) ||
          (site.url && site.url.toLowerCase().includes(q)) ||
          (Array.isArray(site.tech_stack) && site.tech_stack.some(t => t.toLowerCase().includes(q)));

        return matchesCategory && matchesSearch;
      });

      // Clear previous cards and ensure loading spinner is hidden
      if (loadingEl) loadingEl.style.display = 'none';
      const existingCards = grid.querySelectorAll('.website-card');
      existingCards.forEach(c => c.remove());

      if (filtered.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
      } else {
        if (emptyEl) emptyEl.style.display = 'none';

        filtered.forEach(site => {
          const card = document.createElement('div');
          card.className = 'website-card';
          card.setAttribute('data-id', site.id || '');

          // Tech stack tags
          let techPills = '';
          const techList = Array.isArray(site.tech_stack) 
            ? site.tech_stack 
            : (typeof site.tech_stack === 'string' ? site.tech_stack.split(',').map(s => s.trim()) : []);

          techList.forEach(tech => {
            if (tech) techPills += `<span class="tech-pill">${tech}</span>`;
          });

          // Clean display URL (e.g. jb-billing.applyus.io)
          const displayUrl = site.url.replace(/^https?:\/\//, '').replace(/\/$/, '');

          card.innerHTML = `
            <div class="website-card-image-wrap" title="Click to preview full interface & download">
              <img src="${site.preview_image || './carousel/image-1.webp'}" alt="${site.title}" class="website-card-img" onerror="this.src='./carousel/image-1.webp'" />
              <div class="website-card-overlay">
                <a href="${site.url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm external-preview-btn">
                  Launch Site <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
              </div>
              <div class="website-card-badge">
                <span class="live-dot-pulse"></span>
                ${site.badge || 'Live Production'}
              </div>
            </div>
            <div class="website-card-body">
              <div class="website-card-meta">
                <span class="website-category-tag">${site.category || 'Web Application'}</span>
                <span class="website-status-tag"><i class="fa-solid fa-circle-check"></i> ${site.status || 'Active'}</span>
              </div>
              <h3 class="website-card-title">${site.title}</h3>
              <p class="website-card-desc">${site.description || 'Production SaaS platform deployed and actively maintained.'}</p>
              
              <div class="website-card-tech">
                ${techPills}
              </div>

              <div class="website-card-footer">
                <a href="${site.url}" target="_blank" rel="noopener noreferrer" class="website-link-btn" title="Open ${displayUrl} in a new tab">
                  <span class="website-url-text">${displayUrl}</span>
                  <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
              </div>
            </div>
          `;

          // Image click opens lightbox preview
          const imgWrap = card.querySelector('.website-card-image-wrap');
          imgWrap.addEventListener('click', (e) => {
            // If user clicked the "Launch Site" button inside overlay, let it navigate
            if (e.target.closest('.external-preview-btn')) return;
            if (window.openLandingLightbox) {
              window.openLandingLightbox(site.preview_image || './carousel/image-1.webp', site.title, `${site.category || 'SaaS Application'} • ${site.badge || 'Live Production'}`, site.url);
            }
          });

          grid.appendChild(card);
        });
      }

      if (window.lucide) window.lucide.createIcons();
    }

    // Category Filter Chips click
    if (chipsContainer) {
      chipsContainer.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          chipsContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          currentCategory = chip.getAttribute('data-category') || 'all';
          renderCards();
        });
      });
    }

    // Search Input Real-Time Debounced Filtering
    if (searchInput) {
      let searchTimeout = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          currentSearchQuery = e.target.value;
          renderCards();
        }, 150);
      });
    }

    // Reset Filter Button
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        currentCategory = 'all';
        currentSearchQuery = '';
        if (searchInput) searchInput.value = '';
        if (chipsContainer) {
          chipsContainer.querySelectorAll('.filter-chip').forEach(c => {
            if ((c.getAttribute('data-category') || '').toLowerCase() === 'all') {
              c.classList.add('active');
            } else {
              c.classList.remove('active');
            }
          });
        }
        renderCards();
      });
    }

    // Modal Handlers
    function openModal() {
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }

    function closeModal() {
      if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        if (addForm) addForm.reset();
      }
    }

    if (addBtn) addBtn.addEventListener('click', openModal);
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    // Form Submission to Neon PostgreSQL
    if (addForm) {
      addForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('link-title')?.value.trim();
        const category = document.getElementById('link-category')?.value;
        const url = document.getElementById('link-url')?.value.trim();
        const previewImage = document.getElementById('link-preview')?.value.trim() || './carousel/image-1.webp';
        const description = document.getElementById('link-description')?.value.trim();
        const techStackRaw = document.getElementById('link-tech')?.value.trim();
        const badge = document.getElementById('link-badge')?.value.trim() || 'Live Production';

        if (!title || !url || !category) {
          alert('Please fill in Title, Category, and URL.');
          return;
        }

        const techStack = techStackRaw 
          ? techStackRaw.split(',').map(s => s.trim()).filter(Boolean)
          : ["React", "PostgreSQL"];

        const payload = {
          title,
          category,
          url,
          preview_image: previewImage,
          description,
          tech_stack: techStack,
          badge,
          status: 'Active'
        };

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving to Neon DB...';
        }

        try {
          const response = await fetch('/api/websites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            const resData = await response.json();
            if (resData.success && resData.data) {
              allWebsites.unshift(resData.data);
            } else {
              allWebsites.unshift({ id: Date.now(), ...payload });
            }
          } else {
            // Local fallback
            allWebsites.unshift({ id: Date.now(), ...payload });
          }

          closeModal();
          renderCards();

          // Scroll to the newly added item smoothly
          grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
          console.error('Error posting to database:', err);
          allWebsites.unshift({ id: Date.now(), ...payload });
          closeModal();
          renderCards();
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save & Publish Hyperlink';
          }
        }
      });
    }

    // Initial load
    loadWebsites();
  }

  // =========================================================================
  // UNIVERSAL LANDING PAGE LIGHTBOX & DOWNLOAD CONTROLLER
  // =========================================================================
  const lightboxModal = document.getElementById('landing-lightbox-modal');
  const lightboxImg = document.getElementById('landing-lightbox-img');
  const lightboxTitle = document.getElementById('landing-lightbox-title');
  const lightboxSub = document.getElementById('landing-lightbox-sub');
  const lightboxUrl = document.getElementById('landing-lightbox-url');
  const lightboxCloseBtn = document.getElementById('landing-lightbox-close');
  const lightboxExternalBtn = document.getElementById('landing-lightbox-external-btn');
  const lightboxDownloadBtn = document.getElementById('landing-lightbox-download-btn');

  window.openLandingLightbox = function(src, title = 'Project Preview', sub = 'Production Asset', externalUrl = '') {
    if (!lightboxModal || !lightboxImg) return;
    lightboxImg.src = src;
    if (lightboxTitle) lightboxTitle.textContent = title;
    if (lightboxSub) lightboxSub.textContent = sub;
    if (lightboxUrl) lightboxUrl.textContent = externalUrl || src;

    if (lightboxExternalBtn) {
      if (externalUrl && externalUrl !== '#') {
        lightboxExternalBtn.href = externalUrl.startsWith('http') ? externalUrl : `https://${externalUrl}`;
        lightboxExternalBtn.style.display = 'inline-flex';
      } else {
        lightboxExternalBtn.style.display = 'none';
      }
    }

    const filename = src.split('/').pop().split('?')[0] || 'project-asset.webp';
    if (lightboxDownloadBtn) {
      lightboxDownloadBtn.onclick = async (e) => {
        e.preventDefault();
        await downloadBlobImage(src, filename);
      };
    }

    lightboxModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  function closeLandingLightbox() {
    if (lightboxModal) {
      lightboxModal.classList.remove('active');
      document.body.style.overflow = '';
      if (lightboxImg) lightboxImg.src = '';
    }
  }

  async function downloadBlobImage(url, filename) {
    try {
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (err) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.click();
    }
  }

  if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLandingLightbox);
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLandingLightbox();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightboxModal && lightboxModal.classList.contains('active')) {
      closeLandingLightbox();
    }
  });

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
