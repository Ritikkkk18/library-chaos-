export class Input {
    constructor() {
        this.keys = new Set();

        window.addEventListener('keydown', (e) => {
            this.keys.add(e.code);
        });

        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
        });

        this.initMobileControls();
    }

    isDown(code) {
        return this.keys.has(code);
    }

    initMobileControls() {
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (!isTouchDevice) return;

        const joystickZone = document.getElementById('joystick-zone');
        const sprintBtn = document.getElementById('btn-sprint-mobile');
        if (joystickZone) joystickZone.classList.remove('hidden');
        if (sprintBtn) sprintBtn.classList.remove('hidden');

        const stick = document.getElementById('joystick-stick');
        if (!stick || !joystickZone) return;

        let active = false;
        let originX = 0;
        let originY = 0;
        
        const handleStart = (e) => {
            active = true;
            // Get center of base
            const rect = document.getElementById('joystick-base').getBoundingClientRect();
            originX = rect.left + rect.width / 2;
            originY = rect.top + rect.height / 2;
            stick.style.transition = 'none';
            handleMove(e);
        };

        const handleMove = (e) => {
            if (!active) return;
            e.preventDefault(); // Prevent page scrolling
            const touch = e.targetTouches[0];
            const dx = touch.clientX - originX;
            const dy = touch.clientY - originY;
            
            const distance = Math.min(45, Math.sqrt(dx*dx + dy*dy));
            const angle = Math.atan2(dy, dx);
            
            const normalizedX = Math.cos(angle) * distance;
            const normalizedY = Math.sin(angle) * distance;

            stick.style.transform = `translate(${normalizedX}px, ${normalizedY}px)`;

            this.keys.delete('ArrowUp');
            this.keys.delete('ArrowDown');
            this.keys.delete('ArrowLeft');
            this.keys.delete('ArrowRight');
            
            const maxDist = 45;
            const normDx = normalizedX / maxDist;
            const normDy = normalizedY / maxDist;

            // Use 0.35 threshold for 8-way directional movement
            if (normDx > 0.35) this.keys.add('ArrowRight');
            if (normDx < -0.35) this.keys.add('ArrowLeft');
            if (normDy > 0.35) this.keys.add('ArrowDown');
            if (normDy < -0.35) this.keys.add('ArrowUp');
        };

        const handleEnd = (e) => {
            active = false;
            stick.style.transition = 'transform 0.2s';
            stick.style.transform = `translate(0px, 0px)`;
            this.keys.delete('ArrowUp');
            this.keys.delete('ArrowDown');
            this.keys.delete('ArrowLeft');
            this.keys.delete('ArrowRight');
        };

        joystickZone.addEventListener('touchstart', handleStart, { passive: false });
        joystickZone.addEventListener('touchmove', handleMove, { passive: false });
        joystickZone.addEventListener('touchend', handleEnd);
        joystickZone.addEventListener('touchcancel', handleEnd);

        // Sprint Button
        sprintBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keys.add('ShiftLeft');
        }, { passive: false });

        sprintBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keys.delete('ShiftLeft');
        });
        sprintBtn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.keys.delete('ShiftLeft');
        });
        
        // Hide mobile controls when menu is open, show when HUD is open
        const observer = new MutationObserver(() => {
            if (document.getElementById('hud').classList.contains('hidden')) {
                joystickZone.style.display = 'none';
                sprintBtn.style.display = 'none';
            } else {
                // Return to flex/block depending on responsive state
                joystickZone.style.display = 'block';
                sprintBtn.style.display = 'block';
            }
        });
        observer.observe(document.getElementById('hud'), { attributes: true, attributeFilter: ['class'] });
    }
}
