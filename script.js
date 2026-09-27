document.addEventListener("DOMContentLoaded", function() {
    const links = document.querySelectorAll("nav ul li a");
    const sections = document.querySelectorAll("section");
    const navLi = document.querySelectorAll("nav ul li");
    const projectCards = document.querySelectorAll(".project-card");
    const resumeLink = document.getElementById('resume-link');
    const achievementsLink = document.getElementById('achievements-link');
    const certificationsLink = document.getElementById('certifications-link');
    const awardLink = document.getElementById('award-link');
    const licensesLink = document.getElementById('licenses-link');
    const sunyCertificateLink = document.getElementById('suny-certificate-link');
    const infoLink = document.getElementById('info-link');
    const modal = document.getElementById('resume-modal');
    const achievementsModal = document.getElementById('achievements-modal');
    const achievementDisplayModal = document.getElementById('achievement-display-modal');
    const infoModal = document.getElementById('info-modal');
    const closeBtns = document.querySelectorAll('.close-btn');
    const logo = document.getElementById('logo');
    const moreLink = document.getElementById('more-link');
    const achievementIframe = document.querySelector('.achievement-iframe');
    const achievementDisplayCloseBtn = document.getElementById('achievement-display-close-btn');
    const orionClientFlip = document.querySelector('.orion-client-flip');
    const orionEntry = document.querySelector('.orion-entry');
    const orionDynamicLogo = document.querySelector('.orion-dynamic-logo');
    const experienceEntries = document.querySelectorAll('.experience-entry');
    const navHamburger = document.getElementById('nav-hamburger');
    const navMenu = document.getElementById('nav-menu');
    const navOverlay = document.getElementById('nav-overlay');
    const dropdownLi = document.querySelector('nav li.dropdown');

    function isMobileNavLayout() {
        return window.matchMedia('(max-width: 900px)').matches;
    }

    function closeMobileNav() {
        if (!navHamburger || !navMenu || !navOverlay) {
            return;
        }
        navHamburger.classList.remove('is-open');
        navHamburger.setAttribute('aria-expanded', 'false');
        navHamburger.setAttribute('aria-label', 'Open menu');
        navMenu.classList.remove('is-open');
        navOverlay.classList.remove('is-open');
        navOverlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('nav-drawer-open');
        if (dropdownLi) {
            dropdownLi.classList.remove('mobile-open');
        }
        if (moreLink) {
            moreLink.classList.remove('flipped');
        }
    }

    function openMobileNav() {
        if (!navHamburger || !navMenu || !navOverlay) {
            return;
        }
        navHamburger.classList.add('is-open');
        navHamburger.setAttribute('aria-expanded', 'true');
        navHamburger.setAttribute('aria-label', 'Close menu');
        navMenu.classList.add('is-open');
        navOverlay.classList.add('is-open');
        navOverlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('nav-drawer-open');
    }

    function toggleMobileNav() {
        if (!navMenu || !navMenu.classList.contains('is-open')) {
            openMobileNav();
        } else {
            closeMobileNav();
        }
    }

    if (navHamburger && navMenu && navOverlay) {
        navHamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMobileNav();
        });
        navOverlay.addEventListener('click', closeMobileNav);
        window.addEventListener('resize', function() {
            if (!isMobileNavLayout()) {
                closeMobileNav();
            }
        });
    }

    if (moreLink && dropdownLi) {
        moreLink.addEventListener('click', function(e) {
            if (!isMobileNavLayout()) {
                return;
            }
            e.preventDefault();
            const open = !dropdownLi.classList.contains('mobile-open');
            dropdownLi.classList.toggle('mobile-open', open);
            moreLink.classList.toggle('flipped', open);
        });
    }

    // Smooth scrolling
    links.forEach(link => {
        link.addEventListener("click", function(e) {
            const href = this.getAttribute("href");
            if (!href || href === "#" || !href.startsWith("#")) {
                return;
            }

            e.preventDefault();
            const target = document.querySelector(href);
            if (!target) {
                return;
            }

            window.scrollTo({
                top: target.offsetTop - 70,
                behavior: 'smooth'
            });
            if (isMobileNavLayout()) {
                closeMobileNav();
            }
        });
    });

    // Highlighting navigation links on scroll
    window.addEventListener("scroll", () => {
        let current = "";
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 60;
            if (window.pageYOffset >= sectionTop) {
                current = section.getAttribute("id");
            }
        });

        // Check if the user is at the bottom of the page
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
            current = sections[sections.length - 1].getAttribute("id");
        }

        navLi.forEach(li => {
            li.classList.remove("active");
            if (li.querySelector("a").getAttribute("href").substring(1) === current) {
                li.classList.add("active");
            }
        });
    });

    // Trigger project card animations on scroll using Intersection Observer API.
    // threshold: 0.1 ensures cards animate in as soon as 10% is visible (critical
    // on mobile where cards are taller than the viewport). One-time animation: unobserve
    // after triggering so cards don't disappear again when scrolling back up.
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('slide-in');
                obs.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion && projectCards.length) {
        // Mark container so CSS can apply the hidden initial state only when JS is active
        document.querySelector('.projects-container').classList.add('js-animate');
        projectCards.forEach(card => observer.observe(card));
    }

    // Epilogue scatter-settle animation (re-triggers on scroll up/down)
    const epilogue = document.querySelector('.cs-epilogue');
    if (epilogue) {
        const epilogueObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    epilogue.classList.add('is-visible');
                } else {
                    epilogue.classList.remove('is-visible');
                }
            });
        }, { threshold: 0.3 });
        epilogueObserver.observe(epilogue);
    }

    // Trigger one-time logo spin when each experience item enters viewport.
    const experienceObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.35 });

    experienceEntries.forEach(item => {
        experienceObserver.observe(item);
    });

    const scrollReveals = document.querySelectorAll('#skills .scroll-reveal, #approach .scroll-reveal, #experience .scroll-reveal, #projects .scroll-reveal, #writing .scroll-reveal, #contact .scroll-reveal');
    if (!prefersReducedMotion && scrollReveals.length) {
        document.body.classList.add('js-scroll-headings');
        const revealObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-inview');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                scrollReveals.forEach(item => revealObserver.observe(item));
            });
        });
    }

    // Theme switcher
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
    });

    // About Me section animations
    const aboutSection = document.querySelector('#about');
    const aboutContent = aboutSection ? aboutSection.querySelector('.about-content') : null;
    const debugAboutObserver = false;

    if (aboutSection && aboutContent) {
        // Keep "Hello!" visible on initial page load until About enters enough.
        // If reduced motion is preferred, skip the scroll-driven animation entirely.
        aboutSection.style.setProperty('--about-shift', prefersReducedMotion ? '1' : '0');
        aboutSection.classList.remove('about-transition-active');
        let isAboutTitleShifted = false;

        const getShiftProgress = (entry) => {
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const startY = viewportHeight * 0.66; // Start a bit earlier.
            const endY = viewportHeight * 0.32;   // Spread transition over longer scroll distance.
            const top = entry.boundingClientRect.top;

            // If About is below the trigger zone, keep initial greeting visible.
            if (!entry.isIntersecting && top > startY) {
                return 0;
            }

            const raw = (startY - top) / (startY - endY);
            return Math.max(0, Math.min(1, raw));
        };

        const aboutObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const shift = getShiftProgress(entry);

                if (debugAboutObserver) {
                    console.log('About observer fired:', {
                        ratio: entry.intersectionRatio,
                        isIntersecting: entry.isIntersecting,
                        top: Math.round(entry.boundingClientRect.top),
                        shift
                    });
                }

                aboutSection.style.setProperty('--about-shift', shift.toFixed(3));
                // Add hysteresis so the title does not flicker/jump while reversing scroll near the boundary.
                if (!isAboutTitleShifted && shift >= 0.46) {
                    isAboutTitleShifted = true;
                } else if (isAboutTitleShifted && shift <= 0.34) {
                    isAboutTitleShifted = false;
                }

                aboutSection.classList.toggle('about-transition-active', isAboutTitleShifted);
            });
        }, {
            // Dense thresholds = smoother observer callbacks during scroll.
            threshold: Array.from({ length: 21 }, (_, i) => i / 20),
            rootMargin: '0px 0px -10% 0px'
        });

        aboutObserver.observe(aboutContent);
    }

    // Scroll lock helpers — prevent underlying page from scrolling while any modal is open
    function lockScroll() {
        document.body.classList.add('modal-open');
    }
    function unlockScroll() {
        document.body.classList.remove('modal-open');
    }

    // Modal functionality
    resumeLink.addEventListener('click', function(e) {
        e.preventDefault();
        modal.style.display = 'block';
        lockScroll();
        closeMobileNav();
    });

    achievementsLink.addEventListener('click', function(e) {
        e.preventDefault();
        achievementsModal.style.display = 'block';
        lockScroll();
        closeMobileNav();
    });

    certificationsLink.addEventListener('click', function(e) {
        e.preventDefault();
        achievementIframe.src = 'documents/Azure.pdf';
        achievementsModal.style.display = 'none';
        achievementDisplayModal.style.display = 'block';
        // scroll stays locked — still inside a modal
    });

    awardLink.addEventListener('click', function(e) {
        e.preventDefault();
        achievementIframe.src = 'documents/Award.pdf';
        achievementsModal.style.display = 'none';
        achievementDisplayModal.style.display = 'block';
    });

    licensesLink.addEventListener('click', function(e) {
        e.preventDefault();
        achievementIframe.src = 'documents/licenses.png';
        achievementsModal.style.display = 'none';
        achievementDisplayModal.style.display = 'block';
    });

    sunyCertificateLink.addEventListener('click', function(e) {
        e.preventDefault();
        achievementIframe.src = 'documents/Summer BootCamp.JPG';
        achievementsModal.style.display = 'none';
        achievementDisplayModal.style.display = 'block';
    });

    infoLink.addEventListener('click', function(e) {
        e.preventDefault();
        infoModal.style.display = 'block';
        lockScroll();
        closeMobileNav();
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (this === achievementDisplayCloseBtn) {
                // Going back to the achievements list — still in a modal, keep scroll locked
                achievementDisplayModal.style.display = 'none';
                achievementsModal.style.display = 'block';
            } else {
                modal.style.display = 'none';
                achievementsModal.style.display = 'none';
                achievementDisplayModal.style.display = 'none';
                infoModal.style.display = 'none';
                unlockScroll();
            }
        });
    });

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            unlockScroll();
        }
        if (event.target === achievementsModal) {
            achievementsModal.style.display = 'none';
            unlockScroll();
        }
        if (event.target === achievementDisplayModal) {
            // Going back to achievements list — still in a modal, keep scroll locked
            achievementDisplayModal.style.display = 'none';
            achievementsModal.style.display = 'block';
        }
        if (event.target === infoModal) {
            infoModal.style.display = 'none';
            unlockScroll();
        }
    });

    // Logo click event to refresh the page
    logo.addEventListener('click', function(e) {
        e.preventDefault();
        location.reload();
    });

    // Flip the triangle icon on hover
    moreLink.addEventListener('mouseover', function(e) {
        e.preventDefault();
        this.classList.add('flipped');
    });

    moreLink.addEventListener('mouseout', function(e) {
        e.preventDefault();
        this.classList.remove('flipped');
    });

    // Orion card: PwC first, reveal Orion only after 2s hover/focus on this card.
    if (orionEntry && orionDynamicLogo && orionClientFlip) {
        let revealTimer = null;
        let revertTimer = null;
        let hasRunThisHover = false;
        const frontLogo = orionDynamicLogo.dataset.frontLogo;
        const backLogo = orionDynamicLogo.dataset.backLogo;
        const revealDelayMs = 2200;
        const holdOrionMs = 2000;

        const swapLogo = (toBack) => {
            orionDynamicLogo.classList.remove('logo-swap-spin');
            // Reflow to reliably replay the spin animation each swap.
            void orionDynamicLogo.offsetWidth;
            orionDynamicLogo.classList.add('logo-swap-spin');
            orionDynamicLogo.src = toBack ? backLogo : frontLogo;
            orionDynamicLogo.alt = toBack ? 'Orion Innovation Logo' : 'PwC Logo';
        };

        const showOrion = () => {
            if (orionEntry.classList.contains('show-orion')) {
                return;
            }
            orionEntry.classList.add('show-orion');
            swapLogo(true);
        };

        const showPwC = () => {
            if (!orionEntry.classList.contains('show-orion')) {
                orionDynamicLogo.src = frontLogo;
                orionDynamicLogo.alt = 'PwC Logo';
                return;
            }
            orionEntry.classList.remove('show-orion');
            swapLogo(false);
        };

        const runSingleCycle = () => {
            clearTimeout(revealTimer);
            clearTimeout(revertTimer);

            revealTimer = setTimeout(() => {
                showOrion();
                revertTimer = setTimeout(() => {
                    showPwC();
                }, holdOrionMs);
            }, revealDelayMs);
        };

        const beginCardInteraction = () => {
            if (hasRunThisHover) {
                return;
            }
            hasRunThisHover = true;
            runSingleCycle();
        };

        const endCardInteraction = () => {
            clearTimeout(revealTimer);
            clearTimeout(revertTimer);
            hasRunThisHover = false;
            showPwC();
        };

        orionEntry.addEventListener('mouseenter', beginCardInteraction);
        orionEntry.addEventListener('mouseleave', endCardInteraction);
        orionEntry.addEventListener('focusin', beginCardInteraction);
        orionEntry.addEventListener('focusout', (event) => {
            if (!orionEntry.contains(event.relatedTarget)) {
                endCardInteraction();
            }
        });

        // Touch support: tap the card on mobile to trigger the timed PwC → Orion reveal
        orionEntry.addEventListener('touchstart', function() {
            beginCardInteraction();
        }, { passive: true });

        // Allow keyboard users to trigger the timed reveal flow.
        orionClientFlip.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                beginCardInteraction();
            }
        });
    }

    // ---- Glimpse scatter gallery ----
    const glimpseToggle = document.getElementById('glimpse-toggle');
    const glimpseBodyEl = document.getElementById('glimpse-body');

    if (glimpseToggle && glimpseBodyEl) {
        const glimpseSection = glimpseToggle.closest('.glimpse-section');
        let glimpseHoverTimer = null;

        function setGlimpseOpen(open) {
            glimpseToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            glimpseBodyEl.classList.toggle('collapsed', !open);
        }

        glimpseToggle.addEventListener('click', function() {
            clearTimeout(glimpseHoverTimer);
            const expanded = glimpseToggle.getAttribute('aria-expanded') === 'true';
            setGlimpseOpen(!expanded);
        });

        const canHoverOpen = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        if (glimpseSection && canHoverOpen) {
            glimpseSection.addEventListener('mouseenter', function() {
                clearTimeout(glimpseHoverTimer);
                if (glimpseToggle.getAttribute('aria-expanded') === 'true') {
                    return;
                }
                glimpseHoverTimer = setTimeout(function() {
                    setGlimpseOpen(true);
                }, 1000);
            });
            glimpseSection.addEventListener('mouseleave', function() {
                clearTimeout(glimpseHoverTimer);
                glimpseHoverTimer = null;
                const lightboxOpen = glimpseLightbox && glimpseLightbox.classList.contains('open');
                if (!lightboxOpen) {
                    setGlimpseOpen(false);
                }
            });
        }
    }

    const glimpsePhotos = Array.from(document.querySelectorAll('.glimpse-photo'));
    const glimpseLightbox = document.getElementById('glimpse-lightbox');
    const glimpseLbImg = document.getElementById('glimpse-lb-img');
    const glimpseLbCaption = document.getElementById('glimpse-lb-caption');
    const glimpseLbClose = document.getElementById('glimpse-lb-close');
    const glimpseLbPrev = document.getElementById('glimpse-lb-prev');
    const glimpseLbNext = document.getElementById('glimpse-lb-next');
    const glimpseLbPrevMob = document.getElementById('glimpse-lb-prev-mob');
    const glimpseLbNextMob = document.getElementById('glimpse-lb-next-mob');
    let glimpseActiveIdx = 0;

    function syncGlimpseLbNav() {
        const atStart = glimpseActiveIdx === 0;
        const atEnd = glimpseActiveIdx === glimpsePhotos.length - 1;
        if (glimpseLbPrev) glimpseLbPrev.disabled = atStart;
        if (glimpseLbNext) glimpseLbNext.disabled = atEnd;
        if (glimpseLbPrevMob) glimpseLbPrevMob.disabled = atStart;
        if (glimpseLbNextMob) glimpseLbNextMob.disabled = atEnd;
    }

    function openGlimpse(idx) {
        glimpseActiveIdx = idx;
        const btn = glimpsePhotos[idx];
        glimpseLbImg.src = btn.dataset.src;
        glimpseLbImg.alt = btn.querySelector('img').alt;
        glimpseLbCaption.textContent = btn.dataset.caption || '';
        syncGlimpseLbNav();
        glimpseLightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
        glimpseLbClose.focus();
    }

    function closeGlimpse() {
        glimpseLightbox.classList.remove('open');
        document.body.style.overflow = '';
        if (glimpsePhotos[glimpseActiveIdx]) glimpsePhotos[glimpseActiveIdx].focus();
    }

    function stepGlimpse(dir) {
        const next = glimpseActiveIdx + dir;
        if (next >= 0 && next < glimpsePhotos.length) openGlimpse(next);
    }

    glimpsePhotos.forEach(function(btn, i) {
        btn.addEventListener('click', function() { openGlimpse(i); });
    });

    if (glimpseLbClose) glimpseLbClose.addEventListener('click', closeGlimpse);
    if (glimpseLbPrev) glimpseLbPrev.addEventListener('click', function() { stepGlimpse(-1); });
    if (glimpseLbNext) glimpseLbNext.addEventListener('click', function() { stepGlimpse(1); });
    if (glimpseLbPrevMob) glimpseLbPrevMob.addEventListener('click', function() { stepGlimpse(-1); });
    if (glimpseLbNextMob) glimpseLbNextMob.addEventListener('click', function() { stepGlimpse(1); });

    if (glimpseLightbox) {
        glimpseLightbox.addEventListener('click', function(e) {
            if (e.target === glimpseLightbox) closeGlimpse();
        });
    }

    document.addEventListener('keydown', function(e) {
        if (!glimpseLightbox || !glimpseLightbox.classList.contains('open')) return;
        if (e.key === 'Escape') closeGlimpse();
        if (e.key === 'ArrowLeft') stepGlimpse(-1);
        if (e.key === 'ArrowRight') stepGlimpse(1);
    });

    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Escape' || !navMenu || !navMenu.classList.contains('is-open')) {
            return;
        }
        closeMobileNav();
    });

    const mediumFeedEl = document.getElementById('medium-feed');
    const mediumProfileUrl = (mediumFeedEl && mediumFeedEl.getAttribute('data-medium-profile')) || '';
    const mediumApiUrl = (mediumFeedEl && mediumFeedEl.getAttribute('data-medium-api')) || '/api/medium';
    const MEDIUM_FETCH_TIMEOUT_MS = 8000;
    let mediumFeedRequest = null;

    function sanitizeOrNormalizeUrl(value) {
        try {
            const url = new URL(String(value || '').trim());
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                return '';
            }
            return url.toString();
        } catch {
            return '';
        }
    }

    function truncateExcerpt(text, maxLength) {
        const normalized = String(text || '').replace(/\s+/g, ' ').trim();
        if (normalized.length <= maxLength) {
            return normalized;
        }
        const slice = normalized.slice(0, maxLength);
        const lastSpace = slice.lastIndexOf(' ');
        const clipped = lastSpace > 80 ? slice.slice(0, lastSpace) : slice;
        return clipped.replace(/[.,;:!?-]+$/, '') + '…';
    }

    function formatMediumDate(value) {
        const parsed = Date.parse(value);
        if (Number.isNaN(parsed)) {
            return '';
        }
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(parsed);
    }

    function mediumProfileHref(profileUrl) {
        return sanitizeOrNormalizeUrl(profileUrl) || mediumProfileUrl;
    }

    function createMediumProfileLink(profileUrl, label) {
        const href = mediumProfileHref(profileUrl);
        if (!href) {
            const text = document.createElement('span');
            text.textContent = label;
            return text;
        }
        const link = document.createElement('a');
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = label;
        return link;
    }

    function ensureMediumStatus() {
        let status = mediumFeedEl.querySelector('.writing-feed-status');
        if (!status) {
            status = document.createElement('p');
            status.className = 'writing-feed-status';
            mediumFeedEl.prepend(status);
        }
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        return status;
    }

    function showMediumLoadingState() {
        if (!mediumFeedEl) {
            return;
        }
        const status = ensureMediumStatus();
        status.dataset.state = 'loading';
        status.textContent = 'Loading Medium articles…';
        mediumFeedEl.setAttribute('aria-busy', 'true');
    }

    function showMediumRefreshWarning(profileUrl) {
        if (!mediumFeedEl) {
            return;
        }
        const fallback = mediumFeedEl.querySelector('.writing-medium-fallback');
        if (fallback) {
            fallback.hidden = false;
        }
        mediumFeedEl.removeAttribute('aria-busy');
        const status = ensureMediumStatus();
        status.dataset.state = 'error';
        status.textContent = '';
        status.append('Medium articles could not be refreshed right now. A saved article is shown. ');
        status.appendChild(createMediumProfileLink(profileUrl, 'Visit my Medium profile ↗'));
    }

    function showMediumEmptyState(profileUrl) {
        if (!mediumFeedEl) {
            return;
        }
        mediumFeedEl.removeAttribute('aria-busy');
        mediumFeedEl.querySelectorAll('.writing-card, .writing-medium-fallback').forEach(function(node) {
            node.remove();
        });
        const status = ensureMediumStatus();
        status.dataset.state = 'empty';
        status.textContent = '';
        status.append('No public Medium articles were found. ');
        status.appendChild(createMediumProfileLink(profileUrl, 'Visit my Medium profile ↗'));
    }

    function createNewBadge() {
        const wrap = document.createElement('span');
        wrap.className = 'writing-new-badge-wrap';
        const badge = document.createElement('span');
        badge.className = 'writing-new-badge';
        badge.textContent = '';
        badge.append('NEW');
        const note = document.createElement('span');
        note.className = 'writing-new-badge-note';
        note.textContent = ', latest article';
        badge.appendChild(note);
        wrap.appendChild(badge);
        return wrap;
    }

    function createMediumArticleCard(post, isLatest) {
        const article = document.createElement('article');
        article.className = 'writing-card';
        if (isLatest) {
            article.classList.add('writing-card-latest');
        }

        const top = document.createElement('div');
        top.className = 'writing-card-top';

        const heading = document.createElement('div');
        heading.className = 'writing-card-heading';

        const meta = document.createElement('div');
        meta.className = 'writing-meta';

        const platform = document.createElement('span');
        platform.className = 'writing-platform medium-badge';
        platform.textContent = 'Medium';
        meta.appendChild(platform);

        const formattedDate = formatMediumDate(post.publishedAt);
        if (formattedDate) {
            const time = document.createElement('time');
            time.className = 'writing-date';
            const parsed = Date.parse(post.publishedAt);
            time.dateTime = new Date(parsed).toISOString();
            time.textContent = formattedDate;
            meta.appendChild(time);
        }
        heading.appendChild(meta);

        const title = document.createElement('h3');
        title.className = 'writing-title';
        title.textContent = post.title || 'Untitled article';
        heading.appendChild(title);

        top.appendChild(heading);
        if (isLatest) {
            top.appendChild(createNewBadge());
        }
        article.appendChild(top);

        const imageUrl = sanitizeOrNormalizeUrl(post.image);
        if (imageUrl) {
            const figure = document.createElement('figure');
            figure.className = 'writing-cover';
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = post.title ? 'Cover image for ' + post.title : '';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.width = 640;
            img.height = 360;
            img.addEventListener('error', function() {
                figure.remove();
            });
            figure.appendChild(img);
            article.appendChild(figure);
        }

        const tags = Array.isArray(post.tags) ? post.tags.filter(Boolean).slice(0, 3) : [];
        if (tags.length) {
            const list = document.createElement('ul');
            list.className = 'writing-tags';
            tags.forEach(function(tag) {
                const item = document.createElement('li');
                item.className = 'writing-tag';
                item.textContent = tag;
                list.appendChild(item);
            });
            article.appendChild(list);
        }

        const excerpt = truncateExcerpt(post.excerpt, 220);
        if (excerpt) {
            const excerptEl = document.createElement('p');
            excerptEl.className = 'writing-excerpt';
            excerptEl.textContent = excerpt;
            article.appendChild(excerptEl);
        }

        const href = sanitizeOrNormalizeUrl(post.url);
        if (!href) {
            return null;
        }
        const link = document.createElement('a');
        link.className = 'writing-link';
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Read on Medium ↗';
        article.appendChild(link);
        return article;
    }

    function renderMediumPosts(posts, profileUrl) {
        if (!mediumFeedEl) {
            return false;
        }
        const normalized = [];
        const seen = Object.create(null);
        (Array.isArray(posts) ? posts : []).forEach(function(post) {
            if (!post) {
                return;
            }
            const url = sanitizeOrNormalizeUrl(post.link || post.url);
            const title = String(post.title || '').trim();
            if (!url || !title) {
                return;
            }
            const key = String(post.id || post.guid || url).toLowerCase();
            if (seen[key] || seen[url.toLowerCase()]) {
                return;
            }
            seen[key] = true;
            seen[url.toLowerCase()] = true;
            const categories = Array.isArray(post.categories) ? post.categories : post.tags;
            normalized.push({
                id: post.id || post.guid || url,
                title: title,
                url: url,
                publishedAt: post.publicationDate || post.publishedAt || '',
                author: post.author || '',
                tags: Array.isArray(categories) ? categories : [],
                excerpt: String(post.excerpt || ''),
                image: post.thumbnail || post.image || ''
            });
        });

        normalized.sort(function(a, b) {
            const aTime = Date.parse(a.publishedAt || '');
            const bTime = Date.parse(b.publishedAt || '');
            return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
        });

        const fragment = document.createDocumentFragment();
        normalized.forEach(function(post, index) {
            const card = createMediumArticleCard(post, index === 0);
            if (card) {
                fragment.appendChild(card);
            }
        });
        if (!fragment.childNodes.length) {
            showMediumEmptyState(profileUrl);
            return false;
        }
        mediumFeedEl.removeAttribute('aria-busy');
        mediumFeedEl.replaceChildren(fragment);
        return true;
    }

    function loadMediumPosts() {
        if (!mediumFeedEl || mediumFeedRequest) {
            return mediumFeedRequest;
        }

        showMediumLoadingState();
        const controller = new AbortController();
        const timer = setTimeout(function() {
            controller.abort();
        }, MEDIUM_FETCH_TIMEOUT_MS);

        mediumFeedRequest = fetch(mediumApiUrl, {
            signal: controller.signal,
            headers: { Accept: 'application/json' }
        }).then(function(response) {
            if (!response.ok) {
                throw new Error('Medium feed request failed with status ' + response.status);
            }
            return response.json();
        }).then(function(payload) {
            const posts = payload && (payload.articles || payload.posts);
            if (!Array.isArray(posts)) {
                throw new Error('Medium response is missing an articles array');
            }
            const profileUrl = mediumProfileHref(payload.profileUrl);
            renderMediumPosts(posts, profileUrl);
        }).catch(function(err) {
            console.error('Medium articles could not be refreshed.', err && err.message ? err.message : err);
            showMediumRefreshWarning(mediumProfileUrl);
        }).finally(function() {
            clearTimeout(timer);
        });

        return mediumFeedRequest;
    }

    function initializeMediumFeed() {
        if (!mediumFeedEl) {
            return;
        }

        const writingSection = document.getElementById('writing');
        const startLoad = function() {
            loadMediumPosts();
        };

        document.querySelectorAll('a[href="#writing"]').forEach(function(link) {
            link.addEventListener('click', startLoad);
        });

        const writingToggle = document.querySelector('#writing .writing-toggle');
        if (writingToggle) {
            writingToggle.addEventListener('toggle', function() {
                if (writingToggle.open) {
                    startLoad();
                }
            });
        }

        if (!('IntersectionObserver' in window) || !writingSection) {
            startLoad();
            return;
        }

        const observer = new IntersectionObserver(function(entries, obs) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    startLoad();
                    obs.disconnect();
                }
            });
        }, {
            root: null,
            rootMargin: '240px 0px',
            threshold: 0.01
        });
        observer.observe(writingSection);
    }

    function recordPortfolioVisit() {
        const host = window.location.hostname;
        if (
            window.location.protocol === 'file:' ||
            host === 'localhost' ||
            host === '127.0.0.1' ||
            host === '[::1]' ||
            host === ''
        ) {
            return;
        }

        let external = false;
        if (document.referrer) {
            try {
                external = new URL(document.referrer).hostname !== host;
            } catch {
                external = false;
            }
        }

        fetch('/api/visit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ external: external }),
            keepalive: true,
            credentials: 'same-origin'
        }).catch(function(err) {
            console.error('Visit could not be recorded.', err && err.message ? err.message : err);
        });
    }

    function schedulePortfolioVisit() {
        if (document.prerendering) {
            document.addEventListener('prerenderingchange', recordPortfolioVisit, { once: true });
            return;
        }
        recordPortfolioVisit();
    }

    initializeMediumFeed();
    schedulePortfolioVisit();
});
