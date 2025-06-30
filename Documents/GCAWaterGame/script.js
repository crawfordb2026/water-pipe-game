// Pipeline Puzzler Game Logic
class PipelinePuzzler {
    constructor() {
        this.gridSize = 6;
        this.currentLevel = 1;
        this.score = 0;
        this.timeLeft = 50;
        this.gameActive = false;
        this.timer = null;
        this.grid = [];
        this.initialGrid = []; // Store initial state for restart
        this.waterFlowActive = false;
        this.rotationLimits = new Map(); // Track remaining rotations per pipe
        this.difficulty = 'normal'; // Default difficulty
        this.milestones = [100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000]; // Score milestones
        this.achievedMilestones = new Set(); // Track achieved milestones
        
        // Difficulty settings
        this.difficultySettings = {
            easy: {
                timeLimit: 75,
                rotationLimit: 5,
                pipeComplexity: 0.3, // Lower = simpler pipes
                name: 'Easy',
                description: 'More time, more rotations, simpler pipes'
            },
            normal: {
                timeLimit: 50,
                rotationLimit: 3,
                pipeComplexity: 0.6,
                name: 'Normal',
                description: 'Balanced challenge'
            },
            hard: {
                timeLimit: 30,
                rotationLimit: 2,
                pipeComplexity: 0.9, // Higher = more complex pipes
                name: 'Hard',
                description: 'Less time, fewer rotations, complex pipes'
            }
        };
        
        // Pipe types and their connections - Fixed with 4 orientations each
        this.pipeTypes = {
            'straight-horizontal': { 
                connections: ['left', 'right'], 
                rotations: ['straight-horizontal', 'straight-vertical', 'straight-horizontal', 'straight-vertical'],
                complexity: 0.1 
            },
            'straight-vertical': { 
                connections: ['top', 'bottom'], 
                rotations: ['straight-vertical', 'straight-horizontal', 'straight-vertical', 'straight-horizontal'],
                complexity: 0.1 
            },
            'curve-ne': { 
                connections: ['top', 'right'], 
                rotations: ['curve-ne', 'curve-se', 'curve-sw', 'curve-nw'],
                complexity: 0.4 
            },
            'curve-se': { 
                connections: ['bottom', 'right'], 
                rotations: ['curve-se', 'curve-sw', 'curve-nw', 'curve-ne'],
                complexity: 0.4 
            },
            'curve-sw': { 
                connections: ['bottom', 'left'], 
                rotations: ['curve-sw', 'curve-nw', 'curve-ne', 'curve-se'],
                complexity: 0.4 
            },
            'curve-nw': { 
                connections: ['top', 'left'], 
                rotations: ['curve-nw', 'curve-ne', 'curve-se', 'curve-sw'],
                complexity: 0.4 
            },
            't-junction': { 
                connections: ['top', 'left', 'right'], 
                rotations: ['t-junction', 't-junction-right', 't-junction-bottom', 't-junction-left'],
                complexity: 0.7 
            },
            'cross-junction': {
                connections: ['top', 'bottom', 'left', 'right'],
                rotations: ['cross-junction', 'cross-junction', 'cross-junction', 'cross-junction'],
                complexity: 0.9
            }
        };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.createBoard();
        this.startGame();
    }
    
    bindEvents() {
        document.getElementById('restart-btn').addEventListener('click', () => this.restartLevel());
        document.getElementById('next-level-btn').addEventListener('click', () => this.nextLevel());
        document.getElementById('modal-btn').addEventListener('click', () => this.hideModal());
        
        // Difficulty selection
        document.getElementById('difficulty-select').addEventListener('change', (e) => {
            this.changeDifficulty(e.target.value);
        });
    }
    
    changeDifficulty(newDifficulty) {
        this.difficulty = newDifficulty;
        this.timeLeft = this.difficultySettings[newDifficulty].timeLimit;
        this.showMessage(`Difficulty changed to ${this.difficultySettings[newDifficulty].name}! ${this.difficultySettings[newDifficulty].description}`, 'info');
        this.restartLevel();
    }
    
