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
    const achievementsCloseBtn = document.getElementById('achievements-close-btn');
    const achievementDisplayCloseBtn = document.getElementById('achievement-display-close-btn');
    const orionClientFlip = document.querySelector('.orion-client-flip');
    const orionEntry = document.querySelector('.orion-entry');
    const orionDynamicLogo = document.querySelector('.orion-dynamic-logo');
    const experienceEntries = document.querySelectorAll('.experience-entry');

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
    });

    achievementsLink.addEventListener('click', function(e) {
        e.preventDefault();
        achievementsModal.style.display = 'block';
        lockScroll();
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
        glimpseToggle.addEventListener('click', function() {
            const expanded = glimpseToggle.getAttribute('aria-expanded') === 'true';
            glimpseToggle.setAttribute('aria-expanded', String(!expanded));
            glimpseBodyEl.classList.toggle('collapsed', expanded);
        });
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
        var atStart = glimpseActiveIdx === 0;
        var atEnd = glimpseActiveIdx === glimpsePhotos.length - 1;
        if (glimpseLbPrev) glimpseLbPrev.disabled = atStart;
        if (glimpseLbNext) glimpseLbNext.disabled = atEnd;
        if (glimpseLbPrevMob) glimpseLbPrevMob.disabled = atStart;
        if (glimpseLbNextMob) glimpseLbNextMob.disabled = atEnd;
    }

    function openGlimpse(idx) {
        glimpseActiveIdx = idx;
        var btn = glimpsePhotos[idx];
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
        var next = glimpseActiveIdx + dir;
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
});
