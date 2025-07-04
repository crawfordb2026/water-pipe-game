// Pipeline Puzzler Game Logic
class PipelinePuzzler {
    constructor() {
        this.gridSize = 6;
        this.currentLevel = 1;
        this.score = 0;
        this.timeLeft = 60;
        this.gameActive = false;
        this.timer = null;
        this.grid = [];
        this.initialGrid = []; // Store initial state for restart
        this.waterFlowActive = false;
        this.rotationLimits = new Map(); // Track remaining rotations per pipe
        
        // Difficulty Settings
        this.difficulty = 'normal';
        this.difficultySettings = {
            easy: {
                timeLimit: 90,
                rotationLimit: 5,
                complexityModifier: 0.7,
                scoreMultiplier: 1.0
            },
            normal: {
                timeLimit: 60,
                rotationLimit: 3,
                complexityModifier: 1.0,
                scoreMultiplier: 1.5
            },
            hard: {
                timeLimit: 30,
                rotationLimit: 2,
                complexityModifier: 1.5,
                scoreMultiplier: 2.0
            }
        };
        
        // Sound Effects
        this.sounds = {
            pipeRotate: null,
            levelComplete: null,
            gameOver: null
        };
        
        // Milestone System
        this.milestones = [
            { score: 500, title: "Water Pioneer", description: "First steps in bringing clean water!", achieved: false },
            { score: 1500, title: "Pipe Master", description: "You're getting the hang of this!", achieved: false },
            { score: 3000, title: "Flow Expert", description: "Water flows like magic through your pipes!", achieved: false },
            { score: 5000, title: "Hydration Hero", description: "Communities are celebrating clean water!", achieved: false },
            { score: 10000, title: "Water Warrior", description: "You're making a real difference!", achieved: false },
            { score: 20000, title: "Aqua Legend", description: "Your skills bring hope to thousands!", achieved: false }
        ];
        
        // Pipe types and their connections - Fixed with 4 orientations each
        this.pipeTypes = {
            'straight-horizontal': { 
                connections: ['left', 'right'], 
                rotations: ['straight-horizontal', 'straight-vertical', 'straight-horizontal', 'straight-vertical'],
                complexity: 1
            },
            'straight-vertical': { 
                connections: ['top', 'bottom'], 
                rotations: ['straight-vertical', 'straight-horizontal', 'straight-vertical', 'straight-horizontal'],
                complexity: 1
            },
            'curve-ne': { 
                connections: ['top', 'right'], 
                rotations: ['curve-ne', 'curve-se', 'curve-sw', 'curve-nw'],
                complexity: 2
            },
            'curve-se': { 
                connections: ['bottom', 'right'], 
                rotations: ['curve-se', 'curve-sw', 'curve-nw', 'curve-ne'],
                complexity: 2
            },
            'curve-sw': { 
                connections: ['bottom', 'left'], 
                rotations: ['curve-sw', 'curve-nw', 'curve-ne', 'curve-se'],
                complexity: 2
            },
            'curve-nw': { 
                connections: ['top', 'left'], 
                rotations: ['curve-nw', 'curve-ne', 'curve-se', 'curve-sw'],
                complexity: 2
            },
            't-junction': { 
                connections: ['top', 'left', 'right'], 
                rotations: ['t-junction', 't-junction-right', 't-junction-bottom', 't-junction-left'],
                complexity: 3
            },
            'cross-junction': {
                connections: ['top', 'bottom', 'left', 'right'],
                rotations: ['cross-junction', 'cross-junction', 'cross-junction', 'cross-junction'],
                complexity: 4
            }
        };
        
        // Wait for DOM to be ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    init() {
        this.initializeSounds();
        this.bindEvents();
        this.createBoard();
        this.startGame();
    }
    
