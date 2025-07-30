/**
 * ===================================================================
 * AI CHAT MODULE - PHIÊN BẢN HOÀN CHỈNH
 * - Sửa lỗi giao diện, thêm cử chỉ vuốt để đóng.
 * - Quản lý lịch sử chat, xử lý bàn phím ảo trên mobile.
 * - Tích hợp menu tùy chọn (xóa, sao chép).
 * - Cấu trúc class gọn gàng, dễ bảo trì.
 * ===================================================================
 */
class AIChatModule {
    constructor(app) {
        this.app = app;
        this.elements = {}; // Cache DOM elements
        this.chatHistory = [];
        this.storageKey = 'ai_chat_history_v2';

        // State for swipe-to-close gesture
        this.isDragging = false;
        this.startY = 0;
        this.currentTranslateY = 0;
    }

    init() {
        // 1. Cache all necessary DOM elements
        this.elements = {
            fab: document.getElementById('ai-chat-fab'),
            modalContainer: document.getElementById('ai-chat-modal'),
            modalContent: document.querySelector('.ai-chat-modal-content'),
            modalHeader: document.querySelector('.ai-chat-modal-header'),
            modalBody: document.querySelector('.ai-chat-modal-body'),
            modalFooter: document.querySelector('.ai-chat-modal-footer'),
            closeBtn: document.getElementById('ai-chat-close-btn'),
            history: document.getElementById('ai-chat-history'),
            input: document.getElementById('ai-chat-input'),
            sendBtn: document.getElementById('ai-chat-send-btn'),
            optionsBtn: document.getElementById('ai-chat-options-btn'),
            optionsMenu: document.getElementById('ai-chat-options-menu'),
            deleteLogBtn: document.getElementById('ai-chat-delete-log'),
            copyLogBtn: document.getElementById('ai-chat-copy-log')
        };

        // Exit if essential elements are not found
        if (!this.elements.fab || !this.elements.modalContainer) {
            console.warn("AI Chat FAB or Modal not found. Module will not initialize.");
            return;
        }

        // 2. Load chat history from storage
        this.loadChatHistory();

        // 3. Set up all event listeners
        this.setupEventListeners();

        console.log('🤖 AI Chat Module Initialized');
    }

