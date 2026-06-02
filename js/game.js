class WordleGame {
    constructor() {
        console.log("WordleGame: constructor starting...");
        try {
            this.mode = 'unlimited'; // 'daily' or 'unlimited'
            this.targetWord = '';
            this.guesses = [];
            this.currentGuess = '';
            this.isGameOver = false;
            this.languageCache = {};
            this.currentLanguage = 'en';
            this.wordLength = 5;
            
            if (window.State) {
                this.settings = State.loadSettings();
                this.mode = this.settings.mode || 'unlimited';
                console.log("WordleGame: Settings loaded from State. Mode:", this.mode);
            } else {
                console.error("WordleGame: State object not found!");
                this.settings = {
                    darkMode: true,
                    highContrast: false,
                    hardMode: false,
                    theme: 'default',
                    attempts: 6,
                    soundEnabled: true,
                    mode: 'unlimited'
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
            const lang = window.State ? State.loadLanguage() : 'en';
            await this.loadLanguageData(lang);
            
            if (window.State) {
                await State.syncWithServer();
                // Avoid race conditions if the user manually changed the language while sync was in progress
                const currentLang = window.State ? State.loadLanguage() : 'en';
                if (currentLang !== lang) {
                    console.log(`WordleGame: init interrupted because language changed from ${lang} to ${currentLang}`);
                    return;
                }
                let shuffled = State.loadShuffledWords();
                const isCorrectLanguage = shuffled && shuffled.length > 0 && this.words.valid.includes(shuffled[0]);
                if (!shuffled || shuffled.length !== this.words.valid.length || !isCorrectLanguage) {
                    this.reshuffleWords();
                }
            }
            
            await this.startNewGame();
            console.log("WordleGame: init() finished.");
        } catch (error) {
            console.error('WordleGame: init() failed:', error);
        }
    }

    async loadLanguageData(lang) {
        this.currentLanguage = lang;
        if (lang === 'en') {
            if (this.languageCache['en']) {
                this.words = this.languageCache['en'];
            } else {
                if (window.wordList) {
                    this.words = window.wordList;
                } else {
                    const response = await fetch('data/words.json');
                    if (!response.ok) throw new Error("Failed to fetch words.json");
                    this.words = await response.json();
                }
                this.languageCache['en'] = this.words;
            }
            this.wordLength = 5;
            const container = document.getElementById('game-container');
            if (container) container.removeAttribute('dir');
        } else {
            if (this.languageCache[lang]) {
                const data = this.languageCache[lang];
                this.words = { valid: data.words || [] };
                this.wordLength = data.wordLength || 5;
                const container = document.getElementById('game-container');
                if (container) {
                    if (data.direction === 'rtl') {
                        container.setAttribute('dir', 'rtl');
                    } else {
                        container.removeAttribute('dir');
                    }
                }
            } else {
                try {
                    const response = await fetch(`languages/${lang}.json`);
                    if (!response.ok) throw new Error(`Failed to fetch languages/${lang}.json`);
                    const data = await response.json();
                    this.languageCache[lang] = data;
                    this.words = { valid: data.words || [] };
                    this.wordLength = data.wordLength || 5;
                    const container = document.getElementById('game-container');
                    if (container) {
                        if (data.direction === 'rtl') {
                            container.setAttribute('dir', 'rtl');
                        } else {
                            container.removeAttribute('dir');
                        }
                    }
                } catch (e) {
                    console.error(`Error loading language ${lang}, falling back to English:`, e);
                    this.currentLanguage = 'en';
                    if (window.State) State.saveLanguage('en');
                    const selectEl = document.getElementById('lang-select');
                    if (selectEl) selectEl.value = 'en';
                    
                    // Show a helpful user-facing error message
                    if (window.ui && typeof window.ui.showToast === 'function') {
                        let errorMsg = `Failed to load ${lang.toUpperCase()} language file.`;
                        if (window.location.protocol === 'file:') {
                            errorMsg = `CORS Restriction: Please run the game via a local web server (e.g. localhost) to load other languages.`;
                        }
                        window.ui.showToast(errorMsg, 5000);
                    }
                    
                    await this.loadLanguageData('en');
                }
            }
        }
    }

    async changeLanguage(lang) {
        if (window.State) State.saveLanguage(lang);
        await this.loadLanguageData(lang);
        
        if (lang !== 'en' && this.mode === 'nyt') {
            this.mode = 'unlimited';
            this.settings.mode = 'unlimited';
            if (window.State) State.saveSettings(this.settings);
        }

        if (window.State) {
            this.reshuffleWords();
        }
        await this.startNewGame();
        if (window.ui) {
            ui.renderBoard();
            ui.renderKeyboard(true);
            ui.resetKeyboard();
            ui.applySettings();
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

    async startNewGame() {
        let transitionFromNyt = false;
        if (this.mode === 'nyt' && this.isGameOver) {
            transitionFromNyt = true;
            this.mode = 'unlimited';
            this.settings.mode = 'unlimited';
            if (window.State) State.saveSettings(this.settings);
        }

        this.isGameOver = false;
        this.guesses = [];
        this.currentGuess = '';
        this.startTime = Date.now();
        
        try {
            this.targetWord = await this.getNextWord();
        } catch (e) {
            console.error("Error setting target word, falling back:", e);
            this.targetWord = 'wordle';
        }
        if (window.State) State.clearGameState();
        
        console.log('WordleGame: New game started. Target Word:', this.targetWord);
        window.dispatchEvent(new CustomEvent('game-started'));

        if (transitionFromNyt && window.ui) {
            setTimeout(() => {
                window.ui.showToast("Daily Challenge completed! Switched to Unlimited mode.");
            }, 100);
        }
    }

    async getNextWord() {
        if (this.mode === 'nyt') {
            try {
                const word = await this.loadNYTWord();
                if (word && word.length === this.wordLength) {
                    return word.toLowerCase();
                }
            } catch (e) {
                console.error("Failed to load NYT word, falling back to local pool:", e);
                if (window.ui) {
                    window.ui.showToast("Connection failed. Loaded fallback word.", 3000);
                }
            }
        }

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

    getLocalWordPressApiUrl() {
        const pathname = window.location.pathname;
        const gameFolder = 'wordle-unlimited';
        const altGameFolder = 'wordleunlimited';
        let baseIdx = pathname.toLowerCase().indexOf(gameFolder);
        if (baseIdx === -1) {
            baseIdx = pathname.toLowerCase().indexOf(altGameFolder);
        }
        if (baseIdx !== -1) {
            return pathname.substring(0, baseIdx) + 'wp-json/wordle/v1';
        }
        return '/TodayWordle/wp-json/wordle/v1';
    }

    getTodayWordApiUrl(useLocal = true) {
        if (useLocal) {
            return this.getLocalWordPressApiUrl();
        }
        return 'https://todaywordlehint.com/wp-json/wordle/v1';
    }

    getLocalDateString(offsetDays = 0) {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async fetchNYTWordFromApi(dateStr) {
        const tryFetch = async (baseUrl) => {
            const url = `${baseUrl}/data?date=${dateStr}`;
            const response = await fetch(url);
            if (response.ok) {
                const resData = await response.json();
                if (resData && resData.success) {
                    if (resData.word) {
                        return resData.word.toLowerCase();
                    } else if (resData.data && resData.data.word) {
                        return resData.data.word.toLowerCase();
                    }
                }
            }
            throw new Error(`Failed to fetch from ${baseUrl}`);
        };

        try {
            // 1. Try dynamically determined local folder path (case and subfolder preserved)
            return await tryFetch(this.getLocalWordPressApiUrl());
        } catch (e) {
            // Ignore
        }
        try {
            // 2. Try default root-relative camelcase path
            return await tryFetch('/TodayWordle/wp-json/wordle/v1');
        } catch (e) {
            // Ignore
        }
        try {
            // 3. Try directory-relative parent path
            return await tryFetch('../wp-json/wordle/v1');
        } catch (e) {
            // Ignore
        }
        // 4. Fall back to production absolute URL
        return await tryFetch('https://todaywordlehint.com/wp-json/wordle/v1');
    }

    async loadNYTWord() {
        const todayStr = this.getLocalDateString(0);
        const now = Date.now();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        // 1. Load cache from localStorage
        let cache = { last_fetch: 0, last_fetch_date: '', words: {} };
        try {
            const cachedStr = localStorage.getItem('wordle_nyt_cache');
            if (cachedStr) {
                const parsed = JSON.parse(cachedStr);
                if (parsed && typeof parsed === 'object') {
                    if (parsed.words) cache.words = parsed.words;
                    if (parsed.last_fetch) cache.last_fetch = parsed.last_fetch;
                    if (parsed.last_fetch_date) cache.last_fetch_date = parsed.last_fetch_date;
                }
            }
        } catch (e) {
            console.error("Error reading cache", e);
        }

        // 2. Clean up old cache entries (keep past 7 days and all future days)
        const cleanOldCache = (wordsObj) => {
            const cleaned = {};
            const cutoffDate = new Date(now - sevenDaysMs);
            for (const [dateKey, val] of Object.entries(wordsObj)) {
                const itemDate = new Date(dateKey);
                if (!isNaN(itemDate.getTime()) && (itemDate >= cutoffDate || dateKey >= todayStr)) {
                    cleaned[dateKey] = val;
                }
            }
            return cleaned;
        };

        cache.words = cleanOldCache(cache.words);

        // 3. Helper to fetch rolling window (yesterday + today + next 7 days) and update cache
        const fetchWindow = async () => {
            const yesterdayStr = this.getLocalDateString(-1);
            const fetchDates = [yesterdayStr];
            for (let i = 0; i <= 7; i++) {
                fetchDates.push(this.getLocalDateString(i));
            }
            let updated = false;

            await Promise.all(fetchDates.map(async (dStr) => {
                if (!cache.words[dStr] || cache.words[dStr].length !== this.wordLength) {
                    try {
                        const word = await this.fetchNYTWordFromApi(dStr);
                        if (word && word.length === this.wordLength) {
                            cache.words[dStr] = word;
                            updated = true;
                        }
                    } catch (err) {
                        console.warn(`Failed to fetch/cache NYT word for date: ${dStr}`, err);
                    }
                }
            }));

            if (updated || cache.last_fetch_date !== todayStr) {
                cache.last_fetch = Date.now();
                cache.last_fetch_date = todayStr;
                try {
                    localStorage.setItem('wordle_nyt_cache', JSON.stringify(cache));
                } catch (e) {
                    console.error("Failed to save cache", e);
                }
            }
        };

        // 4. If today's word is already cached, return it instantly and refresh in background if a calendar day has passed
        if (cache.words[todayStr] && cache.words[todayStr].length === this.wordLength) {
            console.log("NYT Mode: Instant load from local cache for date:", todayStr, "word:", cache.words[todayStr]);
            if (cache.last_fetch_date !== todayStr) {
                console.log("NYT Mode: Calendar day changed. Refreshing rolling window in background...");
                fetchWindow();
            }
            return cache.words[todayStr];
        }

        // 5. If missing, fetch synchronously
        console.log("NYT Mode: Word missing for date:", todayStr, ". Fetching synchronously...");
        await fetchWindow();

        if (cache.words[todayStr] && cache.words[todayStr].length === this.wordLength) {
            return cache.words[todayStr];
        }

        // 6. Emergency fallback
        try {
            // Try relative local paths first
            let response = await fetch(this.getLocalWordPressApiUrl() + '/today');
            if (!response.ok) {
                response = await fetch('/TodayWordle/wp-json/wordle/v1/today');
            }
            if (!response.ok) {
                response = await fetch('../wp-json/wordle/v1/today');
            }
            if (!response.ok) {
                response = await fetch('https://todaywordlehint.com/wp-json/wordle/v1/today');
            }
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    const word = data.word || (data.data && data.data.word);
                    if (word && word.length === this.wordLength) {
                        return word.toLowerCase();
                    }
                }
            }
        } catch (e) {
            console.error("Emergency fallback failed:", e);
        }

        throw new Error("Could not load today's NYT word");
    }

    submitGuess() {
        const len = this.wordLength || 5;
        if (this.currentGuess.length !== len) return { error: 'Not enough letters' };
        const guessLower = this.currentGuess.toLowerCase();
        if (this.guesses.includes(guessLower)) return { error: 'Already guessed' };
        if (!this.words.valid.includes(guessLower)) return { error: 'Not in word list' };

        if (this.settings.hardMode && this.guesses.length > 0) {
            const requiredPositions = Array(len).fill(null);
            const requiredLetters = new Set();
            
            for (const prevGuess of this.guesses) {
                const evaluation = this.evaluateGuess(prevGuess);
                for (let i = 0; i < len; i++) {
                    if (evaluation[i].state === 'correct') {
                        requiredPositions[i] = evaluation[i].letter;
                        requiredLetters.add(evaluation[i].letter);
                    } else if (evaluation[i].state === 'present') {
                        requiredLetters.add(evaluation[i].letter);
                    }
                }
            }
            
            for (let i = 0; i < len; i++) {
                if (requiredPositions[i] && this.currentGuess[i] !== requiredPositions[i]) {
                    return { error: `Must use ${requiredPositions[i].toUpperCase()} in position ${i+1}` };
                }
            }
            
            for (const letter of requiredLetters) {
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
        const len = this.wordLength || 5;
        const result = Array(len).fill(null).map((_, i) => ({ letter: guess[i], state: 'absent' }));
        const targetArr = this.targetWord.split('');
        const guessArr = guess.split('');

        for (let i = 0; i < len; i++) {
            if (guessArr[i] === targetArr[i]) {
                result[i].state = 'correct';
                targetArr[i] = null;
                guessArr[i] = null;
            }
        }
        for (let i = 0; i < len; i++) {
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
        const len = this.wordLength || 5;
        if (this.isGameOver || this.currentGuess.length >= len) return;
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