    initializeSounds() {
        // Add a small delay to ensure audio elements are loaded
        setTimeout(() => {
            this.sounds.pipeRotate = document.getElementById('pipe-rotate-sound');
            this.sounds.levelComplete = document.getElementById('level-complete-sound');
            this.sounds.gameOver = document.getElementById('game-over-sound');
            
            // Set volume levels and ensure they're ready
            Object.values(this.sounds).forEach(sound => {
                if (sound) {
                    sound.volume = 0.4;
                    sound.load(); // Ensure the audio is loaded
                }
            });
        }, 100);
    }
    
    playSound(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            // Try to play the sound and handle potential errors
            const playPromise = sound.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log('Audio play failed (this is normal on first interaction):', e.message);
                });
            }
        }
    }
    
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.timeLeft = this.difficultySettings[difficulty].timeLimit;
        this.createBoard();
        this.startGame();
    }
    
    bindEvents() {
        // Difficulty dropdown selection
        const difficultySelect = document.getElementById('difficulty-select');
        difficultySelect.addEventListener('change', (e) => {
            this.setDifficulty(e.target.value);
        });
        
        // Game controls
        document.getElementById('restart-btn').addEventListener('click', () => this.restartLevel());
        document.getElementById('next-level-btn').addEventListener('click', () => this.nextLevel());
        document.getElementById('modal-btn').addEventListener('click', () => this.hideModal());
        
        // Add new level button
        const newLevelBtn = document.createElement('button');
        newLevelBtn.id = 'new-level-btn';
        newLevelBtn.className = 'game-btn';
        newLevelBtn.textContent = 'New Level';
        newLevelBtn.addEventListener('click', () => this.generateNewLevel());
        document.querySelector('.game-controls').appendChild(newLevelBtn);
    }
    
    createBoard() {
        const board = document.getElementById('game-board');
        board.innerHTML = '';
        this.grid = [];
        this.initialGrid = []; // Reset initial state
        this.rotationLimits.clear(); // Reset rotation limits
        
        const settings = this.difficultySettings[this.difficulty];
        
        for (let row = 0; row < this.gridSize; row++) {
            this.grid[row] = [];
            this.initialGrid[row] = [];
            for (let col = 0; col < this.gridSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'pipe-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                if (row === 0 && col === 0) {
                    // Water source (house)
                    cell.className += ' source';
                    cell.innerHTML = '🏠';
                    this.grid[row][col] = { type: 'source', rotation: 0 };
                    this.initialGrid[row][col] = { type: 'source', rotation: 0 };
                } else if (row === this.gridSize - 1 && col === this.gridSize - 1) {
                    // Destination (village)
                    cell.className += ' destination';
                    cell.innerHTML = '🏘️';
                    this.grid[row][col] = { type: 'destination', rotation: 0 };
                    this.initialGrid[row][col] = { type: 'destination', rotation: 0 };
                } else {
                    // Random pipe piece based on difficulty
                    const pipeType = this.getRandomPipeType();
                    const rotation = Math.floor(Math.random() * 4);
                    
                    const pipe = document.createElement('div');
                    pipe.className = `pipe ${pipeType}`;
                    cell.appendChild(pipe);
                    
                    // Set rotation limit for this pipe based on difficulty
                    const posKey = `${row},${col}`;
                    this.rotationLimits.set(posKey, settings.rotationLimit);
                    
                    // Add rotation counter display
                    const counter = document.createElement('div');
                    counter.className = 'rotation-counter';
                    counter.textContent = settings.rotationLimit;
                    counter.title = `${settings.rotationLimit} rotations remaining`;
                    cell.appendChild(counter);
                    
                    this.grid[row][col] = { type: pipeType, rotation: rotation };
                    this.initialGrid[row][col] = { type: pipeType, rotation: rotation }; // Save initial state
                    
                    cell.addEventListener('click', () => this.rotatePipe(row, col));
                }
                
                board.appendChild(cell);
            }
        }
    }
    
    getRandomPipeType() {
        const settings = this.difficultySettings[this.difficulty];
        const types = Object.keys(this.pipeTypes);
        
        // Adjust pipe complexity based on difficulty
        const filteredTypes = types.filter(type => {
            const complexity = this.pipeTypes[type].complexity;
            if (this.difficulty === 'easy') {
                return complexity <= 2; // Only straight and curves for easy
            } else if (this.difficulty === 'normal') {
                return complexity <= 3; // Include T-junctions for normal
            } else {
                return true; // All types for hard
            }
        });
        
        return filteredTypes[Math.floor(Math.random() * filteredTypes.length)];
    }
    
    rotatePipe(row, col) {
        if (!this.gameActive) return;
        
        const cell = this.grid[row][col];
        if (cell.type === 'source' || cell.type === 'destination') return;
        
        // Check rotation limit
        const posKey = `${row},${col}`;
        const remainingRotations = this.rotationLimits.get(posKey) || 0;
        
        if (remainingRotations <= 0) {
            this.showMessage('🔄 No rotations remaining for this pipe!', 'error');
            return;
        }
        
        // Play rotation sound - ensure it plays
        console.log('Playing pipe rotation sound...');
        this.playSound('pipeRotate');
        
        // Rotate the pipe 90 degrees clockwise
        cell.rotation = (cell.rotation + 1) % 4;
        
        // Decrease rotation count
        this.rotationLimits.set(posKey, remainingRotations - 1);
        
        // Update visual immediately and reliably
        const pipeElement = document.querySelector(`[data-row="${row}"][data-col="${col}"] .pipe`);
        const counterElement = document.querySelector(`[data-row="${row}"][data-col="${col}"] .rotation-counter`);
        
        if (pipeElement) {
            const rotations = this.pipeTypes[cell.type].rotations;
            const newType = rotations[cell.rotation];
            
            // Force reflow to ensure immediate visual update
            pipeElement.className = `pipe ${newType}`;
            pipeElement.offsetHeight; // Force reflow
            
            // Update counter display
            if (counterElement) {
                const newCount = remainingRotations - 1;
                counterElement.textContent = newCount;
                counterElement.title = `${newCount} rotations remaining`;
                
                // Add visual feedback for low rotations
                counterElement.className = 'rotation-counter'; // Reset classes
                if (newCount === 0) {
                    counterElement.classList.add('no-rotations');
                } else if (newCount === 1) {
                    counterElement.classList.add('low-rotations');
                }
            }
        }
        
        // Add a longer delay and validate state before checking
        setTimeout(() => {
            this.validateGridState();
            this.checkConnection();
        }, 300);
    }
    
    checkMilestones() {
        this.milestones.forEach(milestone => {
            if (!milestone.achieved && this.score >= milestone.score) {
                milestone.achieved = true;
                this.showMilestone(milestone);
            }
        });
    }
    
    showMilestone(milestone) {
        const banner = document.getElementById('milestone-banner');
        const title = document.getElementById('milestone-title');
        const description = document.getElementById('milestone-description');
        
        title.textContent = milestone.title;
        description.textContent = milestone.description;
        
        banner.style.display = 'block';
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            banner.style.display = 'none';
        }, 4000);
    }
    
    validateGridState() {
        let stateValid = true;
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.grid[row][col];
                const pipeElement = document.querySelector(`[data-row="${row}"][data-col="${col}"] .pipe`);
                
                if (pipeElement && cell.type !== 'source' && cell.type !== 'destination') {
                    const expectedType = this.pipeTypes[cell.type].rotations[cell.rotation];
                    const actualClasses = pipeElement.className;
                    
                    if (!actualClasses.includes(expectedType)) {
                        stateValid = false;
                        // Force fix the visual state
                        pipeElement.className = `pipe ${expectedType}`;
                    }
                }
            }
        }
    }
    
    checkConnection() {
        // Reset water flow
        this.clearWaterFlow();
        
        // Find path from source to destination
        const path = this.findPath();
        
        if (path && path.length > 0) {
            this.animateWaterFlow(path);
            this.puzzleSolved();
        }
    }
    
    findPath() {
        const visited = new Set();
        const queue = [{ row: 0, col: 0, path: [{ row: 0, col: 0 }] }];
        visited.add('0,0');
        
        while (queue.length > 0) {
            const { row, col, path } = queue.shift();
            
            // Check if we reached the destination
            if (row === this.gridSize - 1 && col === this.gridSize - 1) {
                return path;
            }
            
            // Get current cell's connections
            const currentCell = this.grid[row][col];
            const connections = this.getCurrentConnections(currentCell);
            
            // Check each direction
            for (const direction of connections) {
                const { newRow, newCol } = this.getNewPosition(row, col, direction);
                
                if (this.isValidPosition(newRow, newCol) && !visited.has(`${newRow},${newCol}`)) {
                    const nextCell = this.grid[newRow][newCol];
                    const oppositeDirection = this.getOppositeDirection(direction);
                    const nextConnections = this.getCurrentConnections(nextCell);
                    
                    // Check if the next cell can connect back
                    if (nextConnections.includes(oppositeDirection)) {
                        visited.add(`${newRow},${newCol}`);
                        queue.push({
                            row: newRow,
                            col: newCol,
                            path: [...path, { row: newRow, col: newCol }]
                        });
                    }
                }
            }
        }
        
        return null;
    }
    
    getCurrentConnections(cell) {
        if (cell.type === 'source') {
            return ['right', 'bottom'];
        }
        if (cell.type === 'destination') {
            return ['left', 'top'];
        }
        
        // Handle T-junction rotations specially since each has different connections
        if (cell.type === 't-junction') {
            return this.getTJunctionConnections(cell.rotation);
        }
        
        // Handle cross-junction (always all 4 directions)
        if (cell.type === 'cross-junction') {
            return ['top', 'bottom', 'left', 'right'];
        }
        
        const baseConnections = this.pipeTypes[cell.type].connections;
        return this.rotateConnections(baseConnections, cell.rotation);
    }
    
    getTJunctionConnections(rotation) {
        const tJunctionConnections = [
            ['top', 'left', 'right'],    // t-junction (rotation 0)
            ['top', 'bottom', 'right'],  // t-junction-right (rotation 1) 
            ['left', 'right', 'bottom'], // t-junction-bottom (rotation 2)
            ['top', 'bottom', 'left']    // t-junction-left (rotation 3)
        ];
        return tJunctionConnections[rotation] || [];
    }
    
    rotateConnections(connections, rotation) {
        const directions = ['top', 'right', 'bottom', 'left'];
        return connections.map(conn => {
            const index = directions.indexOf(conn);
            const newIndex = (index + rotation) % 4;
            return directions[newIndex];
        });
    }
    
    getNewPosition(row, col, direction) {
        const moves = {
            top: { row: row - 1, col: col },
            right: { row: row, col: col + 1 },
            bottom: { row: row + 1, col: col },
            left: { row: row, col: col - 1 }
        };
        return { newRow: moves[direction].row, newCol: moves[direction].col };
    }
    
    getOppositeDirection(direction) {
        const opposites = {
            top: 'bottom',
            right: 'left',
            bottom: 'top',
            left: 'right'
        };
        return opposites[direction];
    }
    
    isValidPosition(row, col) {
        return row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize;
    }
    
    animateWaterFlow(path) {
        this.waterFlowActive = true;
        
        path.forEach((pos, index) => {
            setTimeout(() => {
                const cell = document.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
                cell.classList.add('water-flow');
            }, index * 200);
        });
        
        // Fill water meter
        const waterFill = document.getElementById('water-fill');
        waterFill.style.height = '100%';
    }
    
    clearWaterFlow() {
        this.waterFlowActive = false;
        document.querySelectorAll('.pipe-cell').forEach(cell => {
            cell.classList.remove('water-flow');
        });
        
        const waterFill = document.getElementById('water-fill');
        waterFill.style.height = '0%';
    }
    
    puzzleSolved() {
        this.gameActive = false;
        clearInterval(this.timer);
        
        // Play completion sound
        this.playSound('levelComplete');
        
        // Calculate score (bonus for remaining time and difficulty)
        const settings = this.difficultySettings[this.difficulty];
        const timeBonus = this.timeLeft * 10;
        const levelBonus = this.currentLevel * 100;
        const difficultyBonus = Math.floor((timeBonus + levelBonus) * settings.scoreMultiplier);
        
        this.score += timeBonus + levelBonus + difficultyBonus;
        
        this.updateDisplay();
        this.checkMilestones();
        this.showMessage('🎉 Level Complete! Water is flowing!', 'success');
        
        // Trigger celebration animation
        this.celebrateWin();
        
        document.getElementById('next-level-btn').style.display = 'inline-block';
        document.getElementById('restart-btn').textContent = 'Replay Level';
    }
    
    celebrateWin() {
        // Create confetti animation
        this.createConfetti();
        
        // Add water splash effect to the water meter
        const waterFill = document.getElementById('water-fill');
        waterFill.style.animation = 'waterSplash 1s ease-out';
        
        // Screen celebration effect
        document.body.style.animation = 'celebrate 0.5s ease-out';
        
        // Reset animations after completion
        setTimeout(() => {
            waterFill.style.animation = '';
            document.body.style.animation = '';
        }, 1000);
    }
    
    createConfetti() {
        const colors = ['var(--charity-yellow)', 'var(--water-blue)', '#4FC3F7', '#81D4FA', '#FFC20E'];
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        document.body.appendChild(confettiContainer);
        
        // Create 50 confetti pieces
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = (2 + Math.random() * 3) + 's';
            confettiContainer.appendChild(confetti);
        }
        
        // Remove confetti after animation
        setTimeout(() => {
            if (document.body.contains(confettiContainer)) {
                document.body.removeChild(confettiContainer);
            }
        }, 5000);
    }
    
    startGame() {
        this.gameActive = true;
        this.timeLeft = this.difficultySettings[this.difficulty].timeLimit;
        this.clearWaterFlow();
        this.updateDisplay();
        this.showMessage(`Connect the pipes to bring water to the village! (${this.difficulty.toUpperCase()} mode)`, 'info');
        
        document.getElementById('next-level-btn').style.display = 'none';
        document.getElementById('restart-btn').textContent = 'Restart Level';
        
        this.startTimer();
    }
    
    startTimer() {
        clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            
            if (this.timeLeft <= 10) {
                document.getElementById('timer').classList.add('warning');
            }
            
            if (this.timeLeft <= 0) {
                this.gameOver();
            }
        }, 1000);
    }
    
    gameOver() {
        this.gameActive = false;
        clearInterval(this.timer);
        
        // Play game over sound
        this.playSound('gameOver');
        
        this.showMessage('⏰ Time\'s up! Try again!', 'error');
        this.showModal('Time\'s Up!', 'The village still needs water. Try connecting the pipes faster!', 'Try Again');
    }
    
    restartLevel() {
        // Reset to initial positions instead of creating new level
        this.resetToInitialState();
        this.startGame();
    }
    
    resetToInitialState() {
        // Reset to initial positions instead of creating new level
        const settings = this.difficultySettings[this.difficulty];
        
        // Reset rotation limits
        this.rotationLimits.clear();
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                // Reset grid state to initial
                this.grid[row][col] = { ...this.initialGrid[row][col] };
                
                const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                
                if (row === 0 && col === 0 || row === this.gridSize - 1 && col === this.gridSize - 1) {
                    // Source and destination don't change
                    continue;
                } else {
                    // Reset pipe visual to initial state
                    const pipeElement = cellElement.querySelector('.pipe');
                    if (pipeElement) {
                        const rotations = this.pipeTypes[this.initialGrid[row][col].type].rotations;
                        const initialType = rotations[this.initialGrid[row][col].rotation];
                        pipeElement.className = `pipe ${initialType}`;
                    }
                    
                    // Reset rotation counter
                    const counterElement = cellElement.querySelector('.rotation-counter');
                    if (counterElement) {
                        const posKey = `${row},${col}`;
                        this.rotationLimits.set(posKey, settings.rotationLimit);
                        
                        counterElement.textContent = settings.rotationLimit;
                        counterElement.title = `${settings.rotationLimit} rotations remaining`;
                        counterElement.className = 'rotation-counter'; // Reset all classes
                    }
                }
            }
        }
    }
    
    nextLevel() {
        this.currentLevel++;
        this.createBoard();
        this.startGame();
    }
    
    updateDisplay() {
        document.getElementById('timer').textContent = this.timeLeft;
        document.getElementById('score').textContent = this.score.toLocaleString();
        document.getElementById('level').textContent = this.currentLevel;
        
        // Remove timer warning if time is restored
        if (this.timeLeft > 10) {
            document.getElementById('timer').classList.remove('warning');
        }
    }
    
    showMessage(message, type) {
        const statusElement = document.getElementById('game-status');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        
        if (type !== 'success') {
            setTimeout(() => {
                statusElement.textContent = '';
                statusElement.className = 'status-message';
            }, 3000);
        }
    }
    
    showModal(title, message, buttonText) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        document.getElementById('modal-btn').textContent = buttonText;
        document.getElementById('game-modal').style.display = 'flex';
    }
    
    hideModal() {
        document.getElementById('game-modal').style.display = 'none';
        if (this.timeLeft <= 0) {
            this.restartLevel();
        }
    }
    
    generateNewLevel() {
        this.currentLevel++;
        this.createBoard();
        this.startGame();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new PipelinePuzzler();
});