    playSound(soundType) {
        // Simplified audio - no delays
        if (soundType === 'rotate') {
            // Simple beep sound generation without complex Web Audio API
            this.beep(800, 100);
        } else if (soundType === 'success') {
            // Simple success sound
            this.beep(523, 150);
            setTimeout(() => this.beep(659, 150), 100);
            setTimeout(() => this.beep(784, 200), 200);
        }
    }
    
    beep(frequency, duration) {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration / 1000);
        } catch (e) {
            // Silent fail
        }
    }
    
    checkMilestones() {
        for (const milestone of this.milestones) {
            if (this.score >= milestone && !this.achievedMilestones.has(milestone)) {
                this.achievedMilestones.add(milestone);
                this.showMilestone(milestone);
                break; // Only show one milestone at a time
            }
        }
    }
    
    showMilestone(score) {
        const messages = [
            `🌟 Amazing! You've reached ${score} points!`,
            `💧 Incredible! ${score} points achieved! You're making a difference!`,
            `🏆 Outstanding! ${score} points! Keep connecting communities!`,
            `⭐ Phenomenal! ${score} points! Every pipe brings hope!`,
            `🎉 Legendary! ${score} points! You're a water hero!`,
            `💎 Masterful! ${score} points! Communities are celebrating!`,
            `🌟 Extraordinary! ${score} points! Your impact is immeasurable!`,
            `🚀 Cosmic! ${score} points! You've transcended pipe mastery!`,
            `👑 Divine! ${score} points! The ultimate pipeline legend!`
        ];
        
        const milestoneIndex = this.milestones.indexOf(score);
        const message = messages[milestoneIndex] || `🎯 Milestone achieved: ${score} points!`;
        
        const milestoneElement = document.getElementById('milestone-message');
        milestoneElement.textContent = message;
        milestoneElement.style.display = 'block';
        
        // Hide after 4 seconds
        setTimeout(() => {
            milestoneElement.style.display = 'none';
        }, 4000);
        
        this.playSound('success');
    }
    
    createBoard() {
        const board = document.getElementById('game-board');
        board.innerHTML = '';
        this.grid = [];
        this.initialGrid = []; // Reset initial state
        this.rotationLimits.clear(); // Reset rotation limits
        
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
                    const rotationLimit = this.difficultySettings[this.difficulty].rotationLimit;
                    this.rotationLimits.set(posKey, rotationLimit);
                    
                    // Add rotation counter display
                    const counter = document.createElement('div');
                    counter.className = 'rotation-counter';
                    counter.textContent = rotationLimit;
                    counter.title = `${rotationLimit} rotations remaining`;
                    cell.appendChild(counter);
                    
                    this.grid[row][col] = { type: pipeType, rotation: rotation };
                    this.initialGrid[row][col] = { type: pipeType, rotation: rotation }; // Save initial state
                    
                    // Add click event listener ONLY to this specific cell
                    cell.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent event bubbling
                        this.rotatePipe(row, col);
                    });
                }
                
                board.appendChild(cell);
            }
        }
        
        // Force initial visual update to match rotation state
        setTimeout(() => {
            this.updateAllPipeVisuals();
        }, 100);
    }
    
    getRandomPipeType() {
        const complexity = this.difficultySettings[this.difficulty].pipeComplexity;
        const suitablePipes = Object.entries(this.pipeTypes).filter(([type, data]) => 
            data.complexity <= complexity || Math.random() < 0.2 // 20% chance of complex pipes even in easy mode
        );
        
        if (suitablePipes.length === 0) {
            // Fallback to straight pipes
            return Math.random() < 0.5 ? 'straight-horizontal' : 'straight-vertical';
        }
        
        const [pipeType] = suitablePipes[Math.floor(Math.random() * suitablePipes.length)];
        return pipeType;
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
        
        // Play rotation sound
        this.playSound('rotate');
        
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
        this.waterFlowActive = true;
        clearInterval(this.timer);
        
        // Calculate score with difficulty multiplier
        const difficultyMultiplier = this.difficulty === 'easy' ? 1 : this.difficulty === 'normal' ? 1.5 : 2;
        const timeBonus = Math.max(0, this.timeLeft * 5);
        const levelBonus = this.currentLevel * 50;
        const totalPoints = Math.floor((timeBonus + levelBonus) * difficultyMultiplier);
        
        this.score += totalPoints;
        this.updateDisplay();
        this.checkMilestones(); // Check for milestone achievements
        
        this.playSound('success');
        this.celebrateWin();
        
        // Show the Next Level button
        const nextLevelBtn = document.getElementById('next-level-btn');
        if (nextLevelBtn) {
            nextLevelBtn.style.display = 'inline-block';
        }
        
        this.showMessage(`🎉 Level ${this.currentLevel} Complete! +${totalPoints} points (${this.difficulty} difficulty bonus applied)`, 'success');
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
            document.body.removeChild(confettiContainer);
        }, 5000);
    }
    
    startGame() {
        this.gameActive = true;
        this.timeLeft = this.difficultySettings[this.difficulty].timeLimit;
        this.updateDisplay();
        this.startTimer();
        this.clearWaterFlow();
        this.showMessage(`🎮 Level ${this.currentLevel} started! Difficulty: ${this.difficultySettings[this.difficulty].name}`, 'info');
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
        this.showMessage(`⏰ Time's up! Try again on ${this.difficultySettings[this.difficulty].name} difficulty.`, 'error');
    }
    
    restartLevel() {
        this.gameActive = false;
        clearInterval(this.timer);
        this.resetToInitialState();
        this.startGame();
    }
    
    resetToInitialState() {
        // Clear water flow
        this.clearWaterFlow();
        
        // Reset rotation limits for all pipes
        this.rotationLimits.clear();
        
        // Reset grid to initial state
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                if (this.initialGrid[row] && this.initialGrid[row][col]) {
                    // Copy initial state back to current grid
                    this.grid[row][col] = { ...this.initialGrid[row][col] };
                    
                    // Reset visual representation
                    const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    if (cellElement) {
                        const cell = this.grid[row][col];
                        
                        if (cell.type !== 'source' && cell.type !== 'destination') {
                            // Reset pipe visual
                            const pipeElement = cellElement.querySelector('.pipe');
                            if (pipeElement) {
                                const rotations = this.pipeTypes[cell.type].rotations;
                                const initialType = rotations[cell.rotation];
                                pipeElement.className = `pipe ${initialType}`;
                            }
                            
                            // Reset rotation counter
                            const posKey = `${row},${col}`;
                            const rotationLimit = this.difficultySettings[this.difficulty].rotationLimit;
                            this.rotationLimits.set(posKey, rotationLimit);
                            
                            const counterElement = cellElement.querySelector('.rotation-counter');
                            if (counterElement) {
                                counterElement.textContent = rotationLimit;
                                counterElement.title = `${rotationLimit} rotations remaining`;
                                counterElement.classList.remove('low-rotations', 'no-rotations');
                            }
                        }
                    }
                }
            }
        }
        
        // Hide next level button and reset restart button text
        document.getElementById('next-level-btn').style.display = 'none';
        document.getElementById('restart-btn').textContent = 'Restart Level';
        
        // Reset time based on current difficulty
        this.timeLeft = this.difficultySettings[this.difficulty].timeLimit;
        this.updateDisplay();
    }
    
    nextLevel() {
        // Increment level first
        this.currentLevel++;
        
        // Stop current game
        this.gameActive = false;
        clearInterval(this.timer);
        
        // Hide next level button immediately
        const nextLevelBtn = document.getElementById('next-level-btn');
        nextLevelBtn.style.display = 'none';
        
        // Reset restart button text
        document.getElementById('restart-btn').textContent = 'Restart Level';
        
        // Clear any messages
        document.getElementById('milestone-message').style.display = 'none';
        document.getElementById('game-status').textContent = '';
        
        // Update display with new level immediately
        this.updateDisplay();
        
        // Create completely new level
        this.createNewLevel();
    }
    
    createNewLevel() {
        // Clear water flow
        this.clearWaterFlow();
        
        // Reset rotation limits
        this.rotationLimits.clear();
        
        // Get the game board
        const board = document.getElementById('game-board');
        board.innerHTML = '';
        
        // Reset grids
        this.grid = [];
        this.initialGrid = [];
        
        // Build new board from scratch
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
                    // Random pipe piece
                    const pipeType = this.getRandomPipeType();
                    const rotation = Math.floor(Math.random() * 4);
                    
                    const pipe = document.createElement('div');
                    pipe.className = `pipe ${pipeType}`;
                    cell.appendChild(pipe);
                    
                    // Set rotation limit
                    const posKey = `${row},${col}`;
                    const rotationLimit = this.difficultySettings[this.difficulty].rotationLimit;
                    this.rotationLimits.set(posKey, rotationLimit);
                    
                    // Add rotation counter
                    const counter = document.createElement('div');
                    counter.className = 'rotation-counter';
                    counter.textContent = rotationLimit;
                    counter.title = `${rotationLimit} rotations remaining`;
                    cell.appendChild(counter);
                    
                    this.grid[row][col] = { type: pipeType, rotation: rotation };
                    this.initialGrid[row][col] = { type: pipeType, rotation: rotation };
                    
                    // Add click event listener
                    cell.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.rotatePipe(row, col);
                    });
                }
                
                board.appendChild(cell);
            }
        }
        
        // Fix pipe visuals
        setTimeout(() => {
            this.updateAllPipeVisuals();
        }, 50);
        
        // Start the new level
        setTimeout(() => {
            this.startNewLevel();
        }, 100);
    }
    
    startNewLevel() {
        // Hide next level button when starting new level
        const nextLevelBtn = document.getElementById('next-level-btn');
        if (nextLevelBtn) {
            nextLevelBtn.style.display = 'none';
        }
        
        // Reset game state
        this.gameActive = true;
        this.timeLeft = this.difficultySettings[this.difficulty].timeLimit;
        this.waterFlowActive = false;
        
        // Update display
        this.updateDisplay();
        
        // Start timer
        this.startTimer();
        
        // Show level start message
        this.showMessage(`🎮 Level ${this.currentLevel} started! Difficulty: ${this.difficultySettings[this.difficulty].name}`, 'info');
    }
    
    updateDisplay() {
        document.getElementById('timer').textContent = this.timeLeft;
        document.getElementById('score').textContent = this.score.toLocaleString();
        document.getElementById('level').textContent = this.currentLevel;
        
        // Add warning class to timer when time is low
        const timerElement = document.getElementById('timer');
        if (this.timeLeft <= 10) {
            timerElement.classList.add('warning');
        } else {
            timerElement.classList.remove('warning');
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
    
    updateAllPipeVisuals() {
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.grid[row][col];
                if (cell.type !== 'source' && cell.type !== 'destination') {
                    const pipeElement = document.querySelector(`[data-row="${row}"][data-col="${col}"] .pipe`);
                    if (pipeElement) {
                        const rotations = this.pipeTypes[cell.type].rotations;
                        const correctType = rotations[cell.rotation];
                        pipeElement.className = `pipe ${correctType}`;
                    }
                }
            }
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new PipelinePuzzler();
    
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
    
    // Add inspirational messages
    const inspirationalMessages = [
        "Every drop counts! 💧",
        "Building bridges with water! 🌊",
        "Connecting communities! 🤝",
        "Clean water changes everything! ✨",
        "Your puzzle skills help villages! 🏘️"
    ];
    
    setInterval(() => {
        const randomMessage = inspirationalMessages[Math.floor(Math.random() * inspirationalMessages.length)];
        const statusElement = document.getElementById('game-status');
        if (statusElement && statusElement.textContent === '') {
            statusElement.textContent = randomMessage;
            statusElement.className = 'status-message info';
            setTimeout(() => {
                if (statusElement.textContent === randomMessage) {
                    statusElement.textContent = '';
                    statusElement.className = 'status-message';
                }
            }, 2000);
        }
    }, 15000);
}); 