class EllenAI {
    constructor() {
        this.apiKey = '';
        this.apiProvider = 'openai';
        this.model = 'gpt-3.5-turbo';
        this.conversationHistory = [];
        this.isTyping = false;
        this.maxTokens = 1000;
        this.temperature = 0.7;
        
        // API Provider configurations
        this.providers = {
            openai: {
                name: 'OpenAI',
                baseUrl: 'https://api.openai.com/v1/chat/completions',
                models: [
                    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Faster, Cheaper)' },
                    { id: 'gpt-4', name: 'GPT-4 (More Capable)' },
                    { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo' }
                ],
                keyFormat: 'sk-'
            },
            deepseek: {
                name: 'DeepSeek',
                baseUrl: 'https://api.deepseek.com/v1/chat/completions',
                models: [
                    { id: 'deepseek-chat', name: 'DeepSeek Chat' },
                    { id: 'deepseek-coder', name: 'DeepSeek Coder' }
                ],
                keyFormat: 'dp-'
            },
            anthropic: {
                name: 'Anthropic',
                baseUrl: 'https://api.anthropic.com/v1/complete',
                models: [
                    { id: 'claude-2', name: 'Claude 2' },
                    { id: 'claude-instant', name: 'Claude Instant' }
                ],
                keyFormat: 'sk-ant-'
            },
            google: {
                name: 'Google AI',
                baseUrl: 'https://generativelanguage.googleapis.com/v1/models',
                models: [
                    { id: 'gemini-pro', name: 'Gemini Pro' },
                    { id: 'gemini-pro-vision', name: 'Gemini Pro Vision' }
                ],
                keyFormat: 'AIza'
            }
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSettings();
        this.setupTheme();
        this.addWelcomeMessage();
    }

    setupEventListeners() {
        const sendButton = document.getElementById('sendButton');
        const userInput = document.getElementById('userInput');
        const clearChat = document.getElementById('clearChat');
        const exportChat = document.getElementById('exportChat');
        const settingsBtn = document.getElementById('settingsBtn');
        const fabButton = document.getElementById('fabButton');

        // Send message events
        sendButton.addEventListener('click', () => this.sendMessage());
        
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    // Allow Shift+Enter for new line
                    return;
                } else {
                    // Normal Enter sends the message
                    e.preventDefault();
                    this.sendMessage();
                }
            }
        });

        // Header button events
        clearChat.addEventListener('click', () => this.clearChat());
        exportChat.addEventListener('click', () => this.exportChat());
        settingsBtn.addEventListener('click', () => this.openSettings());
        fabButton.addEventListener('click', () => this.toggleFAB());

        // Quick actions
        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // FAB menu items
        document.querySelectorAll('.fab-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleFABAction(action);
            });
        });

        // Auto-resize textarea
        userInput.addEventListener('input', () => {
            this.autoResizeTextarea(userInput);
        });

        // Close FAB menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!fabButton.contains(e.target)) {
                fabButton.classList.remove('active');
            }
        });

        // Handle paste events for code
        userInput.addEventListener('paste', (e) => {
            setTimeout(() => this.autoResizeTextarea(userInput), 0);
        });
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }

    async sendMessage() {
        const userInput = document.getElementById('userInput');
        const message = userInput.value.trim();
        
        if (!message || this.isTyping) return;

        // Disable send button during processing
        const sendButton = document.getElementById('sendButton');
        sendButton.disabled = true;

        try {
            // Add user message
            this.addMessage(message, 'user');
            userInput.value = '';
            userInput.style.height = 'auto';

            // Show typing indicator
            this.showTypingIndicator();

            const response = await this.getAIResponse(message);
            this.hideTypingIndicator();
            this.addMessage(response, 'ai');
            
        } catch (error) {
            this.hideTypingIndicator();
            this.handleError(error);
        } finally {
            sendButton.disabled = false;
            userInput.focus();
        }
    }

    async getAIResponse(message) {
        // Add to conversation history
        this.conversationHistory.push({ role: 'user', content: message });

        // Keep conversation history manageable (last 20 messages)
        if (this.conversationHistory.length > 20) {
            this.conversationHistory = this.conversationHistory.slice(-20);
        }

        if (!this.apiKey) {
            throw new Error(`API key not configured. Please set your ${this.providers[this.apiProvider].name} API key in settings.`);
        }

        const provider = this.providers[this.apiProvider];
        let requestBody;
        let headers = {
            'Content-Type': 'application/json'
        };

        switch (this.apiProvider) {
            case 'openai':
                requestBody = {
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are Ellen, a helpful AI coding assistant. You help with programming, debugging, code review, and technical questions. Provide clear, concise, and practical answers.'
                        },
                        ...this.conversationHistory
                    ],
                    max_tokens: this.maxTokens,
                    temperature: this.temperature,
                    stream: false
                };
                headers['Authorization'] = `Bearer ${this.apiKey}`;
                break;

            case 'deepseek':
                requestBody = {
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are Ellen, a helpful AI coding assistant.'
                        },
                        ...this.conversationHistory
                    ],
                    max_tokens: this.maxTokens,
                    temperature: this.temperature
                };
                headers['Authorization'] = `Bearer ${this.apiKey}`;
                break;

            case 'anthropic':
                requestBody = {
                    model: this.model,
                    prompt: `\n\nHuman: ${message}\n\nAssistant: `,
                    max_tokens_to_sample: this.maxTokens,
                    temperature: this.temperature
                };
                headers['X-API-Key'] = this.apiKey;
                break;

            case 'google':
                requestBody = {
                    model: this.model,
                    prompt: {
                        text: message
                    },
                    temperature: this.temperature,
                    candidateCount: 1
                };
                headers['Authorization'] = `Bearer ${this.apiKey}`;
                break;
        }

        const response = await fetch(provider.baseUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from API');
        }

        const aiResponse = data.choices[0].message.content;
        
        // Add to conversation history
        this.conversationHistory.push({ role: 'assistant', content: aiResponse });
        
        return aiResponse;
    }

    addMessage(content, sender, isError = false) {
        const chatContainer = document.getElementById('chatContainer');
        const welcomeMessage = chatContainer.querySelector('.welcome-message');
        
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (isError) {
            messageContent.classList.add('error');
        }

        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.innerHTML = this.formatMessage(content);

        messageContent.appendChild(messageText);

        // Add copy button for AI messages with code
        if (sender === 'ai' && (content.includes('```') || content.includes('`'))) {
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
            copyButton.addEventListener('click', () => this.copyToClipboard(content));
            messageContent.appendChild(copyButton);
        }

        messageDiv.appendChild(messageContent);
        chatContainer.appendChild(messageDiv);
        
        // Smooth scroll to bottom
        this.scrollToBottom();
    }

    formatMessage(content) {
        // Escape HTML first
        content = content.replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');

        // Format code blocks
        content = content.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'text';
            return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
        });

        // Format inline code
        content = content.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Format bold text
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Format italic text
        content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Format line breaks
        content = content.replace(/\n/g, '<br>');

        return content;
    }

    scrollToBottom() {
        const chatContainer = document.getElementById('chatContainer');
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    showTypingIndicator() {
        this.isTyping = true;
        const chatContainer = document.getElementById('chatContainer');
        
        // Remove existing typing indicator
        const existingIndicator = document.getElementById('typingIndicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <i class="fas fa-robot"></i>
            <span>Ellen is thinking</span>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        chatContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async copyToClipboard(text) {
        try {
            // Remove HTML tags and format for copying
            const cleanText = text.replace(/<[^>]*>/g, '')
                                 .replace(/&lt;/g, '<')
                                 .replace(/&gt;/g, '>')
                                 .replace(/&amp;/g, '&');
            
            await navigator.clipboard.writeText(cleanText);
            this.showNotification('Content copied to clipboard!', 'success');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showNotification('Failed to copy to clipboard', 'error');
        }
    }

    clearChat() {
        const chatContainer = document.getElementById('chatContainer');
        this.conversationHistory = [];
        this.addWelcomeMessage();
        this.showNotification('Chat cleared', 'info');
    }

    addWelcomeMessage() {
        const chatContainer = document.getElementById('chatContainer');
        chatContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-content">
                    <i class="fas fa-robot"></i>
                    <h2>Welcome to Ellen AI Assistant!</h2>
                    <p>I'm here to help you with coding, debugging, and development tasks.</p>
                    <div class="welcome-features">
                        <div class="feature">
                            <i class="fas fa-code"></i>
                            <span>Code Analysis</span>
                        </div>
                        <div class="feature">
                            <i class="fas fa-bug"></i>
                            <span>Debugging Help</span>
                        </div>
                        <div class="feature">
                            <i class="fas fa-lightbulb"></i>
                            <span>Smart Suggestions</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    exportChat() {
        const messages = document.querySelectorAll('.message');
        if (messages.length === 0) {
            this.showNotification('No messages to export', 'warning');
            return;
        }

        let chatText = `Ellen AI Chat Export\n`;
        chatText += `Generated on: ${new Date().toLocaleString()}\n`;
        chatText += `${'='.repeat(50)}\n\n`;
        
        messages.forEach(message => {
            const sender = message.classList.contains('user-message') ? 'You' : 'Ellen';
            const content = message.querySelector('.message-text').textContent;
            chatText += `${sender}:\n${content}\n\n${'-'.repeat(30)}\n\n`;
        });
        
        const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ellen-chat-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Chat exported successfully!', 'success');
    }

    openSettings() {
        if (document.getElementById('settingsPanel')) return;
        
        const settingsPanel = document.createElement('div');
        settingsPanel.id = 'settingsPanel';
        settingsPanel.className = 'settings-panel';
        settingsPanel.innerHTML = `
            <div class="settings-header">
                <h3><i class="fas fa-cog"></i> Settings</h3>
                <button class="close-settings">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="settings-content">
                <div class="setting-group">
                    <label for="apiProvider">
                        <i class="fas fa-server"></i> API Provider:
                    </label>
                    <select id="apiProvider">
                        <option value="openai" ${this.apiProvider === 'openai' ? 'selected' : ''}>OpenAI</option>
                        <option value="deepseek" ${this.apiProvider === 'deepseek' ? 'selected' : ''}>DeepSeek</option>
                        <option value="anthropic" ${this.apiProvider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
                        <option value="google" ${this.apiProvider === 'google' ? 'selected' : ''}>Google AI</option>
                    </select>
                </div>

                <div class="setting-group">
                    <label for="apiKey">
                        <i class="fas fa-key"></i> API Key:
                    </label>
                    <input type="password" id="apiKey" placeholder="Enter your API key..." value="${this.apiKey}">
                    <small>Your API key is stored locally and never shared.</small>
                </div>
                
                <div class="setting-group">
                    <label for="modelSelect">
                        <i class="fas fa-brain"></i> Model:
                    </label>
                    <select id="modelSelect">
                        ${this.getModelOptions()}
                    </select>
                </div>
                
                                <div class="setting-group">
                    <label for="temperature">
                        <i class="fas fa-thermometer-half"></i> Temperature: <span id="tempValue">${this.temperature}</span>
                    </label>
                    <input type="range" id="temperature" min="0" max="2" step="0.1" value="${this.temperature}">
                    <small>Lower = more focused, Higher = more creative</small>
                </div>
                
                <div class="setting-group">
                    <label for="maxTokens">
                        <i class="fas fa-text-width"></i> Max Tokens: <span id="tokenValue">${this.maxTokens}</span>
                    </label>
                    <input type="range" id="maxTokens" min="100" max="4000" step="100" value="${this.maxTokens}">
                    <small>Maximum length of AI responses</small>
                </div>

                <div class="setting-group">
                    <label for="themeSelect">
                        <i class="fas fa-palette"></i> Theme:
                    </label>
                    <select id="themeSelect">
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="auto">Auto (System)</option>
                    </select>
                </div>
                
                <div class="settings-actions">
                    <button class="settings-btn primary" id="saveSettings">
                        <i class="fas fa-save"></i> Save Settings
                    </button>
                    <button class="settings-btn" id="resetSettings">
                        <i class="fas fa-undo"></i> Reset to Default
                    </button>
                    <button class="settings-btn" id="testConnection">
                        <i class="fas fa-plug"></i> Test API Connection
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(settingsPanel);
        
        // Show panel with animation
        setTimeout(() => settingsPanel.classList.add('open'), 10);
        
        // Set current theme value
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        document.getElementById('themeSelect').value = currentTheme;
        
        // Setup range input updates
        const maxTokensInput = document.getElementById('maxTokens');
        const tempInput = document.getElementById('temperature');
        
        maxTokensInput.addEventListener('input', (e) => {
            document.getElementById('tokenValue').textContent = e.target.value;
        });
        
        tempInput.addEventListener('input', (e) => {
            document.getElementById('tempValue').textContent = e.target.value;
        });
        
        // Event listeners
        settingsPanel.querySelector('.close-settings').addEventListener('click', () => {
            this.closeSettings();
        });
        
        settingsPanel.querySelector('#saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });
        
        settingsPanel.querySelector('#resetSettings').addEventListener('click', () => {
            this.resetSettings();
        });
        
        settingsPanel.querySelector('#testConnection').addEventListener('click', () => {
            this.testApiConnection();
        });
        
        // Close on outside click
        settingsPanel.addEventListener('click', (e) => {
            if (e.target === settingsPanel) {
                this.closeSettings();
            }
        });
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeSettings();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    closeSettings() {
        const settingsPanel = document.getElementById('settingsPanel');
        if (settingsPanel) {
            settingsPanel.classList.remove('open');
            setTimeout(() => settingsPanel.remove(), 300);
        }
    }

    async saveSettings() {
        const apiKey = document.getElementById('apiKey').value.trim();
        const apiProvider = document.getElementById('apiProvider').value;
        const model = document.getElementById('modelSelect').value;
        const maxTokens = parseInt(document.getElementById('maxTokens').value);
        const temperature = parseFloat(document.getElementById('temperature').value);
        const theme = document.getElementById('themeSelect').value;
        
        // Get the selected provider's configuration
        const provider = this.providers[apiProvider];
        
        // Validate API key format if a key is provided
        if (apiKey && provider.keyFormat && !apiKey.startsWith(provider.keyFormat)) {
            this.showNotification(`Invalid API key format. ${provider.name} keys start with "${provider.keyFormat}"`, 'error');
            return;
        }
        
        this.apiKey = apiKey;
        this.apiProvider = apiProvider;
        this.model = model;
        this.maxTokens = maxTokens;
        this.temperature = temperature;
        
        // Save to localStorage
        const settings = {
            apiKey,
            model,
            maxTokens,
            temperature,
            theme
        };
        
        localStorage.setItem('ellen_settings', JSON.stringify(settings));
        
        this.applyTheme(theme);
        this.showNotification('Settings saved successfully!', 'success');
        this.closeSettings();
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default?')) {
            localStorage.removeItem('ellen_settings');
            this.apiKey = '';
            this.apiProvider = 'openai';
            this.model = 'gpt-3.5-turbo';
            this.maxTokens = 1000;
            this.temperature = 0.7;
            this.applyTheme('dark');
            this.showNotification('Settings reset to default!', 'info');
            this.closeSettings();
        }
    }

    getModelOptions() {
        const provider = this.providers[this.apiProvider];
        return provider.models.map(model => 
            `<option value="${model.id}" ${this.model === model.id ? 'selected' : ''}>${model.name}</option>`
        ).join('');
    }

    setupProviderEvents() {
        const apiProviderSelect = document.getElementById('apiProvider');
        const modelSelect = document.getElementById('modelSelect');
        const apiKeyInput = document.getElementById('apiKey');

        apiProviderSelect.addEventListener('change', (e) => {
            const provider = this.providers[e.target.value];
            // Update model options
            modelSelect.innerHTML = provider.models.map(model => 
                `<option value="${model.id}">${model.name}</option>`
            ).join('');
            // Update API key placeholder
            apiKeyInput.placeholder = `Enter your ${provider.name} API key (${provider.keyFormat}...)`;
            // Clear the API key when switching providers
            apiKeyInput.value = '';
        });
    }

    async testApiConnection() {
        const apiKey = document.getElementById('apiKey').value.trim();
        const provider = this.providers[this.apiProvider];
        
        if (!apiKey) {
            this.showNotification('Please enter an API key first', 'warning');
            return;
        }

        // Validate API key format
        if (!apiKey.startsWith(provider.keyFormat)) {
            this.showNotification(`Invalid API key format. ${provider.name} keys start with "${provider.keyFormat}"`, 'error');
            return;
        }
        
        const testButton = document.getElementById('testConnection');
        const originalText = testButton.innerHTML;
        testButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        testButton.disabled = true;
        
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            if (response.ok) {
                this.showNotification('API connection successful!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(`API Error: ${error.error?.message || 'Connection failed'}`, 'error');
            }
        } catch (error) {
            this.showNotification('Network error: Unable to connect to OpenAI API', 'error');
        } finally {
            testButton.innerHTML = originalText;
            testButton.disabled = false;
        }
    }

    loadSettings() {
        const saved = localStorage.getItem('ellen_settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.apiKey = settings.apiKey || '';
                this.apiProvider = settings.apiProvider || 'openai';
                this.model = settings.model || this.providers[this.apiProvider].models[0].id;
                this.maxTokens = settings.maxTokens || 1000;
                this.temperature = settings.temperature || 0.7;
                this.applyTheme(settings.theme || 'dark');
            } catch (error) {
                console.error('Error loading settings:', error);
                this.showNotification('Error loading saved settings', 'error');
            }
        }
    }

    setupTheme() {
        // Apply saved theme or detect system preference
        const saved = localStorage.getItem('ellen_settings');
        let theme = 'dark';
        
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                theme = settings.theme || 'dark';
            } catch (error) {
                console.error('Error parsing saved theme:', error);
            }
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            theme = 'light';
        }
        
        this.applyTheme(theme);
        
        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                const saved = localStorage.getItem('ellen_settings');
                if (saved) {
                    const settings = JSON.parse(saved);
                    if (settings.theme === 'auto') {
                        this.applyTheme('auto');
                    }
                }
            });
        }
    }

    applyTheme(theme) {
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        
        document.documentElement.setAttribute('data-theme', theme);
    }

    toggleFAB() {
        const fabButton = document.getElementById('fabButton');
        fabButton.classList.toggle('active');
    }

    handleQuickAction(action) {
        const userInput = document.getElementById('userInput');
        
        const prompts = {
            'explain-code': 'Please explain this code and how it works:\n\n```\n// Paste your code here\n```',
            'review-code': 'Please review this code and suggest improvements:\n\n```\n// Paste your code here\n```',
            'generate-tests': 'Please generate unit tests for this code:\n\n```\n// Paste your code here\n```',
            'debug-code': 'Help me debug this code. What might be wrong?\n\n```\n// Paste your code here\n```'
        };
        
        userInput.value = prompts[action];
        userInput.focus();
        this.autoResizeTextarea(userInput);
        
        // Position cursor in the code block
        const cursorPos = userInput.value.indexOf('// Paste your code here');
        if (cursorPos !== -1) {
            userInput.setSelectionRange(cursorPos, cursorPos + 23);
        }
    }

    handleFABAction(action) {
        this.toggleFAB();
        
        switch (action) {
            case 'upload-file':
                this.uploadFile();
                break;
            case 'new-chat':
                this.clearChat();
                break;
            case 'settings':
                this.openSettings();
                break;
        }
    }

    uploadFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.js,.py,.html,.css,.json,.md,.jsx,.ts,.tsx,.php,.java,.cpp,.c,.cs,.rb,.go,.rs,.swift,.kt';
        input.multiple = false;
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                // Check file size (max 1MB)
                if (file.size > 1024 * 1024) {
                    this.showNotification('File too large. Maximum size is 1MB.', 'error');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    const userInput = document.getElementById('userInput');
                    const fileExtension = file.name.split('.').pop().toLowerCase();
                    
                    userInput.value = `Please analyze this ${file.name} file:\n\n\`\`\`${fileExtension}\n${content}\n\`\`\``;
                    this.autoResizeTextarea(userInput);
                    userInput.focus();
                };
                
                reader.onerror = () => {
                    this.showNotification('Error reading file', 'error');
                };
                
                reader.readAsText(file);
            }
        };
        
        input.click();
    }

    handleError(error) {
        console.error('Ellen AI Error:', error);
        
        let errorMessage = 'An unexpected error occurred. Please try again.';
        
        if (error.message.includes('API key')) {
            errorMessage = 'Please configure your OpenAI API key in settings.';
        } else if (error.message.includes('quota')) {
            errorMessage = 'API quota exceeded. Please check your OpenAI account.';
        } else if (error.message.includes('rate limit')) {
            errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        this.addMessage(errorMessage, 'ai', true);
        this.showNotification(errorMessage, 'error');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications of the same type
        const existingNotifications = document.querySelectorAll(`.notification.${type}`);
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="close-notification">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        const autoRemoveTimer = setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
        
        // Close button
        notification.querySelector('.close-notification').addEventListener('click', () => {
            clearTimeout(autoRemoveTimer);
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        });
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// Enhanced notification styles
const notificationStyles = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 3000;
    min-width: 300px;
    max-width: 400px;
    animation: slideIn 0.3s ease;
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.notification.fade-out {
    opacity: 0;
    transform: translateX(100%);
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.notification.success { border-left: 4px solid var(--success-color); }
.notification.error { border-left: 4px solid var(--error-color); }
.notification.warning { border-left: 4px solid var(--warning-color); }
.notification.info { border-left: 4px solid var(--info-color); }

.notification-content {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding-right: 2rem;
}

.notification-content span {
    flex: 1;
    line-height: 1.4;
    word-wrap: break-word;
}

.notification.success i { color: var(--success-color); }
.notification.error i { color: var(--error-color); }
.notification.warning i { color: var(--warning-color); }
.notification.info i { color: var(--info-color); }

.close-notification {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.2s ease;
    color: var(--text-color);
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-notification:hover {
    opacity: 1;
}

/* Enhanced settings panel styles */
.settings-content small {
    display: block;
    color: var(--text-secondary);
    font-size: 0.8rem;
    margin-top: 0.25rem;
}

.settings-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 2rem;
}

.settings-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-weight: 500;
}

.setting-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.setting-group input[type="range"] {
    margin: 0.5rem 0;
}

/* Error message styling in chat */
.message-content.error {
    background: rgba(220, 53, 69, 0.1) !important;
    border: 1px solid var(--error-color) !important;
    color: var(--error-color) !important;
}

/* Loading state for send button */
#sendButton:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* Enhanced code block styling */
.message-text pre {
    position: relative;
    max-height: 400px;
    overflow-y: auto;
}

.message-text pre::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

.message-text pre::-webkit-scrollbar-track {
    background: var(--background-color);
}

.message-text pre::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
}

/* Responsive notification positioning */
@media (max-width: 768px) {
    .notification {
        top: 10px;
        right: 10px;
        left: 10px;
        min-width: auto;
        max-width: none;
    }
}
`;

// Add enhanced styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new EllenAI();
});

// Service Worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
