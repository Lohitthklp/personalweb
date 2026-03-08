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
    const infoLink = document.getElementById('info-link');
    const modal = document.getElementById('resume-modal');
    const achievementsModal = document.getElementById('achievements-modal');
    const achievementDisplayModal = document.getElementById('achievement-display-modal');
    const infoBox = document.getElementById('info-box');
    const closeBtns = document.querySelectorAll('.close-btn');
    const logo = document.getElementById('logo');
    const moreLink = document.getElementById('more-link');
    const achievementIframe = document.querySelector('.achievement-iframe');
    const achievementsCloseBtn = document.getElementById('achievements-close-btn');
    const achievementDisplayCloseBtn = document.getElementById('achievement-display-close-btn');

    // Smooth scrolling
    links.forEach(link => {
        link.addEventListener("click", function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute("href"));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 50,
                    behavior: 'smooth'
                });
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

    // Trigger project card animations on scroll using Intersection Observer API
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('slide-in');
            } else {
                entry.target.classList.remove('slide-in');
            }
        });
    }, {
        threshold: 0.5
    });

    projectCards.forEach(card => {
        observer.observe(card);
    });

    // Theme switcher
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
    });

    // About Me section animations
    const aboutSection = document.querySelector('.about-section');
    const helloText = aboutSection.querySelector('.hello-text');
    const aboutDescription = aboutSection.querySelector('.about-description');

    const aboutObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                helloText.style.animation = 'helloFadeIn 1.5s forwards';
                aboutDescription.style.opacity = '1';
                aboutDescription.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.5
    });

    aboutObserver.observe(aboutSection);

    // Modal functionality
    resumeLink.addEventListener('click', function(e) {
        e.preventDefault();
        modal.style.display = 'block';
    });

    achievementsLink.addEventListener('click', function(e) {
        e.preventDefault();
        achievementsModal.style.display = 'block';
    });

    certificationsLink.addEventListener('click', function(e) {
        e.preventDefault();
        achievementIframe.src = 'documents/Azure.pdf';
        achievementsModal.style.display = 'none';
        achievementDisplayModal.style.display = 'block';
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

    infoLink.addEventListener('click', function(e) {
        e.preventDefault();
        infoBox.style.display = 'block';
        setTimeout(() => {
            infoBox.style.display = 'none';
        }, 5000); // Hide info box after 5 seconds
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (this === achievementDisplayCloseBtn) {
                achievementDisplayModal.style.display = 'none';
                achievementsModal.style.display = 'block';
            } else {
                modal.style.display = 'none';
                achievementsModal.style.display = 'none';
                achievementDisplayModal.style.display = 'none';
            }
        });
    });

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
        if (event.target === achievementsModal) {
            achievementsModal.style.display = 'none';
        }
        if (event.target === achievementDisplayModal) {
            achievementDisplayModal.style.display = 'none';
            achievementsModal.style.display = 'block';
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
});
