class Auth {
    constructor() {
        this.credentials = {
            username: 'manish',  
            passwordHash: '8795003871502ef96fc2cba9bd3a26a165c8b79ac1bc6708260f5530ce0d7bba' 
        };

        this.sessionKey = 'gallery_admin_session';
        this.sessionTimeout = 30 * 60 * 1000; 
    }

    async sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    async doubleHash(input) {
        const firstHash = await this.sha256(input);
        const secondHash = await this.sha256(firstHash);
        return secondHash;
    }

    async authenticate(username, password) {
        try {
            const hashedPassword = await this.doubleHash(password);

            if (username === this.credentials.username &&
                hashedPassword === this.credentials.passwordHash) {

                // Create session
                const session = {
                    username: username,
                    timestamp: Date.now(),
                    token: await this.generateSessionToken()
                };

                sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
                this.startSessionTimer();

                return { success: true };
            } else {
                return {
                    success: false,
                    error: 'Invalid username or password'
                };
            }
        } catch (error) {
            console.error('Authentication error:', error);
            return {
                success: false,
                error: 'Authentication failed'
            };
        }
    }

    async generateSessionToken() {
        const random = new Uint8Array(32);
        crypto.getRandomValues(random);
        const token = Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('');
        return await this.sha256(token);
    }

    isAuthenticated() {
        const session = this.getSession();
        if (!session) return false;

        const now = Date.now();
        const sessionAge = now - session.timestamp;

        if (sessionAge > this.sessionTimeout) {
            this.logout();
            return false;
        }

        // Update session timestamp on activity
        session.timestamp = now;
        sessionStorage.setItem(this.sessionKey, JSON.stringify(session));

        return true;
    }

    getSession() {
        const sessionData = sessionStorage.getItem(this.sessionKey);
        if (!sessionData) return null;

        try {
            return JSON.parse(sessionData);
        } catch {
            return null;
        }
    }

    logout() {
        sessionStorage.removeItem(this.sessionKey);
        this.stopSessionTimer();
    }

    startSessionTimer() {
        this.stopSessionTimer();

        this.sessionTimer = setInterval(() => {
            if (!this.isAuthenticated()) {
                this.stopSessionTimer();
                window.location.reload();
            }
        }, 60000); // Check every minute
    }

    stopSessionTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    // Activity tracker to extend session
    trackActivity() {
        if (this.isAuthenticated()) {
            const session = this.getSession();
            session.timestamp = Date.now();
            sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
        }
    }

    // Helper method to update credentials (must be done in code)
    async generateNewCredentials(username, password) {
        const hashedPassword = await this.doubleHash(password);
        console.log('New credentials for', username);
        console.log('Double hashed password:', hashedPassword);
        console.log('Update the credentials object in auth.js with these values');
    }
}

// Initialize auth
const auth = new Auth();

// Track user activity
document.addEventListener('click', () => auth.trackActivity());
document.addEventListener('keypress', () => auth.trackActivity());

// Example: To generate new credentials, run this in console:
// auth.generateNewCredentials('your_username', 'your_password')