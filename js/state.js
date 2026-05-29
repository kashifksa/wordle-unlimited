console.log("state.js: starting initialization...");

// Security Obfuscation: Keys are encoded to hide them from plain sight
// Note: Real security depends on Supabase Row Level Security (RLS)
const _0x5a1 = ["aHR0cHM6Ly9udmN4cndiamFsbnlkdnJocnBudC5zdXBhYmFzZS5jbw==", "c2JfcHVibGlzaGFibGVfVnBtLXVoTURMSkpuSk0ySS1zV1cxd19wTUdFNkxjTw=="];
const _c = (i) => atob(_0x5a1[i]);

let supabaseClient = null;
try {
    if (window.supabase) {
        // Initializing with obfuscated keys
        supabaseClient = window.supabase.createClient(_c(0), _c(1));
        console.log("state.js: connection established.");
    }
} catch (e) {
    console.error("state.js: connection error:", e);
}

window.State = {
    // Keys for localStorage
    KEYS: {
        USER_ID: 'wordle_unlimited_user_id',
        STATS: 'wordle_unlimited_stats',
        SETTINGS: 'wordle_unlimited_settings',
        GAME_UNLIMITED: 'wordle_unlimited_state',
        PLAYED_WORDS: 'wordle_played_words',
        SHUFFLED_WORDS: 'wordle_shuffled_list',
        CURRENT_INDEX: 'wordle_current_index',
        LANGUAGE: 'wordle_unlimited_language'
    },

    defaultSettings: {
        darkMode: false,
        highContrast: false,
        hardMode: false,
        theme: 'default',
        attempts: 6,
        soundEnabled: true
    },

    defaultStats: {
        gamesPlayed: 0,
        gamesWon: 0,
        currentStreak: 0,
        maxStreak: 0,
        guesses: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
        winPercentage: 0,
        fastestWin: null,
        avgAttempts: 0,
        totalAttemptsForWins: 0
    },

    getUserId() {
        try {
            let userId = localStorage.getItem(this.KEYS.USER_ID);
            if (!userId) {
                userId = 'u_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                localStorage.setItem(this.KEYS.USER_ID, userId);
            }
            return userId;
        } catch (e) {
            return 'temp_user';
        }
    },

    async syncWithServer() {
        const userId = this.getUserId();
        const localStats = this.loadStats();

        if (!supabaseClient) return localStats;

        try {
            const { data, error } = await supabaseClient
                .from('player_stats')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (data && !error) {
                const stats = {
                    gamesPlayed: data.games_played,
                    gamesWon: data.games_won,
                    currentStreak: data.current_streak,
                    maxStreak: data.max_streak,
                    guesses: data.guess_distribution || localStats.guesses,
                    fastestWin: data.fastest_win_time,
                    avgAttempts: data.avg_attempts,
                    totalAttemptsForWins: data.total_attempts_for_wins,
                    winPercentage: Math.round((data.games_won / data.games_played) * 100)
                };
                this.saveStats(stats);
                return stats;
            } else if (error && error.code === 'PGRST116') {
                await this.uploadToSupabase(userId, localStats);
            }
        } catch (e) {
            console.error("state.js: sync failed");
        }
        return localStats;
    },

    async uploadToSupabase(userId, stats) {
        if (!supabaseClient) return;
        try {
            const currentLang = localStorage.getItem('wordle_unlimited_language') || 'en';
            await supabaseClient
                .from('player_stats')
                .upsert({
                    user_id: userId,
                    games_played: stats.gamesPlayed,
                    games_won: stats.gamesWon,
                    current_streak: stats.currentStreak,
                    max_streak: stats.maxStreak,
                    guess_distribution: stats.guesses,
                    fastest_win_time: stats.fastestWin,
                    avg_attempts: stats.avgAttempts,
                    total_attempts_for_wins: stats.totalAttemptsForWins,
                    language: currentLang,
                    last_updated: new Date().toISOString()
                });
        } catch (e) { }
    },

    saveSettings(settings) {
        try {
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
        } catch (e) { }
    },

    loadSettings() {
        try {
            const saved = localStorage.getItem(this.KEYS.SETTINGS);
            return saved ? { ...this.defaultSettings, ...JSON.parse(saved) } : this.defaultSettings;
        } catch (e) {
            return this.defaultSettings;
        }
    },

    saveStats(stats) {
        try {
            localStorage.setItem(this.KEYS.STATS, JSON.stringify(stats));
        } catch (e) { }
    },

    loadStats() {
        try {
            const saved = localStorage.getItem(this.KEYS.STATS);
            return saved ? { ...this.defaultStats, ...JSON.parse(saved) } : this.defaultStats;
        } catch (e) {
            return this.defaultStats;
        }
    },

    async updateStats(won, guesses, timeTaken) {
        const stats = this.loadStats();
        const userId = this.getUserId();

        stats.gamesPlayed++;
        if (won) {
            stats.gamesWon++;
            stats.currentStreak++;
            stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
            stats.guesses[guesses] = (stats.guesses[guesses] || 0) + 1;

            if (stats.fastestWin === null || timeTaken < stats.fastestWin) {
                stats.fastestWin = timeTaken;
            }
            stats.totalAttemptsForWins += guesses;
            stats.avgAttempts = (stats.totalAttemptsForWins / stats.gamesWon).toFixed(1);
        } else {
            stats.currentStreak = 0;
        }

        stats.winPercentage = Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
        this.saveStats(stats);

        this.uploadToSupabase(userId, stats);

        return stats;
    },

    saveGameState(state) { try { localStorage.setItem(this.KEYS.GAME_UNLIMITED, JSON.stringify(state)); } catch (e) { } },
    savePlayedWords(played) { try { localStorage.setItem(this.KEYS.PLAYED_WORDS, JSON.stringify(played)); } catch (e) { } },
    loadPlayedWords() { try { const saved = localStorage.getItem(this.KEYS.PLAYED_WORDS); return saved ? JSON.parse(saved) : []; } catch (e) { return []; } },
    saveShuffledWords(words) { try { localStorage.setItem(this.KEYS.SHUFFLED_WORDS, JSON.stringify(words)); } catch (e) { } },
    loadShuffledWords() { try { const saved = localStorage.getItem(this.KEYS.SHUFFLED_WORDS); return saved ? JSON.parse(saved) : null; } catch (e) { return null; } },
    saveCurrentIndex(index) { try { localStorage.setItem(this.KEYS.CURRENT_INDEX, index); } catch (e) { } },
    loadCurrentIndex() { try { const saved = localStorage.getItem(this.KEYS.CURRENT_INDEX); return saved ? parseInt(saved) : 0; } catch (e) { return 0; } },
    loadGameState() { try { const saved = localStorage.getItem(this.KEYS.GAME_UNLIMITED); return saved ? JSON.parse(saved) : null; } catch (e) { return null; } },
    clearGameState() { try { localStorage.removeItem(this.KEYS.GAME_UNLIMITED); } catch (e) { } },
    saveLanguage(lang) { try { localStorage.setItem(this.KEYS.LANGUAGE, lang); } catch (e) { } },
    loadLanguage() { try { return localStorage.getItem(this.KEYS.LANGUAGE) || 'en'; } catch (e) { return 'en'; } }
};

console.log("state.js: initialization finished.");
