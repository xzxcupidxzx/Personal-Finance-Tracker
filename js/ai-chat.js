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
            tokenCounter: document.getElementById('ai-chat-token-counter') // Thêm bộ đếm token
        };
        this.chatHistory = []; // Lưu trữ lịch sử chat
    }

    init() {
        if (!this.elements.fab) return;
        this.elements.fab.addEventListener('click', () => this.openChat());
        this.elements.closeBtn.addEventListener('click', () => this.closeChat());
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.closeChat();
        });
        console.log('🤖 AI Chat Module Initialized and Upgraded');
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
        }, 400); // Match CSS transition time
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-chat-message ${sender}`;
        if (sender === 'loading') {
            messageDiv.innerHTML = '<span></span><span></span><span></span>';
        } else {
            // Sử dụng thư viện markdown để render (nếu có) hoặc xử lý xuống dòng thủ công
            messageDiv.innerHTML = text.replace(/\n/g, '<br>');
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
        this.elements.input.disabled = true;
        this.elements.sendBtn.disabled = true;
        const loadingMessage = this.addMessage('', 'loading');

        try {
            // Lấy dữ liệu ngữ cảnh
            const incomeCategories = this.app.data.incomeCategories.map(c => c.value);
            const expenseCategories = this.app.data.expenseCategories.map(c => c.value);
            const accounts = this.app.data.accounts.map(a => a.value);

            // Gọi API Worker
            const parsedData = await this.callLLMAPI(userInput, incomeCategories, expenseCategories, accounts);

            loadingMessage.remove();

            // ==========================================================
            // === NÂNG CẤP LOGIC XỬ LÝ PHẢN HỒI TỪ AI ===
            // ==========================================================

            // 1. Kiểm tra phản hồi có phải là một mảng hay không
            if (!Array.isArray(parsedData)) {
                // Nếu không phải mảng, có thể AI trả lời câu hỏi dạng văn bản
                if (typeof parsedData === 'string' && parsedData.length > 0) {
                     this.addMessage(parsedData, 'bot');
                } else {
                     this.addMessage("❌ Lỗi: AI không trả về dữ liệu đúng định dạng mảng.", 'bot');
                }
                return; // Dừng xử lý
            }

            // 2. Xử lý trường hợp mảng rỗng (không có giao dịch nào)
            if (parsedData.length === 0) {
                this.addMessage("OK, tôi đã hiểu. Không có giao dịch nào được thêm.", 'bot');
                return;
            }

            // 3. Xử lý trường hợp có giao dịch để thêm
            let confirmationText = `✅ **OK! Đã ghi nhận ${parsedData.length} giao dịch:**\n`;
            let transactionsAdded = 0;

            for (const transaction of parsedData) {
                // Validate từng giao dịch
                if (!transaction.type || !transaction.amount || !transaction.account || !transaction.datetime) {
                    confirmationText += `- ⚠️ Bỏ qua 1 giao dịch không hợp lệ.\n`;
                    continue;
                }

                confirmationText += `- **${transaction.type}:** ${Utils.CurrencyUtils.formatCurrency(transaction.amount)} cho "${transaction.description || 'N/A'}" vào ngày ${new Date(transaction.datetime).toLocaleDateString('vi-VN')}\n`;
                
                // Đảm bảo hạng mục/tài khoản tồn tại trước khi thêm
                this.ensureAccountExists(transaction.account);
                if (transaction.type === 'Transfer') {
                    this.ensureAccountExists(transaction.toAccount);
                } else {
                    this.ensureCategoryExists(transaction.category, transaction.type);
                }

                // Thêm giao dịch vào ứng dụng
                this.app.addTransaction(transaction);
                transactionsAdded++;
            }

            // 4. Hiển thị thông báo tổng hợp và làm mới giao diện
            this.addMessage(confirmationText, 'bot');
            
            if (transactionsAdded > 0) {
                this.app.refreshAllModules();
            }

        } catch (error) {
            console.error("Lỗi xử lý AI:", error);
            loadingMessage.remove();
            let message = "❌ Đã xảy ra lỗi khi gọi AI. ";
            if (error && error.message) message += error.message;
            this.addMessage(message, 'bot');
        } finally {
            this.elements.input.disabled = false;
            this.elements.sendBtn.disabled = false;
            this.elements.input.focus();
        }
    }
    
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

    /**
     * Gọi API qua Cloudflare Worker proxy
     */
    async callLLMAPI(userInput, incomeCategories, expenseCategories, accounts) {
        // URL worker của bạn
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
            // Cố gắng parse lỗi từ worker nếu có
            try {
                const errorJson = JSON.parse(responseText);
                throw new Error(errorJson.message || `Lỗi từ Worker/API (HTTP ${response.status})`);
            } catch (e) {
                throw new Error(responseText || `Lỗi từ Worker/API (HTTP ${response.status})`);
            }
        }
        
        try {
            // Worker trả về chuỗi JSON, ta cần parse nó
            return JSON.parse(responseText);
        } catch (err) {
            console.error("Lỗi parse JSON từ worker:", responseText);
            throw new Error("Không đọc được dữ liệu JSON trả về từ Worker.");
        }
    }
}
