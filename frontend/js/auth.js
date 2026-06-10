document.addEventListener('DOMContentLoaded', () => {
    // If user is already logged in, redirect directly to dashboard
    if (isLoggedIn()) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Dom Elements
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Tab Switching Logic
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.classList.add('active');
        formRegister.classList.remove('active');
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formRegister.classList.add('active');
        formLogin.classList.remove('active');
    });

    // Login Form Submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        // Front-end Validation
        if (!username || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Logging in...';

            const response = await apiRequest('/auth/login', {
                method: 'POST',
                body: { username, password }
            });

            saveSession(response);
            showToast(`Welcome back, ${response.username}!`, 'success');
            
            // Redirect to dashboard after brief delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Log In';
        }
    });

    // Register Form Submit
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usernameInput = document.getElementById('register-username');
        const emailInput = document.getElementById('register-email');
        const passwordInput = document.getElementById('register-password');
        const roleInput = document.getElementById('register-role');
        const submitBtn = registerForm.querySelector('button[type="submit"]');

        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const role = roleInput.value;

        // Front-end Validation
        if (!username || !email || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        if (username.length < 3) {
            showToast('Username must be at least 3 characters', 'error');
            return;
        }

        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }

        // Quick email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Registering...';

            await apiRequest('/auth/register', {
                method: 'POST',
                body: { username, email, password, role }
            });

            showToast('Registration successful! Please log in.', 'success');

            // Switch to Login tab and prefill username
            registerForm.reset();
            tabLogin.click();
            document.getElementById('login-username').value = username;
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Sign Up';
        }
    });
});
