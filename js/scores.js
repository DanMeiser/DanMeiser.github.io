/**
 * GitHub-backed Score Service
 * Reads/writes scores to data/scores.json in the repo via GitHub API.
 * 
 * Setup: You need a fine-grained Personal Access Token for this repo
 *   with "Contents: Read and write" permission.
 *   Go to: https://github.com/settings/personal-access-tokens/new
 *   - Token name: "Meiser Scores"
 *   - Repository access: Only select "DanMeiser/DanMeiser.github.io"
 *   - Permissions > Repository permissions > Contents: Read and write
 *   - Generate and enter when prompted in-game
 */

const GitHubScores = {
    OWNER: 'DanMeiser',
    REPO: 'DanMeiser.github.io',
    FILE_PATH: 'data/scores.json',
    SITE_URL: 'https://danmeiser.github.io/data/scores.json',
    TOKEN_KEY: 'github_scores_pat',

    _cache: null,
    _cacheTime: 0,
    CACHE_TTL: 5000, // 5 seconds

    // ─── Token Management ───────────────────────────
    getToken() {
        try { return localStorage.getItem(this.TOKEN_KEY); }
        catch { return null; }
    },

    setToken(token) {
        try { localStorage.setItem(this.TOKEN_KEY, token); }
        catch {}
    },

    promptForToken() {
        const token = prompt(
            'Enter your GitHub Personal Access Token to save scores across devices.\n\n' +
            'Create one at: https://github.com/settings/personal-access-tokens/new\n' +
            '• Repository: DanMeiser/DanMeiser.github.io\n' +
            '• Permission: Contents → Read and write\n\n' +
            'Leave blank to skip (scores will only save locally).'
        );
        if (token && token.trim()) {
            this.setToken(token.trim());
            return token.trim();
        }
        return null;
    },

    // ─── Read Scores ────────────────────────────────
    async getScores() {
        // Return cache if fresh
        if (this._cache && Date.now() - this._cacheTime < this.CACHE_TTL) {
            return this._cache;
        }

        try {
            // Fetch from the deployed site (no auth needed)
            const resp = await fetch(this.SITE_URL + '?t=' + Date.now());
            if (resp.ok) {
                const data = await resp.json();
                this._cache = data;
                this._cacheTime = Date.now();
                return data;
            }
        } catch (e) {
            console.warn('Failed to fetch scores from site:', e);
        }

        // Fallback: try GitHub API
        try {
            const token = this.getToken();
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const resp = await fetch(
                `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.FILE_PATH}`,
                { headers }
            );
            if (resp.ok) {
                const json = await resp.json();
                const data = JSON.parse(atob(json.content));
                this._cache = data;
                this._cacheTime = Date.now();
                return data;
            }
        } catch (e) {
            console.warn('Failed to fetch scores from API:', e);
        }

        // Final fallback: default scores
        return {
            flappyFamily: { calvin: 0, bailey: 0 },
            dinoRun: { calvin: 0, bailey: 0 }
        };
    },

    // ─── Write Scores ───────────────────────────────
    async saveScores(data) {
        let token = this.getToken();
        if (!token) {
            token = this.promptForToken();
            if (!token) {
                console.log('No token — scores saved locally only.');
                return false;
            }
        }

        try {
            // Get current file SHA (required for updates)
            const getResp = await fetch(
                `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.FILE_PATH}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (!getResp.ok) {
                if (getResp.status === 401 || getResp.status === 403) {
                    console.warn('Token invalid or expired. Clearing.');
                    localStorage.removeItem(this.TOKEN_KEY);
                    return false;
                }
                throw new Error(`GitHub API error: ${getResp.status}`);
            }

            const fileInfo = await getResp.json();
            const sha = fileInfo.sha;

            // Update the file
            const content = btoa(JSON.stringify(data, null, 4) + '\n');
            const putResp = await fetch(
                `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.FILE_PATH}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Update scores`,
                        content: content,
                        sha: sha
                    })
                }
            );

            if (putResp.ok) {
                this._cache = data;
                this._cacheTime = Date.now();
                return true;
            } else if (putResp.status === 401 || putResp.status === 403) {
                console.warn('Token invalid or expired. Clearing.');
                localStorage.removeItem(this.TOKEN_KEY);
                return false;
            } else if (putResp.status === 409) {
                // Conflict — re-fetch and merge
                console.log('Score conflict, re-fetching...');
                return await this._mergeAndSave(data, token);
            }

            return false;
        } catch (e) {
            console.warn('Failed to save scores:', e);
            return false;
        }
    },

    // ─── Merge on conflict ──────────────────────────
    async _mergeAndSave(localData, token) {
        try {
            this._cache = null; // bust cache
            const remote = await this.getScores();
            // Keep the higher score for each
            for (const game of Object.keys(localData)) {
                if (!remote[game]) remote[game] = {};
                for (const char of Object.keys(localData[game])) {
                    remote[game][char] = Math.max(
                        remote[game][char] || 0,
                        localData[game][char] || 0
                    );
                }
            }
            // Retry save once
            return await this.saveScores(remote);
        } catch {
            return false;
        }
    },

    // ─── Convenience: Get one score ─────────────────
    async getHighScore(game, character) {
        const data = await this.getScores();
        return (data[game] && data[game][character]) || 0;
    },

    // ─── Convenience: Update if new high ────────────
    async updateHighScore(game, character, score) {
        const data = await this.getScores();
        if (!data[game]) data[game] = {};
        const current = data[game][character] || 0;
        if (score > current) {
            data[game][character] = score;
            await this.saveScores(data);
            return true;
        }
        return false;
    }
};
