class WordleUI {
    constructor() {
        console.log("WordleUI: constructor starting...");
        try {
            this.board = document.getElementById('board');
            this.keyboard = document.getElementById('keyboard');
            this.overlay = document.getElementById('modal-overlay');
            this.messageContainer = document.getElementById('message-container');
            
            if (!this.board || !this.keyboard) {
                throw new Error("Critical UI elements (board or keyboard) not found in DOM!");
            }

            this.setupEventListeners();
            
            // If game is already ready, render now. Otherwise wait for game-started event.
            if (window.game && game.settings) {
                this.renderBoard();
                this.renderKeyboard();
                this.applySettings();
            } else {
                console.warn("WordleUI: game object not ready yet, waiting for game-started event...");
            }
            
            this.initAccordion();

            console.log("WordleUI: constructor finished successfully.");
        } catch (e) {
            console.error("WordleUI: constructor failed:", e);
        }
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            // Do not process game inputs if user is focusing a select dropdown, input, or textarea
            const targetTag = e.target.tagName;
            if (targetTag === 'SELECT' || targetTag === 'INPUT' || targetTag === 'TEXTAREA') {
                return;
            }

            // Do not process game inputs if a modal or the language dropdown is open
            if (this.overlay && !this.overlay.classList.contains('hidden')) {
                return;
            }
            const dropdown = document.getElementById('lang-dropdown');
            if (dropdown && dropdown.classList.contains('open')) {
                return;
            }

            if (e.key === 'Enter') this.handleEnter();
            else if (e.key === 'Backspace') this.handleBackspace();
            else if (/^\p{L}$/u.test(e.key)) this.handleLetter(e.key);
        });

        window.addEventListener('game-started', () => {
            console.log("WordleUI: Received game-started event.");
            this.renderBoard();
            this.renderKeyboard(true);
            this.resetKeyboard();
            this.applySettings();
        });

        document.getElementById('btn-help').onclick = () => this.showHelp();
        document.getElementById('btn-stats').onclick = () => this.showStats();
        document.getElementById('btn-settings').onclick = () => this.showSettings();
        document.getElementById('btn-give-up').onclick = () => this.giveUp();

        const selectEl = document.getElementById('lang-select');
        if (selectEl) {
            const savedLang = window.State ? State.loadLanguage() : 'en';
            selectEl.value = savedLang;
            
            // Set initial state for custom dropdown
            this.syncCustomDropdown(savedLang);

            selectEl.addEventListener('change', async (e) => {
                const val = e.target.value;
                selectEl.blur(); // Blur immediately to prevent keyboard selection hijacking
                this.syncCustomDropdown(val);
                if (window.game) {
                    await game.changeLanguage(val);
                }
            });
        }

        const dropdownTrigger = document.getElementById('lang-dropdown-trigger');
        const dropdown = document.getElementById('lang-dropdown');
        if (dropdownTrigger && dropdown) {
            dropdownTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            });

            const options = document.querySelectorAll('#lang-dropdown-options li');
            options.forEach(opt => {
                opt.addEventListener('click', () => {
                    const val = opt.getAttribute('data-value');
                    if (selectEl) {
                        selectEl.value = val;
                        selectEl.dispatchEvent(new Event('change'));
                    }
                    dropdown.classList.remove('open');
                });
            });

            document.addEventListener('click', () => {
                dropdown.classList.remove('open');
            });
        }
    }

    syncCustomDropdown(lang) {
        const trigger = document.getElementById('lang-dropdown-trigger');
        if (trigger) {
            const flagSpan = trigger.querySelector('.flag-icon');
            const textSpan = trigger.querySelector('.lang-text');
            if (flagSpan && textSpan) {
                flagSpan.className = `flag-icon flag-${lang}`;
                textSpan.textContent = lang.toUpperCase();
            }
        }
        const options = document.querySelectorAll('#lang-dropdown-options li');
        options.forEach(opt => {
            if (opt.getAttribute('data-value') === lang) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
    }

    initAccordion() {
        const questions = document.querySelectorAll('.faq-question');
        questions.forEach(question => {
            question.addEventListener('click', () => {
                const item = question.parentElement;
                const isActive = item.classList.contains('active');
                document.querySelectorAll('.faq-item').forEach(otherItem => {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.faq-icon').textContent = '+';
                });
                if (!isActive) {
                    item.classList.add('active');
                    question.querySelector('.faq-icon').textContent = '−';
                }
            });
        });
    }

    handleLetter(letter) {
        if (!window.game) return;
        game.addLetter(letter);
        this.updateBoard();
    }

    handleBackspace() {
        if (!window.game) return;
        game.removeLetter();
        this.updateBoard();
    }

    async handleEnter() {
        if (!window.game) return;
        const result = game.submitGuess();
        if (result.error) {
            this.showToast(result.error);
            this.shakeRow(game.guesses.length);
            return;
        }
        if (result.success) {
            await this.revealRow(game.guesses.length - 1, result.result);
            this.updateKeyboard();
            if (result.won) {
                setTimeout(() => {
                    this.bounceRow(game.guesses.length - 1);
                    const t = result.timeTaken;
                    const timeStr = t ? ` in ${t < 60 ? t + 's' : Math.floor(t/60) + 'm ' + (t%60) + 's'}` : '';
                    this.showToast(`Splendid! Finished${timeStr}`, 3000);
                    
                    // Trigger Confetti Celebration
                    if (typeof confetti === 'function') {
                        const duration = 5 * 1000;
                        const animationEnd = Date.now() + duration;
                        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

                        const randomInRange = (min, max) => Math.random() * (max - min) + min;

                        const interval = setInterval(function() {
                            const timeLeft = animationEnd - Date.now();

                            if (timeLeft <= 0) {
                                return clearInterval(interval);
                            }

                            const particleCount = 50 * (timeLeft / duration);
                            // since particles fall down, start a bit higher than random
                            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
                            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
                        }, 250);
                    }

                    setTimeout(() => this.showStats(), 1500);
                }, 500);
            } else if (result.lost) {
                const t = result.timeTaken;
                const timeStr = t ? ` (Time: ${t < 60 ? t + 's' : Math.floor(t/60) + 'm ' + (t%60) + 's'})` : '';
                this.showToast(game.targetWord.toUpperCase() + timeStr, 5000);
                setTimeout(() => this.showStats(), 2000);
            }
        }
    }

    renderBoard() {
        if (!window.game || !game.settings) return;
        console.log("WordleUI: rendering board...");
        this.board.innerHTML = '';
        const attempts = game.settings.attempts || 6;
        this.board.style.gridTemplateRows = `repeat(${attempts}, 1fr)`;
        const len = game.wordLength || 5;
        this.board.style.gridTemplateColumns = `repeat(${len}, 1fr)`;

        for (let i = 0; i < attempts; i++) {
            const row = document.createElement('div');
            row.className = 'row';
            for (let j = 0; j < len; j++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.setAttribute('data-state', 'empty');
                row.appendChild(tile);
            }
            this.board.appendChild(row);
        }
        
        game.guesses.forEach((guess, i) => {
            const row = this.board.children[i];
            if (row) {
                const evaluation = game.evaluateGuess(guess);
                evaluation.forEach((res, j) => {
                    const tile = row.children[j];
                    if (tile) {
                        tile.textContent = res.letter;
                        tile.setAttribute('data-state', res.state);
                    }
                });
            }
        });
    }

    updateBoard() {
        if (!window.game) return;
        const rowIndex = game.guesses.length;
        if (rowIndex >= game.settings.attempts) return;
        const row = this.board.children[rowIndex];
        if (!row) return;
        const letters = game.currentGuess.split('');
        const len = game.wordLength || 5;
        for (let i = 0; i < len; i++) {
            const tile = row.children[i];
            if (tile) {
                tile.textContent = letters[i] || '';
                tile.setAttribute('data-state', letters[i] ? 'toggled' : 'empty');
            }
        }
    }

    async revealRow(rowIndex, result) {
        const row = this.board.children[rowIndex];
        if (row) {
            const len = game.wordLength || 5;
            for (let i = 0; i < len; i++) {
                const tile = row.children[i];
                if (tile) {
                    tile.classList.add('flip');
                    await new Promise(r => setTimeout(r, 150));
                    tile.setAttribute('data-state', result[i].state);
                    tile.classList.remove('flip');
                }
            }
        }
    }

    shakeRow(rowIndex) {
        const row = this.board.children[rowIndex];
        if (row) {
            row.classList.add('shake');
            setTimeout(() => row.classList.remove('shake'), 500);
        }
    }

    bounceRow(rowIndex) {
        const row = this.board.children[rowIndex];
        if (row) {
            const len = game.wordLength || 5;
            for (let i = 0; i < len; i++) {
                const tile = row.children[i];
                if (tile) {
                    tile.classList.add('bounce');
                    tile.style.animationDelay = `${i * 100}ms`;
                }
            }
        }
    }

    renderKeyboard(force = false) {
        const lang = window.game ? game.currentLanguage : 'en';
        if (!force && this.renderedLanguage === lang) return;
        this.renderedLanguage = lang;
        console.log("WordleUI: rendering keyboard for language: " + lang);
        
        let rows;
        if (lang === 'en') {
            rows = [
                'qwertyuiop'.split(''),
                'asdfghjkl'.split(''),
                ['enter', ...'zxcvbnm'.split(''), 'backspace']
            ];
        } else {
            // Generate layout dynamically from the words in the active language
            const uniqueChars = new Set();
            if (window.game && game.words && game.words.valid) {
                game.words.valid.forEach(w => {
                    w.split('').forEach(c => {
                        const l = c.toLowerCase().trim();
                        if (l) uniqueChars.add(l);
                    });
                });
            }
            
            // Convert to array and sort alphabetically so users can easily find characters
            const chars = Array.from(uniqueChars).sort((a, b) => a.localeCompare(b));
            
            if (chars.length === 0) {
                rows = [
                    'qwertyuiop'.split(''),
                    'asdfghjkl'.split(''),
                    ['enter', ...'zxcvbnm'.split(''), 'backspace']
                ];
            } else {
                // Divide characters into 3 rows as evenly as possible
                const rowCount = 3;
                const perRow = Math.ceil(chars.length / rowCount);
                const r1 = chars.slice(0, perRow);
                const r2 = chars.slice(perRow, perRow * 2);
                const r3 = ['enter', ...chars.slice(perRow * 2), 'backspace'];
                rows = [r1, r2, r3];
            }
        }

        this.keyboard.innerHTML = '';
        rows.forEach(rowKeys => {
            const row = document.createElement('div');
            row.className = 'key-row';
            rowKeys.forEach(key => {
                const button = document.createElement('button');
                button.className = 'key';
                if (key === 'enter' || key === 'backspace') {
                    button.classList.add('wide');
                    button.textContent = key === 'backspace' ? '⌫' : 'ENTER';
                } else {
                    button.textContent = key;
                }
                button.setAttribute('data-key', key);
                button.onclick = (e) => {
                    e.preventDefault();
                    if (key === 'enter') this.handleEnter();
                    else if (key === 'backspace') this.handleBackspace();
                    else this.handleLetter(key);
                };
                row.appendChild(button);
            });
            this.keyboard.appendChild(row);
        });
    }

    resetKeyboard() {
        const keys = this.keyboard.querySelectorAll('.key');
        keys.forEach(key => key.removeAttribute('data-state'));
    }

    updateKeyboard() {
        if (!window.game) return;
        const letterStates = {};
        game.guesses.forEach(guess => {
            const evaluation = game.evaluateGuess(guess);
            evaluation.forEach(res => {
                const current = letterStates[res.letter] || 'absent';
                if (res.state === 'correct') letterStates[res.letter] = 'correct';
                else if (res.state === 'present' && current !== 'correct') letterStates[res.letter] = 'present';
                else if (res.state === 'absent' && current === 'absent') letterStates[res.letter] = 'absent';
            });
        });
        
        // Batch DOM updates
        requestAnimationFrame(() => {
            Object.entries(letterStates).forEach(([letter, state]) => {
                const key = this.keyboard.querySelector(`[data-key="${letter}"]`);
                if (key) key.setAttribute('data-state', state);
            });
        });
    }

    showToast(message, duration = 1500) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        this.messageContainer.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    }

    showModal(content) {
        this.overlay.innerHTML = '';
        const modal = document.createElement('div');
        modal.className = `modal ${content.className || ''}`;
        modal.innerHTML = `
            <div class="modal-header">
                <h2>${content.title}</h2>
                <button class="close-button">&times;</button>
            </div>
            <div class="modal-body">${content.body}</div>
        `;
        modal.querySelector('.close-button').onclick = () => this.hideModal();
        this.overlay.appendChild(modal);
        this.overlay.classList.remove('hidden');
    }

    hideModal() {
        this.overlay.classList.add('hidden');
    }

    showHelp() {
        this.showModal({
            title: 'How To Play',
            body: `
                <div class="help-content">
                    <p>Guess the Wordle in 6 tries.</p>
                    <ul>
                        <li>Each guess must be a valid 5-letter word.</li>
                        <li>The color of the tiles will change to show how close your guess was to the word.</li>
                    </ul>

                    <h3>Examples</h3>

                    <div class="help-example">
                        <div class="help-row">
                            <div class="tile" data-state="correct">W</div>
                            <div class="tile">O</div>
                            <div class="tile">R</div>
                            <div class="tile">D</div>
                            <div class="tile">Y</div>
                        </div>
                        <p><strong>W</strong> is in the word and in the correct spot.</p>
                    </div>

                    <div class="help-example">
                        <div class="help-row">
                            <div class="tile">L</div>
                            <div class="tile" data-state="present">I</div>
                            <div class="tile">G</div>
                            <div class="tile">H</div>
                            <div class="tile">T</div>
                        </div>
                        <p><strong>I</strong> is in the word but in the wrong spot.</p>
                    </div>

                    <div class="help-example">
                        <div class="help-row">
                            <div class="tile">R</div>
                            <div class="tile">O</div>
                            <div class="tile">G</div>
                            <div class="tile" data-state="absent">U</div>
                            <div class="tile">E</div>
                        </div>
                        <p><strong>U</strong> is not in the word in any spot.</p>
                    </div>
                </div>
            `
        });
    }

    async showStats() {
        if (!window.game) return;
        const stats = window.State ? await State.syncWithServer() : { 
            gamesPlayed: 0, 
            winPercentage: 0, 
            currentStreak: 0, 
            maxStreak: 0, 
            guesses: {},
            avgAttempts: 0,
            fastestWin: null
        };
        const maxGuess = Math.max(...Object.values(stats.guesses), 1);
        
        let guessGraph = '';
        for (let i = 1; i <= game.settings.attempts; i++) {
            const count = stats.guesses[i] || 0;
            const pct = Math.round((count / maxGuess) * 100);
            guessGraph += `
                <div class="graph-row">
                    <span>${i}</span>
                    <div class="graph-bar" style="width: ${Math.max(pct, 7)}%">${count}</div>
                </div>
            `;
        }

        const formatTime = (s) => {
            if (s == null) return '-';
            if (s < 60) return `${s}s`;
            return `${Math.floor(s / 60)}m ${s % 60}s`;
        };

        this.showModal({
            title: 'Statistics',
            body: `
                <div class="stats-grid">
                    <div class="stat-item"><span>${stats.gamesPlayed}</span>Played</div>
                    <div class="stat-item"><span>${stats.winPercentage}</span>Win %</div>
                    <div class="stat-item"><span>${stats.currentStreak}</span>Current Streak</div>
                    <div class="stat-item"><span>${stats.maxStreak}</span>Max Streak</div>
                </div>

                <div class="stats-extras" style="display: flex; justify-content: space-around; margin-top: 15px; font-size: 0.8rem; opacity: 0.8;">
                    ${game.isGameOver && game.lastTimeTaken != null ? `
                    <div class="extra-item">
                        <label>Time Taken: </label>
                        <span>${formatTime(game.lastTimeTaken)}</span>
                    </div>` : ''}
                    <div class="extra-item">
                        <label>Avg. Attempts: </label>
                        <span>${stats.avgAttempts || '0'}</span>
                    </div>
                    <div class="extra-item">
                        <label>Fastest Win: </label>
                        <span>${formatTime(stats.fastestWin)}</span>
                    </div>
                </div>

                <h3 style="margin-top: 20px; font-size: 1rem; text-transform: uppercase;">Guess Distribution</h3>
                <div class="guess-graph">${guessGraph}</div>

                <div class="stat-footer" style="display: flex; gap: 10px; margin-top: 20px;">
                    ${game.isGameOver ? `<button class="btn-primary" onclick="ui.shareResult()">Share Result</button>` : ''}
                    <button class="btn-secondary" onclick="game.startNewGame(); ui.hideModal();">Play Again</button>
                </div>
            `
        });
    }

    showSettings() {
        if (!window.game) return;
        const s = game.settings;
        
        // Determine selected value for the unified dropdown
        let currentThemeVal = 'light';
        if (s.theme === 'neon') currentThemeVal = 'neon';
        else if (s.theme === 'retro') currentThemeVal = 'retro';
        else if (s.theme === 'ocean') currentThemeVal = 'ocean';
        else if (s.darkMode) currentThemeVal = 'dark';

        this.showModal({
            title: 'Settings',
            body: `
                <div class="setting-item">
                    <div>
                        <strong>Game Difficulty</strong>
                        <p>Hard Mode: Revealed hints must be used</p>
                    </div>
                    <select id="setting-hard" onchange="ui.saveSettings()">
                        <option value="false" ${!s.hardMode ? 'selected' : ''}>Normal</option>
                        <option value="true" ${s.hardMode ? 'selected' : ''}>Hard Mode</option>
                    </select>
                </div>
                <div class="setting-item">
                    <strong>Appearance</strong>
                    <select id="setting-appearance" onchange="ui.saveSettings()">
                        <option value="light" ${currentThemeVal === 'light' ? 'selected' : ''}>Light Mode (Default)</option>
                        <option value="dark" ${currentThemeVal === 'dark' ? 'selected' : ''}>Dark Mode</option>
                        <option value="neon" ${currentThemeVal === 'neon' ? 'selected' : ''}>Cyber Neon</option>
                        <option value="retro" ${currentThemeVal === 'retro' ? 'selected' : ''}>Retro Vintage</option>
                        <option value="ocean" ${currentThemeVal === 'ocean' ? 'selected' : ''}>Deep Ocean</option>
                    </select>
                </div>
                <div class="setting-item">
                    <strong>Attempts</strong>
                    <select id="setting-attempts" onchange="ui.saveSettings()">
                        <option value="6" ${s.attempts === 6 ? 'selected' : ''}>6</option>
                        <option value="7" ${s.attempts === 7 ? 'selected' : ''}>7</option>
                        <option value="8" ${s.attempts === 8 ? 'selected' : ''}>8</option>
                    </select>
                </div>
                <div class="setting-item">
                    <div>
                        <strong>High Contrast Mode</strong>
                        <p>For improved color vision</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="setting-hc" ${s.highContrast ? 'checked' : ''} onchange="ui.saveSettings()">
                        <span class="slider"></span>
                    </label>
                </div>
            `
        });
    }

    saveSettings() {
        if (!window.game) return;
        
        const appearanceEl = document.getElementById('setting-appearance');
        const hardEl = document.getElementById('setting-hard');
        const hcEl = document.getElementById('setting-hc');
        const attemptsEl = document.getElementById('setting-attempts');

        if (!appearanceEl || !hardEl || !hcEl || !attemptsEl) return;

        const appearance = appearanceEl.value;
        let selectedTheme = 'default';
        let isDarkMode = false;

        if (appearance === 'dark') {
            isDarkMode = true;
        } else if (appearance === 'neon') {
            selectedTheme = 'neon';
            isDarkMode = true;
        } else if (appearance === 'retro') {
            selectedTheme = 'retro';
            isDarkMode = false;
        } else if (appearance === 'ocean') {
            selectedTheme = 'ocean';
            isDarkMode = true;
        }

        const settings = {
            hardMode: hardEl.value === 'true',
            darkMode: isDarkMode,
            highContrast: hcEl.checked,
            attempts: parseInt(attemptsEl.value),
            theme: selectedTheme,
            mode: game.mode,
            soundEnabled: true
        };
        
        const oldAttempts = game.settings.attempts;
        const oldMode = game.mode;
        
        if (window.State) State.saveSettings(settings);
        game.settings = settings;
        game.mode = settings.mode;
        
        if (oldAttempts !== settings.attempts || oldMode !== settings.mode) {
            game.startNewGame();
        }
        
        this.applySettings();
    }

    applySettings() {
        if (!window.game) return;
        const s = game.settings;
        document.body.classList.toggle('dark-mode', s.darkMode);
        document.body.classList.toggle('high-contrast', s.highContrast);
        
        document.body.classList.remove('theme-neon', 'theme-retro', 'theme-ocean');
        if (s.theme && s.theme !== 'default') {
            document.body.classList.add(`theme-${s.theme}`);
        }
        
        this.renderBoard();
    }

    shareResult() {
        if (!window.game) return;
        const emojiGrid = this.generateEmojiGrid();
        const text = `Wordle Unlimited ${game.guesses.length}/${game.settings.attempts}\n\n${emojiGrid}`;
        const encodedText = encodeURIComponent(text);
        
        this.showModal({
            title: 'Share Result',
            body: `
                <div class="share-container" style="text-align: center;">
                    <div class="emoji-preview" style="font-size: 1.2rem; margin-bottom: 20px; line-height: 1.2;">${emojiGrid.replace(/\n/g, '<br>')}</div>
                    <div class="share-actions" style="display: flex; flex-direction: column; gap: 10px;">
                        <button class="btn-primary" onclick="ui.socialShare('whatsapp', '${encodedText}')" style="display: flex; align-items: center; justify-content: center;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-14h.1c4.4 0 8 3.6 8 8z"/><path d="M16 8l-1.5 1.5M10 13l4-4"/></svg>
                            WHATSAPP
                        </button>
                        <button class="btn-primary" onclick="ui.socialShare('twitter', '${encodedText}')" style="display: flex; align-items: center; justify-content: center;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                            TWITTER
                        </button>
                        <button class="btn-primary" onclick="ui.socialShare('instagram', '${encodedText}')" style="display: flex; align-items: center; justify-content: center;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                            INSTAGRAM
                        </button>
                        <button class="btn-secondary" onclick="ui.copyToClipboard('${encodedText}')" style="display: flex; align-items: center; justify-content: center;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
                            COPY TO CLIPBOARD
                        </button>
                    </div>
                </div>
            `
        });
    }

    generateEmojiGrid() {
        const emojiMap = {
            'correct': '🟩',
            'present': '🟨',
            'absent': '⬛'
        };
        
        return game.guesses.map(guess => {
            const evalResult = game.evaluateGuess(guess);
            return evalResult.map(res => emojiMap[res.state]).join('');
        }).join('\n');
    }

    socialShare(platform, text) {
        const urls = {
            whatsapp: `https://wa.me/?text=${text}`,
            twitter: `https://twitter.com/intent/tweet?text=${text}`,
            instagram: `https://www.instagram.com/`
        };
        
        if (platform === 'instagram') {
            this.copyToClipboard(text);
            this.showToast('Result copied! Opening Instagram...');
            setTimeout(() => window.open(urls[platform], '_blank'), 1000);
        } else {
            window.open(urls[platform], '_blank');
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(decodeURIComponent(text)).then(() => {
            this.showToast('Result copied to clipboard!');
        });
    }

    giveUp() {
        if (!window.game || game.isGameOver) return;
        this.showModal({
            title: 'Give Up?',
            body: `
                <div style="text-align: center; padding: 20px;">
                    <p style="margin-bottom: 20px;">Are you sure you want to give up on this word?</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button class="btn-primary" onclick="ui.confirmGiveUp()">Yes, Give Up</button>
                        <button class="btn-secondary" onclick="ui.hideModal()">No, Keep Playing</button>
                    </div>
                </div>
            `
        });
    }

    confirmGiveUp() {
        if (!window.game || game.isGameOver) return;
        const target = game.targetWord.toUpperCase();
        game.isGameOver = true;
        
        let timeTaken = null;
        if (window.game.startTime) {
            timeTaken = Math.floor((Date.now() - game.startTime) / 1000);
        }
        if (window.State) {
            State.updateStats(false, game.guesses.length, timeTaken);
        }
        
        this.showModal({
            title: 'Game Over',
            body: `
                <div style="text-align: center; padding: 20px;">
                    <p style="margin-bottom: 20px;">The word was: <strong style="color: var(--color-correct); font-size: 1.5rem;">${target}</strong></p>
                    <button class="btn-primary" onclick="game.startNewGame(); ui.hideModal();">New Game</button>
                </div>
            `
        });
    }
}

// Global instance
try {
    window.ui = new WordleUI();
    console.log("WordleUI: global instance created.");
} catch (e) {
    console.error("WordleUI: failed to create global instance:", e);
}

