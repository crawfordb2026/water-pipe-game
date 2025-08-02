document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    const hero = document.querySelector('.hero');
    const starsContainer = document.getElementById('stars');
    const sections = [
        document.querySelector('.about'),
        document.querySelector('.projects'),
        document.querySelector('.professional-projects'),
        document.querySelector('.contact')
    ];

    let stars = []; // Array to store star elements and their positions
    let mouseX = 0;
    let mouseY = 0;
    let canvas = null;
    let ctx = null;
    let globalMouseX = 0;
    let globalMouseY = 0;

    // Create canvas for drawing lines
    function createCanvas() {
        canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '1';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        starsContainer.appendChild(canvas);
        
        // Set canvas size
        function resizeCanvas() {
            canvas.width = starsContainer.offsetWidth;
            canvas.height = starsContainer.offsetHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        ctx = canvas.getContext('2d');
    }

    // Create stars with random movements
    function createStars() {
        const starsCount = 400; // Increased number of stars

        for (let i = 0; i < starsCount; i++) {
            const star = document.createElement('div');
            star.className = `star ${Math.random() > 0.5 ? 'blue' : 'green'}`;
            
            // Slightly bigger size between 0.8 and 2 pixels
            const size = Math.random() * 1.2 + 0.8;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            
            // Random position
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            star.style.left = `${x}%`;
            star.style.top = `${y}%`;
            
            // Random movement
            const duration = Math.random() * 20 + 10; // Between 10 and 30 seconds
            const delay = Math.random() * -duration; // Random start time
            
            // Random movement path
            const x1 = Math.random() * 100 - 50;
            const y1 = Math.random() * 100 - 50;
            const x2 = Math.random() * 100 - 50;
            const y2 = Math.random() * 100 - 50;
            
            star.style.animation = `moveStar ${duration}s linear ${delay}s infinite`;
            star.style.setProperty('--x1', `${x1}px`);
            star.style.setProperty('--y1', `${y1}px`);
            star.style.setProperty('--x2', `${x2}px`);
            star.style.setProperty('--y2', `${y2}px`);
            
            starsContainer.appendChild(star);
            
            // Store star data for line calculations
            stars.push({
                element: star,
                x: x,
                y: y,
                size: size
            });
        }
    }

    // Calculate distance between two points
    function distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    // Update star positions and draw connecting lines
    function updateStarsAndLines() {
        // Update mouse position relative to container
        updateMousePosition();
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update star positions based on their current visual position
        stars.forEach(star => {
            const rect = star.element.getBoundingClientRect();
            const containerRect = starsContainer.getBoundingClientRect();
            
            // Calculate center position of star relative to container
            const centerX = rect.left + rect.width / 2 - containerRect.left;
            const centerY = rect.top + rect.height / 2 - containerRect.top;
            
            // Convert to percentage
            star.x = (centerX / containerRect.width) * 100;
            star.y = (centerY / containerRect.height) * 100;
        });
        
        // Draw connecting lines 
        const mouseRadius = 30; // how far the mouse needs to be from a star pair for lines to show up
        const starDistance = 8; // how close 2 stars need to be
        const cursorToStarRadius = 15; // how close cursor needs to be to a star to connect
        
        // // Test: Draw a circle around mouse cursor to verify tracking
        // const mouseCanvasX = (mouseX / 100) * canvas.width;
        // const mouseCanvasY = (mouseY / 100) * canvas.height;
        // ctx.beginPath();
        // ctx.arc(mouseCanvasX, mouseCanvasY, 10, 0, 2 * Math.PI);
        // ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Red circle
        // ctx.lineWidth = 2;
        // ctx.stroke();
        
        // Draw lines between stars (existing functionality)
        for (let i = 0; i < stars.length; i++) {
            for (let j = i + 1; j < stars.length; j++) {
                const star1 = stars[i];
                const star2 = stars[j];
                
                // Check if both stars are within mouse radius
                const distToMouse1 = distance(star1.x, star1.y, mouseX, mouseY);
                const distToMouse2 = distance(star2.x, star2.y, mouseX, mouseY);
                
                // Check distance between stars
                const distBetweenStars = distance(star1.x, star1.y, star2.x, star2.y);
                
                if (distToMouse1 <= mouseRadius && distToMouse2 <= mouseRadius && distBetweenStars <= starDistance) {
                    // Draw line
                    const x1 = (star1.x / 100) * canvas.width;
                    const y1 = (star1.y / 100) * canvas.height;
                    const x2 = (star2.x / 100) * canvas.width;
                    const y2 = (star2.y / 100) * canvas.height;
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)'; // Slightly more visible
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }
        
        // Draw lines from cursor to nearby stars (new functionality)
        if (mouseX >= 0 && mouseY >= 0) { // Only draw if mouse is within container
            const mouseCanvasX = (mouseX / 100) * canvas.width;
            const mouseCanvasY = (mouseY / 100) * canvas.height;
            
            stars.forEach(star => {
                const distToCursor = distance(star.x, star.y, mouseX, mouseY);
                
                if (distToCursor <= cursorToStarRadius) {
                    // Draw line from cursor to star
                    const starCanvasX = (star.x / 100) * canvas.width;
                    const starCanvasY = (star.y / 100) * canvas.height;
                    
                    ctx.beginPath();
                    ctx.moveTo(mouseCanvasX, mouseCanvasY);
                    ctx.lineTo(starCanvasX, starCanvasY);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; // White line for cursor connections
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                }
            });
        }
        
        requestAnimationFrame(updateStarsAndLines);
    }

    // Track mouse position globally
    function updateGlobalMousePosition(e) {
        globalMouseX = e.clientX;
        globalMouseY = e.clientY;
    }

    // Update mouse position relative to stars container
    function updateMousePosition() {
        const rect = starsContainer.getBoundingClientRect();
        
        // Check if mouse is within the stars container
        if (globalMouseX >= rect.left && globalMouseX <= rect.right && 
            globalMouseY >= rect.top && globalMouseY <= rect.bottom) {
            
            // Calculate relative position
            mouseX = ((globalMouseX - rect.left) / rect.width) * 100;
            mouseY = ((globalMouseY - rect.top) / rect.height) * 100;
        } else {
            // Mouse is outside container, hide lines
            mouseX = -100;
            mouseY = -100;
        }
    }

    // Initialize
    createCanvas();
    createStars();
    
    // Add global mouse tracking
    document.addEventListener('mousemove', updateGlobalMousePosition);
    starsContainer.addEventListener('mouseleave', () => {
        mouseX = -100; // Move mouse far away to hide lines
        mouseY = -100;
    });
    
    // Start the animation loop
    updateStarsAndLines();

    // Section fade-in/slide-up animation on scroll
    function revealSections() {
        const triggerBottom = window.innerHeight * 0.85;
        sections.forEach(section => {
            if (!section) return;
            const sectionTop = section.getBoundingClientRect().top;
            if (sectionTop < triggerBottom) {
                section.classList.add('visible');
            }
        });
    }
    window.addEventListener('scroll', revealSections);
    revealSections();

    // Contact form
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            message: document.getElementById('message').value
        };

        // Here you would typically send the form data to your backend
        // For now, we'll just log it to the console
        console.log('Form submitted:', formData);

        // Clear the form
        contactForm.reset();

        // Show a success message
        alert('Thank you for your message! I will get back to you soon.');
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
