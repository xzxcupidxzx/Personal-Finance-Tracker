class AIChatModule {
    constructor(app) {
        this.app = app;
        this.elements = {
            fab: document.getElementById('ai-chat-fab'),
            modal: document.getElementById('ai-chat-modal'),
            closeBtn: document.getElementById('ai-chat-close-btn'),
            history: document.getElementById('ai-chat-history'),
            input: document.getElementById('ai-chat-input'),
            sendBtn: document.getElementById('ai-chat-send-btn'),
        };
    }

    init() {
        if (!this.elements.fab) return;
        this.elements.fab.addEventListener('click', () => this.openChat());
        this.elements.closeBtn.addEventListener('click', () => this.closeChat());
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.closeChat();
        });
        console.log('🤖 AI Chat Module Initialized for DeepSeek API');
    }

    openChat() {
        if (!this.elements.modal) return;
        this.elements.modal.style.display = 'flex';
        setTimeout(() => {
            this.elements.modal.classList.add('visible');
            this.elements.input.focus();
        }, 10);
    }

    closeChat() {
        if (!this.elements.modal) return;
        this.elements.modal.classList.remove('visible');
        setTimeout(() => {
            this.elements.modal.style.display = 'none';
        }, 400); // khớp với thời gian transition trong CSS
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-chat-message ${sender}`;
        if (sender === 'loading') {
            messageDiv.innerHTML = '<span></span><span></span><span></span>';
        } else {
            messageDiv.textContent = text;
        }
        this.elements.history.appendChild(messageDiv);
        this.elements.history.scrollTop = this.elements.history.scrollHeight;
        return messageDiv;
    }

    async sendMessage() {
        const userInput = this.elements.input.value.trim();
        if (!userInput) return;

        this.addMessage(userInput, 'user');
        this.elements.input.value = '';
        const loadingMessage = this.addMessage('', 'loading');

        try {
            // Lấy dữ liệu categories/accounts hiện tại
            const incomeCategories = this.app.data.incomeCategories.map(c => c.value);
            const expenseCategories = this.app.data.expenseCategories.map(c => c.value);
            const accounts = this.app.data.accounts.map(a => a.value);

            // Gọi API Worker
            const parsedData = await this.callLLMAPI(userInput, incomeCategories, expenseCategories, accounts);

            loadingMessage.remove();

            // Kiểm tra trường dữ liệu trả về từ AI
            if (
                !parsedData ||
                !parsedData.type ||
                !parsedData.amount ||
                !parsedData.account
            ) {
                this.addMessage("❌ Kết quả AI trả về không hợp lệ hoặc thiếu dữ liệu. Hãy kiểm tra lại.", 'bot');
                return;
            }

            // Format kết quả xác nhận cho user
            let confirmationText = `OK! Tôi đã ghi nhận:\n- Loại: ${parsedData.type}\n- Số tiền: ${Utils.CurrencyUtils.formatCurrency(parsedData.amount)}\n`;
            if (parsedData.type === 'Transfer') {
                confirmationText += `- Từ: ${parsedData.account}\n- Đến: ${parsedData.toAccount}`;
            } else {
                confirmationText += `- Hạng mục: ${parsedData.category}\n- Tài khoản: ${parsedData.account}`;
            }
            confirmationText += `\n- Mô tả: "${parsedData.description || ''}"`;
            this.addMessage(confirmationText, 'bot');

            // Thêm category/account nếu chưa có
            this.ensureAccountExists(parsedData.account);
            if(parsedData.type === 'Transfer') {
                this.ensureAccountExists(parsedData.toAccount);
            } else {
                this.ensureCategoryExists(parsedData.category, parsedData.type);
            }

            // Lưu giao dịch vào app
            const success = this.app.addTransaction(parsedData);
            if (success) {
                this.app.refreshAllModules();
                // Nếu muốn tự động đóng chat sau khi thêm, bỏ comment dòng sau:
                // setTimeout(() => this.closeChat(), 2500); 
            }
        } catch (error) {
            console.error("Lỗi xử lý AI:", error);
            loadingMessage.remove();
            let message = "❌ Đã xảy ra lỗi khi gọi AI. ";
            if (error && error.message) message += error.message;
            this.addMessage(message + "\nVui lòng kiểm tra lại API Key, billing hoặc thử lại sau.", 'bot');
        }
    }
    
    ensureAccountExists(accountName) {
        if (
            accountName &&
            !this.app.data.accounts.some(acc => acc.value.toLowerCase() === String(accountName).toLowerCase())
        ) {
            this.app.data.accounts.push({ value: accountName, text: accountName, createdAt: new Date().toISOString(), createdBy: 'ai_import' });
        }
    }

    ensureCategoryExists(categoryName, type) {
        if (!categoryName) return;
        const targetArray = type === 'Thu' ? this.app.data.incomeCategories : this.app.data.expenseCategories;
        if (!targetArray.some(cat => cat.value.toLowerCase() === String(categoryName).toLowerCase())) {
            targetArray.push({ value: categoryName, text: categoryName, createdAt: new Date().toISOString(), createdBy: 'ai_import' });
        }
    }

    /**
     * Gọi DeepSeek API qua Cloudflare Worker proxy
     */
    async callLLMAPI(userInput, incomeCategories, expenseCategories, accounts) {
        // URL worker của bạn
        const PROXY_URL = 'https://deepseek.hoangthaison2812.workers.dev';

        // Gửi data lên Worker (POST)
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

        // Kiểm tra lỗi response
        let data;
        try {
            data = await response.json();
        } catch (err) {
            throw new Error("Không đọc được dữ liệu JSON trả về từ Worker.");
        }

        // Nếu worker trả về lỗi (ví dụ error: true)
        if (data && data.error) {
            throw new Error(data.message || "Lỗi từ Worker/DeepSeek API.");
        }

        // DeepSeek worker trả về object JSON chuẩn, không cần parse nữa
        return data;
    }
}
