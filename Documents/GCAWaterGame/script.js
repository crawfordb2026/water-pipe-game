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
        
        // Pipe types and their connections - Fixed with 4 orientations each
        this.pipeTypes = {
            'straight-horizontal': { 
                connections: ['left', 'right'], 
                rotations: ['straight-horizontal', 'straight-vertical', 'straight-horizontal', 'straight-vertical'] 
            },
            'straight-vertical': { 
                connections: ['top', 'bottom'], 
                rotations: ['straight-vertical', 'straight-horizontal', 'straight-vertical', 'straight-horizontal'] 
            },
            'curve-ne': { 
                connections: ['top', 'right'], 
                rotations: ['curve-ne', 'curve-se', 'curve-sw', 'curve-nw'] 
            },
            'curve-se': { 
                connections: ['bottom', 'right'], 
                rotations: ['curve-se', 'curve-sw', 'curve-nw', 'curve-ne'] 
            },
            'curve-sw': { 
                connections: ['bottom', 'left'], 
                rotations: ['curve-sw', 'curve-nw', 'curve-ne', 'curve-se'] 
            },
            'curve-nw': { 
                connections: ['top', 'left'], 
                rotations: ['curve-nw', 'curve-ne', 'curve-se', 'curve-sw'] 
            },
            't-junction': { 
                connections: ['top', 'left', 'right'], 
                rotations: ['t-junction', 't-junction-right', 't-junction-bottom', 't-junction-left'] 
            },
            'cross-junction': {
                connections: ['top', 'bottom', 'left', 'right'],
                rotations: ['cross-junction', 'cross-junction', 'cross-junction', 'cross-junction']
            }
        };
        
        this.init();
    }
    
    init() {
        this.createBoard();
        this.startGame();
        this.bindEvents();
    }
    
    bindEvents() {
        document.getElementById('restart-btn').addEventListener('click', () => this.restartLevel());
        document.getElementById('next-level-btn').addEventListener('click', () => this.nextLevel());
        document.getElementById('modal-btn').addEventListener('click', () => this.hideModal());
    }
    
    createBoard() {
        const board = document.getElementById('game-board');
        board.innerHTML = '';
        this.grid = [];
        this.initialGrid = []; // Reset initial state
        
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
                    
                    this.grid[row][col] = { type: pipeType, rotation: rotation };
                    this.initialGrid[row][col] = { type: pipeType, rotation: rotation }; // Save initial state
                    
                    cell.addEventListener('click', () => this.rotatePipe(row, col));
                }
                
                board.appendChild(cell);
            }
        }
    }
    
    getRandomPipeType() {
        const types = Object.keys(this.pipeTypes);
        return types[Math.floor(Math.random() * types.length)];
    }
    
    rotatePipe(row, col) {
        if (!this.gameActive) return;
        
        const cell = this.grid[row][col];
        if (cell.type === 'source' || cell.type === 'destination') return;
        
        // Rotate the pipe 90 degrees clockwise
        cell.rotation = (cell.rotation + 1) % 4;
        
        // Update visual immediately and reliably
        const pipeElement = document.querySelector(`[data-row="${row}"][data-col="${col}"] .pipe`);
        if (pipeElement) {
            const rotations = this.pipeTypes[cell.type].rotations;
            const newType = rotations[cell.rotation];
            
            // Force reflow to ensure immediate visual update
            pipeElement.className = `pipe ${newType}`;
            pipeElement.offsetHeight; // Force reflow
        }
        
        // Check if puzzle is solved with a longer delay to ensure visual update completes
        setTimeout(() => this.checkConnection(), 150);
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
            ['top', 'left', 'right'],    // t-junction (top open)
            ['top', 'bottom', 'right'],  // t-junction-right (left open)
            ['left', 'right', 'bottom'], // t-junction-bottom (top open)
            ['top', 'bottom', 'left']    // t-junction-left (right open)
        ];
        return tJunctionConnections[rotation];
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
        
        // Calculate score (bonus for remaining time)
        const timeBonus = this.timeLeft * 10;
        const levelBonus = this.currentLevel * 100;
        this.score += timeBonus + levelBonus;
        
        this.updateDisplay();
        this.showMessage('🎉 Level Complete! Water is flowing!', 'success');
        
        document.getElementById('next-level-btn').style.display = 'inline-block';
        document.getElementById('restart-btn').textContent = 'Replay Level';
    }
    
    startGame() {
        this.gameActive = true;
        this.timeLeft = 50;
        this.clearWaterFlow();
        this.updateDisplay();
        this.showMessage('Connect the pipes to bring water to the village!', 'info');
        
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
        this.showMessage('⏰ Time\'s up! Try again!', 'error');
        this.showModal('Time\'s Up!', 'The village still needs water. Try connecting the pipes faster!', 'Try Again');
    }
    
    restartLevel() {
        // Reset to initial positions instead of creating new level
        this.resetToInitialState();
        this.startGame();
    }
    
    resetToInitialState() {
        const board = document.getElementById('game-board');
        
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
        if (statusElement.textContent === '') {
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