// Add some easter eggs and fun interactions
document.addEventListener('DOMContentLoaded', () => {
    // Add click sound effect (visual feedback)
    document.addEventListener('click', (e) => {
        if (e.target.closest('.pipe-cell:not(.source):not(.destination)')) {
            const cell = e.target.closest('.pipe-cell');
            cell.style.transform = 'scale(0.95)';
            setTimeout(() => {
                cell.style.transform = '';
            }, 100);
        }
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            document.getElementById('restart-btn').click();
        }
        if (e.code === 'Enter') {
            e.preventDefault();
            const nextBtn = document.getElementById('next-level-btn');
            if (nextBtn.style.display !== 'none') {
                nextBtn.click();
            }
        }
    });
    
    // Add inspirational messages with charity: water facts
    const inspirationalMessages = [
        "Every drop counts! 💧",
        "Building bridges with water! 🌊",
        "Connecting communities! 🤝",
        "Clean water changes everything! ✨",
        "Your puzzle skills help villages! 🏘️",
        "785 million people lack basic water access 🌍",
        "Women and children walk miles for water daily 🚶‍♀️",
        "Clean water prevents waterborne diseases 🏥",
        "Every $1 donated returns $4 in economic benefits 💰",
        "charity: water has funded 100,000+ water projects! 🎉"
    ];
    
    setInterval(() => {
        const randomMessage = inspirationalMessages[Math.floor(Math.random() * inspirationalMessages.length)];
        const statusElement = document.getElementById('game-status');
        if (statusElement.textContent === '') {
            statusElement.textContent = randomMessage;
            statusElement.className = 'status-message info';
            setTimeout(() => {
                if (statusElement.textContent === randomMessage) {
                    statusElement.textContent = '';
                    statusElement.className = 'status-message';
                }
            }, 3000);
        }
    }, 15000);
}); 