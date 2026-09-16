(() => {
  const pages = {
    home: 'homepage/code.html',
    interior: 'interior/code.html',
    eksterior: 'eksterior/code.html',
    portfolio: 'portofolio/code.html',
    'cara-pemesanan': 'cara-pemesanan/code.html',
    kontak: 'kontak/code.html',
    'portofolio-detail': 'portofolio-detail/code.html'
  };

  const folder = window.location.pathname.split('/').filter(Boolean).slice(-2, -1)[0];
  const currentPage = folder === 'portofolio-detail' ? 'portfolio' :
    folder === 'portofolio' ? 'portfolio' : folder || 'home';

  document.querySelectorAll('nav [data-path]').forEach((link) => {
    const active = link.dataset.path === currentPage;
    link.classList.toggle('text-primary', active);
    link.classList.toggle('font-bold', active);
    link.classList.toggle('text-on-surface-variant', !active);
    link.setAttribute('aria-current', active ? 'page' : 'false');
  });

  const header = document.querySelector('header');
  const desktopNav = header?.querySelector('nav');
  const headerInner = desktopNav?.parentElement;

  const responsiveStyle = document.createElement('style');
  responsiveStyle.textContent = `
    html, body {
      max-width: 100%;
      width: 100%;
      height: auto !important;
      min-height: 100%;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      overscroll-behavior-y: auto !important;
    }
    body { position: static !important; touch-action: pan-y; -webkit-overflow-scrolling: touch; }
    main { height: auto !important; min-height: 100vh; }
    img, video, svg { max-width: 100%; }
    @media (max-width: 1023px) {
      header .mobile-nav a { width: 100%; }
      header .mobile-nav {
        display: block;
        position: fixed;
        top: 80px;
        right: 0;
        left: auto;
        width: min(52vw, 340px);
        max-width: 340px;
        height: calc(100dvh - 80px);
        overflow-y: auto;
        z-index: 60;
        border-radius: 16px 0 0 16px;
        transform: translateX(100%);
        transition: transform 240ms ease;
      }
      header .mobile-nav.is-open { transform: translateX(0); }
      main > div > section:first-child { padding-top: 24px !important; }
      main { padding-top: 0 !important; }
    }
    @media (min-width: 1024px) {
      header .mobile-nav { display: none !important; }
    }
  `;
  document.head.appendChild(responsiveStyle);

  if (header && desktopNav && headerInner) {
    header.classList.add('relative');

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl text-on-surface hover:bg-surface-container transition-colors';
    toggle.setAttribute('aria-label', 'Buka menu navigasi');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span class="material-symbols-outlined">menu</span>';

    const menu = document.createElement('div');
    menu.className = 'mobile-nav lg:hidden bg-surface-container-lowest border border-surface-variant p-3 shadow-lg';
    menu.setAttribute('aria-label', 'Navigasi mobile');
    desktopNav.querySelectorAll('[data-path]').forEach((link) => {
      const item = link.cloneNode(true);
      item.className = 'flex items-center min-h-11 px-3 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors';
      if (item.dataset.path === currentPage) item.classList.add('text-primary', 'font-bold', 'bg-surface-container');
      item.removeAttribute('aria-current');
      menu.appendChild(item);
    });
    const consultation = headerInner.querySelector('[data-path="konsultasi"]');
    if (consultation) {
      const item = consultation.cloneNode(true);
      item.className = 'flex items-center justify-center min-h-11 px-3 mt-2 rounded-lg bg-primary-container text-on-primary font-semibold';
      menu.appendChild(item);
    }

    const closeMenu = () => {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Buka menu navigasi');
      toggle.innerHTML = '<span class="material-symbols-outlined">menu</span>';
    };

    toggle.addEventListener('click', () => {
      const isOpen = menu.classList.contains('is-open');
      if (isOpen) closeMenu();
      else {
        menu.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Tutup menu navigasi');
        toggle.innerHTML = '<span class="material-symbols-outlined">close</span>';
      }
    });
    menu.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });

    toggle.classList.add('mobile-nav-toggle');
    headerInner.appendChild(toggle);
    header.appendChild(menu);
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-path]');
    if (!link) return;
    const path = link.dataset.path;
    if (path === 'konsultasi') {
      event.preventDefault();
      window.open('https://wa.me/6281289001234', '_blank', 'noopener');
      return;
    }
    if (pages[path]) {
      event.preventDefault();
      window.location.href = `../${pages[path]}`;
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('[data-path][role="link"]');
    if (!card) return;
    event.preventDefault();
    card.click();
  });
})();
