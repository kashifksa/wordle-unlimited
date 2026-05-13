class WordleGame {
    constructor() {
        console.log("WordleGame: constructor starting...");
        try {
            this.mode = 'unlimited'; // 'daily' or 'unlimited'
            this.targetWord = '';
            this.guesses = [];
            this.currentGuess = '';
            this.isGameOver = false;
            
            if (window.State) {
                this.settings = State.loadSettings();
                console.log("WordleGame: Settings loaded from State.");
            } else {
                console.error("WordleGame: State object not found!");
                this.settings = {
                    darkMode: true,
                    highContrast: false,
                    hardMode: false,
                    theme: 'default',
                    attempts: 6,
                    soundEnabled: true
                };
            }
            
            this.words = { valid: [] };
            this.startTime = null;
            this.init();
            console.log("WordleGame: constructor finished.");
        } catch (e) {
            console.error("WordleGame: constructor failed:", e);
        }
    }

    async init() {
        console.log("WordleGame: init() starting...");
        try {
            const response = await fetch('data/words.json');
            if (!response.ok) throw new Error("Failed to fetch words.json");
            this.words = await response.json();
            console.log("WordleGame: words loaded.");
            
            if (window.State) {
                await State.syncWithServer();
                let shuffled = State.loadShuffledWords();
                if (!shuffled || shuffled.length !== this.words.valid.length) {
                    this.reshuffleWords();
                }
            }
            
            this.startNewGame();
            console.log("WordleGame: init() finished.");
        } catch (error) {
            console.error('WordleGame: init() failed:', error);
        }
    }

    reshuffleWords() {
        const shuffled = [...this.words.valid];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        if (window.State) {
            State.saveShuffledWords(shuffled);
            State.saveCurrentIndex(0);
        }
    }

    startNewGame() {
        this.isGameOver = false;
        this.guesses = [];
        this.currentGuess = '';
        this.startTime = Date.now();
        
        this.targetWord = this.getNextWord();
        if (window.State) State.clearGameState();
        
        console.log('WordleGame: New game started. Target Word:', this.targetWord);
        window.dispatchEvent(new CustomEvent('game-started'));
    }

    getNextWord() {
        const shuffled = window.State ? State.loadShuffledWords() : null;
        if (!shuffled) {
            // Fallback
            return this.words.valid[Math.floor(Math.random() * this.words.valid.length)] || "wordle";
        }
        
        if (this.mode === 'daily') {
            const now = new Date();
            const start = new Date(2021, 5, 19); 
            const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
            const index = diff % shuffled.length;
            return shuffled[index];
        } else {
            let index = State.loadCurrentIndex();
            if (index >= shuffled.length) {
                this.reshuffleWords();
                index = 0;
            }
            const word = shuffled[index];
            State.saveCurrentIndex(index + 1);
            return word;
        }
    }

    submitGuess() {
        if (this.currentGuess.length !== 5) return { error: 'Not enough letters' };
        if (!this.words.valid.includes(this.currentGuess.toLowerCase())) return { error: 'Not in word list' };

        if (this.settings.hardMode && this.guesses.length > 0) {
            const lastEval = this.evaluateGuess(this.guesses[this.guesses.length - 1]);
            for (let i = 0; i < 5; i++) {
                if (lastEval[i].state === 'correct' && this.currentGuess[i] !== this.targetWord[i]) {
                    return { error: `Must use ${this.targetWord[i].toUpperCase()} in position ${i+1}` };
                }
            }
            const lastPresent = lastEval.filter(e => e.state === 'present').map(e => e.letter);
            for (const letter of lastPresent) {
                if (!this.currentGuess.includes(letter)) {
                    return { error: `Guess must contain ${letter.toUpperCase()}` };
                }
            }
        }

        const result = this.evaluateGuess(this.currentGuess);
        this.guesses.push(this.currentGuess);
        const won = this.currentGuess === this.targetWord;
        const lost = !won && this.guesses.length >= this.settings.attempts;
        
        this.isGameOver = won || lost;
        
        let timeTaken = null;
        if (this.isGameOver) {
            timeTaken = Math.floor((Date.now() - this.startTime) / 1000);
            this.lastTimeTaken = timeTaken;
            if (window.State) {
                State.updateStats(won, this.guesses.length, timeTaken);
            }
        }

        const prevGuess = this.currentGuess;
        this.currentGuess = '';
        
        return { success: true, won, lost, result, guess: prevGuess, timeTaken };
    }

    evaluateGuess(guess) {
        const result = Array(5).fill(null).map((_, i) => ({ letter: guess[i], state: 'absent' }));
        const targetArr = this.targetWord.split('');
        const guessArr = guess.split('');

        for (let i = 0; i < 5; i++) {
            if (guessArr[i] === targetArr[i]) {
                result[i].state = 'correct';
                targetArr[i] = null;
                guessArr[i] = null;
            }
        }
        for (let i = 0; i < 5; i++) {
            if (guessArr[i] !== null) {
                const targetIndex = targetArr.indexOf(guessArr[i]);
                if (targetIndex !== -1) {
                    result[i].state = 'present';
                    targetArr[targetIndex] = null;
                }
            }
        }
        return result;
    }

    addLetter(letter) {
        if (this.isGameOver || this.currentGuess.length >= 5) return;
        this.currentGuess += letter.toLowerCase();
    }

    removeLetter() {
        if (this.isGameOver || this.currentGuess.length === 0) return;
        this.currentGuess = this.currentGuess.slice(0, -1);
    }
}

// Global instance
try {
    window.game = new WordleGame();
    console.log("WordleGame: global instance created.");
} catch (e) {
    console.error("WordleGame: failed to create global instance:", e);
}
