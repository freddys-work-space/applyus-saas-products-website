/**
 * ApplyUS Admin Portal Client JavaScript
 * Handles Security Lockout (3 Attempts -> 60s cooldown), S3 Uploads, Neon PostgreSQL Management, Lightbox & WebP Downloads
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const loginView = document.getElementById('admin-login-view');
  const dashboardView = document.getElementById('admin-dashboard-view');
  const loginForm = document.getElementById('admin-login-form');
  const usernameInput = document.getElementById('admin-username');
  const passwordInput = document.getElementById('admin-password');
  const togglePwdBtn = document.getElementById('toggle-pwd-btn');
  const loginSubmitBtn = document.getElementById('login-submit-btn');
  const lockoutBanner = document.getElementById('lockout-banner');
  const lockoutSecondsSpan = document.getElementById('lockout-seconds');
  const loginErrorBanner = document.getElementById('login-error-banner');
  const errorMsg = document.getElementById('error-msg');
  const loggedAdminName = document.getElementById('logged-admin-name');
  const logoutBtn = document.getElementById('admin-logout-btn');

  // Tabs
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabPanes = document.querySelectorAll('.admin-tab-pane');

  // Forms & Containers
  const carouselForm = document.getElementById('carousel-upload-form');
  const carouselFileInput = document.getElementById('carousel-file');
  const carouselFileLabel = document.getElementById('carousel-file-label');
  const carouselList = document.getElementById('carousel-items-list');
  const carouselCount = document.getElementById('carousel-count');
  const refreshCarouselBtn = document.getElementById('refresh-carousel-btn');

  const websiteForm = document.getElementById('website-add-form');
  const webPreviewFileInput = document.getElementById('web-preview-file');
  const webPreviewUrlInput = document.getElementById('web-preview-url');
  const websitesList = document.getElementById('websites-items-list');
  const websitesCount = document.getElementById('websites-count');
  const refreshWebsitesBtn = document.getElementById('refresh-websites-btn');

  const bucketGrid = document.getElementById('bucket-objects-grid');
  const refreshBucketBtn = document.getElementById('refresh-bucket-btn');

  // Toast
  const toastEl = document.getElementById('admin-toast');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');

  // Lightbox Elements
  const lightboxModal = document.getElementById('admin-lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxSub = document.getElementById('lightbox-sub');
  const lightboxUrlText = document.getElementById('lightbox-url-text');
  const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
  const lightboxCopyBtn = document.getElementById('lightbox-copy-btn');
  const lightboxDownloadBtn = document.getElementById('lightbox-download-btn');

  let currentLightboxUrl = '';
  let lockoutTimerInterval = null;

  // 1. Password Visibility Toggle
  if (togglePwdBtn && passwordInput) {
    togglePwdBtn.addEventListener('click', () => {
      const isPwd = passwordInput.type === 'password';
      passwordInput.type = isPwd ? 'text' : 'password';
      togglePwdBtn.innerHTML = isPwd ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
    });
  }

  // 2. Lockout Countdown Controller
  function startLockoutTimer(seconds) {
    if (lockoutTimerInterval) clearInterval(lockoutTimerInterval);

    let remaining = seconds;
    lockoutBanner.style.display = 'flex';
    loginErrorBanner.style.display = 'none';
    loginSubmitBtn.disabled = true;
    usernameInput.disabled = true;
    passwordInput.disabled = true;

    lockoutSecondsSpan.textContent = `${remaining}s`;

    lockoutTimerInterval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(lockoutTimerInterval);
        lockoutTimerInterval = null;
        lockoutBanner.style.display = 'none';
        loginSubmitBtn.disabled = false;
        usernameInput.disabled = false;
        passwordInput.disabled = false;
        loginSubmitBtn.innerHTML = '<span class="btn-text"><i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to Admin Console</span>';
      } else {
        lockoutSecondsSpan.textContent = `${remaining}s`;
        loginSubmitBtn.innerHTML = `<i class="fa-solid fa-clock"></i> Locked (${remaining}s remaining)`;
      }
    }, 1000);
  }

  // 3. Login Submission with 3-Attempt Rate Limiting
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginErrorBanner.style.display = 'none';

      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      loginSubmitBtn.disabled = true;
      loginSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying credentials...';

      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Success
          localStorage.setItem('applyus_admin_token', data.token);
          localStorage.setItem('applyus_admin_user', data.username);
          showDashboard(data.username);
          showToast('Welcome, Administrator. Session authorized.');
        } else if (response.status === 429 || data.locked) {
          // Lockout triggered (3 failed attempts)
          startLockoutTimer(data.remainingSeconds || 60);
        } else {
          // Normal failed attempt
          loginSubmitBtn.disabled = false;
          loginSubmitBtn.innerHTML = '<span class="btn-text"><i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to Admin Console</span>';
          loginErrorBanner.style.display = 'flex';
          errorMsg.textContent = data.error || 'Invalid credentials. Please try again.';
        }
      } catch (err) {
        console.error('Login request error:', err);
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.innerHTML = '<span class="btn-text"><i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to Admin Console</span>';
        loginErrorBanner.style.display = 'flex';
        errorMsg.textContent = 'Server connection error. Please ensure server is running.';
      }
    });
  }

  // 4. Session Validation on Load
  async function checkExistingSession() {
    const token = localStorage.getItem('applyus_admin_token');
    const user = localStorage.getItem('applyus_admin_user') || 'admin';

    if (token) {
      try {
        const res = await fetch('/api/admin/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          showDashboard(user);
          return;
        }
      } catch (e) {}
      localStorage.removeItem('applyus_admin_token');
    }
    showLogin();
  }

  function showDashboard(username) {
    if (loginView) loginView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'flex';
    if (loggedAdminName) loggedAdminName.textContent = username;

    loadCarouselSlides();
    loadWebsiteHyperlinks();
    loadBucketObjects();
  }

  function showLogin() {
    if (dashboardView) dashboardView.style.display = 'none';
    if (loginView) loginView.style.display = 'flex';
  }

  // 5. Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('applyus_admin_token');
      localStorage.removeItem('applyus_admin_user');
      showLogin();
      showToast('Logged out successfully.', 'info');
    });
  }

  // 6. Tabs Controller
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // 7. Toast Notification Utility
  function showToast(msg, type = 'success') {
    if (!toastEl) return;
    toastMsg.textContent = msg;
    if (type === 'error') {
      toastEl.style.background = '#EF4444';
      toastIcon.className = 'fa-solid fa-circle-xmark';
    } else {
      toastEl.style.background = '#10B981';
      toastIcon.className = 'fa-solid fa-circle-check';
    }
    toastEl.style.display = 'flex';
    setTimeout(() => {
      toastEl.style.display = 'none';
    }, 3500);
  }

  // =========================================================================
  // UNIVERSAL IMAGE LIGHTBOX PREVIEW & DOWNLOAD CONTROLLER
  // =========================================================================
  function openLightbox(src, title = 'Image Preview', sub = 'Neon S3 Asset') {
    if (!lightboxModal || !lightboxImg) return;
    currentLightboxUrl = src;
    lightboxImg.src = src;
    if (lightboxTitle) lightboxTitle.textContent = title;
    if (lightboxSub) lightboxSub.textContent = sub;
    if (lightboxUrlText) lightboxUrlText.textContent = src;

    const filename = src.split('/').pop().split('?')[0] || 'image.webp';
    if (lightboxDownloadBtn) {
      lightboxDownloadBtn.setAttribute('download', filename);
      lightboxDownloadBtn.onclick = async (e) => {
        e.preventDefault();
        await downloadImageFile(src, filename);
      };
    }

    lightboxModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (lightboxModal) {
      lightboxModal.classList.remove('active');
      document.body.style.overflow = '';
      if (lightboxImg) lightboxImg.src = '';
    }
  }

  async function downloadImageFile(url, filename) {
    try {
      showToast('Downloading WebP image asset...', 'info');
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
      showToast('Image downloaded successfully!');
    } catch (err) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.click();
    }
  }

  if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightboxModal && lightboxModal.classList.contains('active')) {
      closeLightbox();
    }
  });

  if (lightboxCopyBtn) {
    lightboxCopyBtn.addEventListener('click', () => {
      if (currentLightboxUrl) {
        navigator.clipboard.writeText(currentLightboxUrl);
        showToast('Image URL copied to clipboard!');
      }
    });
  }

  // =========================================================================
  // CAROUSEL MANAGEMENT (Neon S3 Upload & PostgreSQL)
  // =========================================================================
  if (carouselFileInput && carouselFileLabel) {
    carouselFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        carouselFileLabel.textContent = `Selected: ${e.target.files[0].name} (${Math.round(e.target.files[0].size / 1024)} KB)`;
      }
    });
  }

  if (carouselForm) {
    carouselForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const file = carouselFileInput.files[0];
      const title = document.getElementById('carousel-title').value.trim();
      const tag = document.getElementById('carousel-tag').value.trim() || 'SAAS APPLICATION';
      const order = parseInt(document.getElementById('carousel-order').value, 10) || 1;
      const url = document.getElementById('carousel-url').value.trim() || 'app.applyus.io';
      const submitBtn = document.getElementById('carousel-submit-btn');

      if (!file || !title) {
        alert('Please choose an image file and enter a slide title.');
        return;
      }

      const formData = new FormData();
      formData.append('image', file);
      formData.append('title', title);
      formData.append('tag', tag);
      formData.append('display_order', order);
      formData.append('url', url);
      formData.append('target', 'carousel');

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Converting to WebP & uploading to Neon S3...';

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        if (response.ok && result.success) {
          showToast(`Image converted to WebP & registered in Neon DB!`);
          carouselForm.reset();
          carouselFileLabel.textContent = 'Click or Drag & Drop image here (.webp, .png, .jpg)';
          loadCarouselSlides();
          loadBucketObjects();
        } else {
          alert('Upload failed: ' + (result.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('Error uploading carousel slide:', err);
        alert('Error communicating with server.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload to S3 & Add to Carousel';
      }
    });
  }

  async function loadCarouselSlides() {
    if (!carouselList) return;
    carouselList.innerHTML = '<div class="spinner-state"><i class="fa-solid fa-spinner fa-spin"></i> Loading slides from Neon DB...</div>';

    try {
      const res = await fetch('/api/carousel');
      const data = await res.json();

      if (res.ok && data.success) {
        const items = data.data || [];
        if (carouselCount) carouselCount.textContent = items.length;

        if (items.length === 0) {
          carouselList.innerHTML = '<div class="spinner-state">No carousel slides found in Neon DB.</div>';
          return;
        }

        carouselList.innerHTML = '';
        items.forEach(item => {
          const row = document.createElement('div');
          row.className = 'item-row-card';
          row.innerHTML = `
            <div class="item-left" title="Click to Preview Full Image">
              <div class="item-thumb-wrap">
                <img src="${item.image_url}" alt="${item.title}" class="item-thumb" onerror="this.src='./carousel/image-1.webp'" />
                <span class="thumb-preview-badge"><i class="fa-solid fa-magnifying-glass-plus"></i></span>
              </div>
              <div class="item-info">
                <span class="item-title">${item.title}</span>
                <div class="item-meta">
                  <span class="tag-badge">${item.tag || 'SHOWCASE'}</span>
                  <span>Order: #${item.display_order || 0}</span>
                  <span><i class="fa-solid fa-link"></i> ${item.project_url || '#'}</span>
                </div>
              </div>
            </div>
            <div class="item-actions">
              <button class="action-btn-preview" title="Preview & Download Image">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button class="action-btn-del" title="Delete from Database" data-id="${item.id}">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          `;

          // Preview handlers
          row.querySelector('.item-left').addEventListener('click', () => {
            openLightbox(item.image_url, item.title, `Slide #${item.display_order || 1} • ${item.tag || 'Carousel Asset'}`);
          });
          row.querySelector('.action-btn-preview').addEventListener('click', () => {
            openLightbox(item.image_url, item.title, `Slide #${item.display_order || 1} • ${item.tag || 'Carousel Asset'}`);
          });

          // Delete handler
          row.querySelector('.action-btn-del').addEventListener('click', async () => {
            if (confirm(`Delete slide "${item.title}" from Neon DB?`)) {
              await deleteCarouselSlide(item.id);
            }
          });

          carouselList.appendChild(row);
        });
      }
    } catch (err) {
      console.error('Error loading carousel slides:', err);
      carouselList.innerHTML = '<div class="spinner-state">Failed to load slides from Neon PostgreSQL.</div>';
    }
  }

  async function deleteCarouselSlide(id) {
    try {
      const res = await fetch(`/api/carousel/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Carousel slide deleted from Neon DB.');
        loadCarouselSlides();
      }
    } catch (e) {
      alert('Failed to delete slide.');
    }
  }

  if (refreshCarouselBtn) refreshCarouselBtn.addEventListener('click', loadCarouselSlides);


  // =========================================================================
  // LIVE WEBSITES DIRECTORY MANAGEMENT
  // =========================================================================
  if (webPreviewFileInput) {
    webPreviewFileInput.addEventListener('change', async (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('image', file);

        showToast('Converting to WebP & uploading to Neon S3...', 'info');

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          const json = await res.json();
          if (res.ok && json.url) {
            webPreviewUrlInput.value = json.url;
            showToast('Preview image converted to WebP & stored in Neon S3!');
          }
        } catch (err) {
          alert('Failed to upload image file.');
        }
      }
    });
  }

  if (websiteForm) {
    websiteForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('web-title').value.trim();
      const category = document.getElementById('web-category').value;
      const badge = document.getElementById('web-badge').value.trim() || 'Live Production';
      const url = document.getElementById('web-url').value.trim();
      const previewImage = document.getElementById('web-preview-url').value.trim() || './carousel/image-1.webp';
      const techStackRaw = document.getElementById('web-tech').value.trim();
      const description = document.getElementById('web-desc').value.trim();
      const submitBtn = document.getElementById('web-submit-btn');

      if (!title || !url) {
        alert('Please fill in Title and URL.');
        return;
      }

      const techStack = techStackRaw 
        ? techStackRaw.split(',').map(s => s.trim()).filter(Boolean)
        : ['React', 'PostgreSQL'];

      const payload = {
        title,
        category,
        badge,
        url,
        preview_image: previewImage,
        tech_stack: techStack,
        description,
        status: 'Active'
      };

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving to Neon DB...';

      try {
        const res = await fetch('/api/websites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast(`Website hyperlink "${title}" published to Neon PostgreSQL!`);
          websiteForm.reset();
          loadWebsiteHyperlinks();
        } else {
          alert('Failed to save website: ' + (data.error || ''));
        }
      } catch (err) {
        console.error('Error adding website:', err);
        alert('Error connecting to server.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Publish Website Hyperlink';
      }
    });
  }

  async function loadWebsiteHyperlinks() {
    if (!websitesList) return;
    websitesList.innerHTML = '<div class="spinner-state"><i class="fa-solid fa-spinner fa-spin"></i> Loading websites from Neon DB...</div>';

    try {
      const res = await fetch('/api/websites');
      const data = await res.json();

      if (res.ok && data.success) {
        const items = data.data || [];
        if (websitesCount) websitesCount.textContent = items.length;

        if (items.length === 0) {
          websitesList.innerHTML = '<div class="spinner-state">No website hyperlinks found in Neon DB.</div>';
          return;
        }

        websitesList.innerHTML = '';
        items.forEach(site => {
          const row = document.createElement('div');
          row.className = 'item-row-card';

          const techList = Array.isArray(site.tech_stack) ? site.tech_stack.join(', ') : (site.tech_stack || '');

          row.innerHTML = `
            <div class="item-left" title="Click to Preview Image">
              <div class="item-thumb-wrap">
                <img src="${site.preview_image || './carousel/image-1.webp'}" alt="${site.title}" class="item-thumb" onerror="this.src='./carousel/image-1.webp'" />
                <span class="thumb-preview-badge"><i class="fa-solid fa-magnifying-glass-plus"></i></span>
              </div>
              <div class="item-info">
                <span class="item-title">${site.title}</span>
                <div class="item-meta">
                  <span class="tag-badge">${site.category || 'SaaS'}</span>
                  <span><a href="${site.url}" target="_blank" style="color: var(--admin-blue); text-decoration: none; font-weight: 600;"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${site.url}</a></span>
                  <span>${techList}</span>
                </div>
              </div>
            </div>
            <div class="item-actions">
              <button class="action-btn-preview" title="Preview & Download Image">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button class="action-btn-del" title="Delete Website Link" data-id="${site.id}">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          `;

          // Preview handlers
          row.querySelector('.item-left').addEventListener('click', () => {
            openLightbox(site.preview_image || './carousel/image-1.webp', site.title, `${site.category} • ${site.badge || 'Live Production'}`);
          });
          row.querySelector('.action-btn-preview').addEventListener('click', () => {
            openLightbox(site.preview_image || './carousel/image-1.webp', site.title, `${site.category} • ${site.badge || 'Live Production'}`);
          });

          // Delete handler
          row.querySelector('.action-btn-del').addEventListener('click', async () => {
            if (confirm(`Delete website link "${site.title}"?`)) {
              await deleteWebsiteHyperlink(site.id);
            }
          });

          websitesList.appendChild(row);
        });
      }
    } catch (err) {
      console.error('Error loading websites:', err);
      websitesList.innerHTML = '<div class="spinner-state">Failed to load websites from Neon PostgreSQL.</div>';
    }
  }

  async function deleteWebsiteHyperlink(id) {
    try {
      const res = await fetch(`/api/websites/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Website hyperlink deleted from Neon DB.');
        loadWebsiteHyperlinks();
      }
    } catch (e) {
      alert('Failed to delete website.');
    }
  }

  if (refreshWebsitesBtn) refreshWebsitesBtn.addEventListener('click', loadWebsiteHyperlinks);


  // =========================================================================
  // NEON S3 BUCKET EXPLORER
  // =========================================================================
  async function loadBucketObjects() {
    if (!bucketGrid) return;
    bucketGrid.innerHTML = '<div class="spinner-state"><i class="fa-solid fa-spinner fa-spin"></i> Querying Neon S3 Bucket...</div>';

    try {
      const res = await fetch('/api/bucket/carousel');
      const data = await res.json();

      if (res.ok && data.success) {
        const images = data.images || [];

        if (images.length === 0) {
          bucketGrid.innerHTML = '<div class="spinner-state">No objects currently in Neon bucket "carousel".</div>';
          return;
        }

        bucketGrid.innerHTML = '';
        images.forEach(obj => {
          const card = document.createElement('div');
          card.className = 'bucket-object-card';
          const sizeKb = obj.size ? Math.round(obj.size / 1024) : 0;

          card.innerHTML = `
            <div class="bucket-img-wrap" title="Click to Preview Full High-Res Image">
              <img src="${obj.url}" alt="${obj.key}" class="bucket-img" loading="lazy" onerror="this.src='./carousel/image-1.webp'" />
              <div class="bucket-preview-overlay">
                <i class="fa-solid fa-magnifying-glass-plus"></i> Click to View
              </div>
            </div>
            <div class="bucket-card-body">
              <span class="bucket-key" title="${obj.key}">${obj.key}</span>
              <span class="bucket-size">${sizeKb} KB</span>
              <div class="bucket-card-actions">
                <button class="copy-url-btn" data-url="${obj.url}">
                  <i class="fa-regular fa-copy"></i> Copy
                </button>
                <button class="download-direct-btn" data-url="${obj.url}" data-name="${obj.key}">
                  <i class="fa-solid fa-download"></i> Download
                </button>
              </div>
            </div>
          `;

          // Click image to preview in Lightbox
          card.querySelector('.bucket-img-wrap').addEventListener('click', () => {
            openLightbox(obj.url, obj.key, `Neon S3 Bucket Asset • ${sizeKb} KB`);
          });

          card.querySelector('.copy-url-btn').addEventListener('click', (e) => {
            navigator.clipboard.writeText(obj.url);
            showToast(`Copied S3 URL: ${obj.key}`);
            const btn = e.currentTarget;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            setTimeout(() => {
              btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
            }, 2000);
          });

          card.querySelector('.download-direct-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            await downloadImageFile(obj.url, obj.key);
          });

          bucketGrid.appendChild(card);
        });
      }
    } catch (err) {
      console.error('Error fetching bucket objects:', err);
      bucketGrid.innerHTML = '<div class="spinner-state">Failed to load objects from Neon S3 bucket.</div>';
    }
  }

  if (refreshBucketBtn) refreshBucketBtn.addEventListener('click', loadBucketObjects);

  // Initialize session check
  checkExistingSession();
});