    setupEventListeners() {
        // Main actions
        this.elements.fab.addEventListener('click', () => this.openChat());
        this.elements.closeBtn.addEventListener('click', () => this.closeChat());
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Close modal when clicking on the overlay
        this.elements.modalContainer.addEventListener('click', (e) => {
            if (e.target === this.elements.modalContainer) {
                this.closeChat();
            }
        });

        // Options menu
        this.elements.optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleOptionsMenu();
        });
        this.elements.deleteLogBtn.addEventListener('click', () => this.handleDeleteLog());
        this.elements.copyLogBtn.addEventListener('click', () => this.handleCopyLog());
        document.addEventListener('click', () => this.closeOptionsMenu());

        // Swipe to close gesture
        this.elements.modalHeader.addEventListener('pointerdown', (e) => this.dragStart(e));
        document.addEventListener('pointermove', (e) => this.dragMove(e));
        document.addEventListener('pointerup', () => this.dragEnd());

        // Mobile keyboard handling
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', this.handleViewportResize.bind(this));
        }
    }

    // --- Chat History Management ---
    loadChatHistory() {
        try {
            const savedHistory = localStorage.getItem(this.storageKey);
            this.chatHistory = savedHistory ? JSON.parse(savedHistory) : [];
        } catch (error) {
            console.error('Error loading chat history:', error);
            this.chatHistory = [];
        }
        this.renderChatHistory();
    }

    saveChatHistory() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.chatHistory));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }

    renderChatHistory() {
        this.elements.history.innerHTML = '';
        if (this.chatHistory.length === 0) {
            this.addMessage("Xin chào! Bạn đã chi tiêu những gì hôm nay? Hãy cho tôi biết, ví dụ: \"cà phê 50k bằng tiền mặt\"", 'bot', false);
        } else {
            this.chatHistory.forEach(msg => this.addMessage(msg.text, msg.sender, false));
        }
    }

    // --- UI Control ---
    openChat() {
        this.elements.modalContainer.style.display = 'flex';
        this.elements.modalContainer.setAttribute('aria-hidden', 'false');
        setTimeout(() => {
            this.elements.modalContainer.classList.add('visible');
            this.elements.input.focus();
        }, 10);
    }

    closeChat() {
        this.closeOptionsMenu();
        this.elements.modalContainer.classList.remove('visible');
        this.elements.modalContainer.setAttribute('aria-hidden', 'true');
        this.elements.modalContent.style.transform = ''; // Reset transform for swipe
        setTimeout(() => {
            this.elements.modalContainer.style.display = 'none';
        }, 400); // Match CSS transition duration
    }

    addMessage(text, sender, shouldSave = true) {
        if (shouldSave) {
            this.chatHistory.push({ text, sender });
            this.saveChatHistory();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-chat-message ${sender}`;

        if (sender === 'loading') {
            messageDiv.innerHTML = '<span></span><span></span><span></span>';
        } else {
            let formattedText = text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');
            messageDiv.innerHTML = formattedText;
        }

        this.elements.history.appendChild(messageDiv);
        this.elements.history.scrollTop = this.elements.history.scrollHeight;
        return messageDiv;
    }

    // --- Core Logic ---
    async sendMessage() {
        const userInput = this.elements.input.value.trim();
        if (!userInput) return;

        this.addMessage(userInput, 'user');
        this.elements.input.value = '';
        this.toggleInputLock(true);
        const loadingMessage = this.addMessage('', 'loading', false);

        try {
            const incomeCategories = this.app.data.incomeCategories.map(c => c.value);
            const expenseCategories = this.app.data.expenseCategories.map(c => c.value);
            const accounts = this.app.data.accounts.map(a => a.value);

            const parsedData = await this.callLLMAPI(userInput, incomeCategories, expenseCategories, accounts);
            loadingMessage.remove();

            this.processLLMResponse(parsedData);

        } catch (error) {
            console.error("AI processing error:", error);
            loadingMessage.remove();
            this.addMessage(`❌ Đã xảy ra lỗi: ${error.message}`, 'bot');
        } finally {
            this.toggleInputLock(false);
        }
    }
    
    processLLMResponse(parsedData) {
        if (!Array.isArray(parsedData)) {
            const responseText = (typeof parsedData === 'string' && parsedData.length > 0) 
                ? parsedData 
                : "AI không trả về dữ liệu đúng định dạng.";
            this.addMessage(responseText, 'bot');
            return;
        }

        if (parsedData.length === 0) {
            this.addMessage("OK, tôi đã hiểu. Không có giao dịch nào được thêm.", 'bot');
            return;
        }

        let confirmationText = `✅ **Đã ghi nhận ${parsedData.length} giao dịch:**\n`;
        let transactionsAdded = 0;

        for (const transaction of parsedData) {
            if (!transaction.type || !transaction.amount || !transaction.account || !transaction.datetime) {
                confirmationText += `- ⚠️ Bỏ qua 1 giao dịch không hợp lệ (thiếu thông tin).\n`;
                continue;
            }

            const formattedDate = new Date(transaction.datetime).toLocaleDateString('vi-VN');
            confirmationText += `- **${transaction.type}:** ${Utils.CurrencyUtils.formatCurrency(transaction.amount)} cho "${transaction.description || 'N/A'}" vào ngày ${formattedDate}\n`;
            
            this.ensureAccountExists(transaction.account);
            if (transaction.type === 'Transfer') {
                this.ensureAccountExists(transaction.toAccount);
            } else {
                this.ensureCategoryExists(transaction.category, transaction.type);
            }

            this.app.addTransaction(transaction);
            transactionsAdded++;
        }

        this.addMessage(confirmationText, 'bot');
        
        if (transactionsAdded > 0) {
            this.app.refreshAllModules();
        }
    }

    async callLLMAPI(userInput, incomeCategories, expenseCategories, accounts) {
        // This URL is a proxy/worker that adds the system prompt and calls the actual LLM API.
        const PROXY_URL = 'https://deepseek.hoangthaison2812.workers.dev';
        
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userInput,
                incomeCategories,
                expenseCategories,
                accounts
            })
        });

        const responseText = await response.text();
        if (!response.ok) {
            try {
                const errorJson = JSON.parse(responseText);
                throw new Error(errorJson.message || `Lỗi từ API (HTTP ${response.status})`);
            } catch (e) {
                throw new Error(responseText || `Lỗi từ API (HTTP ${response.status})`);
            }
        }
        
        try {
            return JSON.parse(responseText);
        } catch (err) {
            console.error("Failed to parse JSON from worker:", responseText);
            // Return the raw text if it's not JSON, treating it as a conversational response.
            return responseText;
        }
    }

    // --- Data Helpers ---
    ensureAccountExists(accountName) {
        if (!accountName) return;
        const trimmedName = String(accountName).trim();
        if (trimmedName && !this.app.data.accounts.some(acc => acc.value.toLowerCase() === trimmedName.toLowerCase())) {
            this.app.data.accounts.push({ value: trimmedName, text: trimmedName, createdAt: new Date().toISOString(), createdBy: 'ai_import' });
        }
    }

    ensureCategoryExists(categoryName, type) {
        if (!categoryName) return;
        const trimmedName = String(categoryName).trim();
        const targetArray = type === 'Thu' ? this.app.data.incomeCategories : this.app.data.expenseCategories;
        if (trimmedName && !targetArray.some(cat => cat.value.toLowerCase() === trimmedName.toLowerCase())) {
            targetArray.push({ value: trimmedName, text: trimmedName, createdAt: new Date().toISOString(), createdBy: 'ai_import' });
        }
    }

    // --- UX Enhancements ---
    toggleInputLock(isLocked) {
        this.elements.input.disabled = isLocked;
        this.elements.sendBtn.disabled = isLocked;
        if (!isLocked) {
            this.elements.input.focus();
        }
    }

    // Options Menu
    toggleOptionsMenu() {
        this.elements.optionsMenu.classList.toggle('visible');
    }

    closeOptionsMenu() {
        this.elements.optionsMenu.classList.remove('visible');
    }

    handleDeleteLog() {
        if (confirm('Bạn có chắc muốn xóa toàn bộ cuộc trò chuyện?')) {
            this.chatHistory = [];
            this.saveChatHistory();
            this.renderChatHistory();
            this.closeOptionsMenu();
            Utils.UIUtils.showMessage('Đã xóa cuộc trò chuyện.', 'success');
        }
    }

    handleCopyLog() {
        const conversationText = this.chatHistory.map(msg => `${msg.sender.toUpperCase()}:\n${msg.text}`).join('\n\n');
        navigator.clipboard.writeText(conversationText)
            .then(() => Utils.UIUtils.showMessage('Đã sao chép cuộc trò chuyện.', 'success'))
            .catch(() => Utils.UIUtils.showMessage('Không thể sao chép.', 'error'));
        this.closeOptionsMenu();
    }

    // Swipe to Close
    dragStart(e) {
        if (this.elements.modalHeader.contains(e.target)) {
            this.isDragging = true;
            this.startY = e.clientY;
            this.elements.modalContent.style.transition = 'none';
            this.elements.modalHeader.style.cursor = 'grabbing';
        }
    }

    dragMove(e) {
        if (!this.isDragging) return;
        const deltaY = e.clientY - this.startY;
        this.currentTranslateY = Math.max(0, deltaY); // Only allow dragging down
        this.elements.modalContent.style.transform = `translateY(${this.currentTranslateY}px)`;
    }

    dragEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.elements.modalContent.style.transition = ''; // Re-enable transition
        this.elements.modalHeader.style.cursor = 'grab';

        if (this.currentTranslateY > 100) { // Threshold to close
            this.closeChat();
        } else {
            this.elements.modalContent.style.transform = 'translateY(0)';
        }
        this.currentTranslateY = 0;
    }

    // Mobile Keyboard Handling
    handleViewportResize() {
        // This ensures the input field is pushed up by the virtual keyboard on mobile
        const viewport = window.visualViewport;
        const bottomOffset = window.innerHeight - viewport.height - viewport.offsetTop;
        
        // Apply offset to the footer to move it up
        if (this.elements.modalFooter) {
            this.elements.modalFooter.style.transform = `translateY(-${bottomOffset}px)`;
        }
        
        // Adjust body padding to make sure last message is visible
        if (this.elements.modalBody) {
            this.elements.modalBody.style.paddingBottom = `${this.elements.modalFooter.offsetHeight + 16}px`;
            this.elements.history.scrollTop = this.elements.history.scrollHeight;
        }
    }
}
