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
            tokenCounter: document.getElementById('ai-chat-token-counter'),
            // THÊM MỚI: Các element cho menu tùy chọn
            optionsBtn: document.getElementById('ai-chat-options-btn'),
            optionsMenu: document.getElementById('ai-chat-options-menu'),
            deleteLogBtn: document.getElementById('ai-chat-delete-log'),
            copyLogBtn: document.getElementById('ai-chat-copy-log')
        };
        // THAY ĐỔI: Khởi tạo mảng chatHistory rỗng ban đầu
        this.chatHistory = [];
        this.storageKey = 'ai_chat_history'; // Key để lưu vào localStorage
    }

    init() {
        if (!this.elements.fab) return;
        
        // Tải lịch sử chat đã lưu
        this.loadChatHistory();
        
        this.elements.fab.addEventListener('click', () => this.openChat());
        this.elements.closeBtn.addEventListener('click', () => this.closeChat());
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Đóng modal khi click ra ngoài
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.closeChat();
        });

        // THÊM MỚI: Xử lý sự kiện cho menu tùy chọn
        this.initOptionsMenu();

        console.log('🤖 AI Chat Module Initialized with History & Options');
    }

    // THÊM MỚI: Khởi tạo sự kiện cho menu tùy chọn
    initOptionsMenu() {
        if (!this.elements.optionsBtn || !this.elements.optionsMenu) return;

        this.elements.optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleOptionsMenu();
        });

        this.elements.deleteLogBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleDeleteLog();
        });

        this.elements.copyLogBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleCopyLog();
        });

        // Đóng menu khi click ra ngoài
        document.addEventListener('click', (e) => {
            if (!this.elements.optionsMenu.contains(e.target) && !this.elements.optionsBtn.contains(e.target)) {
                this.elements.optionsMenu.classList.remove('visible');
            }
        });
    }

    // THÊM MỚI: Bật/tắt menu tùy chọn
    toggleOptionsMenu() {
        this.elements.optionsMenu.classList.toggle('visible');
    }
    
    // THÊM MỚI: Xử lý xóa lịch sử chat
    handleDeleteLog() {
        if (confirm('Bạn có chắc chắn muốn xóa toàn bộ cuộc trò chuyện này? Hành động này không thể hoàn tác.')) {
            this.chatHistory = [];
            this.saveChatHistory();
            this.renderChatHistory(); // Render lại để hiển thị trạng thái rỗng
            this.toggleOptionsMenu(); // Ẩn menu đi
            Utils.UIUtils.showMessage('Đã xóa cuộc trò chuyện.', 'success');
        }
    }
    
    // THÊM MỚI: Xử lý sao chép lịch sử chat
    handleCopyLog() {
        const conversationText = this.chatHistory.map(msg => {
            return `${msg.sender.toUpperCase()}:\n${msg.text}`;
        }).join('\n\n');

        navigator.clipboard.writeText(conversationText).then(() => {
            Utils.UIUtils.showMessage('Đã sao chép cuộc trò chuyện vào clipboard.', 'success');
        }, () => {
            Utils.UIUtils.showMessage('Không thể sao chép. Vui lòng thử lại.', 'error');
        });
        this.toggleOptionsMenu();
    }

    // THÊM MỚI: Lưu lịch sử chat vào localStorage
    saveChatHistory() {
        try {
            const historyToSave = JSON.stringify(this.chatHistory);
            localStorage.setItem(this.storageKey, historyToSave);
        } catch (error) {
            console.error('Lỗi khi lưu lịch sử chat:', error);
        }
    }

    // THÊM MỚI: Tải lịch sử chat từ localStorage
    loadChatHistory() {
        try {
            const savedHistory = localStorage.getItem(this.storageKey);
            if (savedHistory) {
                this.chatHistory = JSON.parse(savedHistory);
            }
        } catch (error) {
            console.error('Lỗi khi tải lịch sử chat:', error);
            this.chatHistory = []; // Reset nếu có lỗi
        }
        this.renderChatHistory();
    }
    
    // THÊM MỚI: Render toàn bộ lịch sử chat ra màn hình
    renderChatHistory() {
        this.elements.history.innerHTML = ''; // Xóa tin nhắn cũ
        if (this.chatHistory.length === 0) {
            // Nếu không có lịch sử, hiển thị tin nhắn chào mừng mặc định
            this.addMessage("Xin chào! Bạn đã chi tiêu những gì hôm nay? Hãy cho tôi biết, ví dụ: \"cà phê 50k bằng tiền mặt\"", 'bot', false); // `false` để không lưu lại tin nhắn chào mừng này
        } else {
            this.chatHistory.forEach(msg => {
                this.addMessage(msg.text, msg.sender, false); // `false` để không lưu lại
            });
        }
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
        // Ẩn menu tùy chọn khi đóng modal chat
        this.elements.optionsMenu.classList.remove('visible');
        this.elements.modal.classList.remove('visible');
        setTimeout(() => {
            this.elements.modal.style.display = 'none';
        }, 400); // Match CSS transition time
    }

    // THAY ĐỔI: Thêm tham số `shouldSave`
    addMessage(text, sender, shouldSave = true) {
        // Nếu `shouldSave` là true, thêm tin nhắn vào mảng history
        if (shouldSave) {
            this.chatHistory.push({ text, sender });
            this.saveChatHistory(); // Lưu lại ngay lập tức
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-chat-message ${sender}`;
        
        if (sender === 'loading') {
            messageDiv.innerHTML = '<span></span><span></span><span></span>';
        } else {
            // Xử lý xuống dòng, đậm, nghiêng đơn giản
            let formattedText = text.replace(/\n/g, '<br>');
            formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
            messageDiv.innerHTML = formattedText;
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
        const loadingMessage = this.addMessage('', 'loading', false);

        try {
            const incomeCategories = this.app.data.incomeCategories.map(c => c.value);
            const expenseCategories = this.app.data.expenseCategories.map(c => c.value);
            const accounts = this.app.data.accounts.map(a => a.value);
            const parsedData = await this.callLLMAPI(userInput, incomeCategories, expenseCategories, accounts);

            loadingMessage.remove();

            if (!Array.isArray(parsedData)) {
                const responseText = (typeof parsedData === 'string' && parsedData.length > 0) 
                    ? parsedData 
                    : "❌ Lỗi: AI không trả về dữ liệu đúng định dạng mảng.";
                this.addMessage(responseText, 'bot');
                return;
            }

            if (parsedData.length === 0) {
                this.addMessage("OK, tôi đã hiểu. Không có giao dịch nào được thêm.", 'bot');
                return;
            }

            let confirmationText = `✅ **OK! Đã ghi nhận ${parsedData.length} giao dịch:**\n`;
            let transactionsAdded = 0;

            for (const transaction of parsedData) {
                if (!transaction.type || !transaction.amount || !transaction.account || !transaction.datetime) {
                    confirmationText += `- ⚠️ Bỏ qua 1 giao dịch không hợp lệ.\n`;
                    continue;
                }

                confirmationText += `- **${transaction.type}:** ${Utils.CurrencyUtils.formatCurrency(transaction.amount)} cho "${transaction.description || 'N/A'}" vào ngày ${new Date(transaction.datetime).toLocaleDateString('vi-VN')}\n`;
                
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

    async callLLMAPI(userInput, incomeCategories, expenseCategories, accounts) {
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
                throw new Error(errorJson.message || `Lỗi từ Worker/API (HTTP ${response.status})`);
            } catch (e) {
                throw new Error(responseText || `Lỗi từ Worker/API (HTTP ${response.status})`);
            }
        }
        try {
            return JSON.parse(responseText);
        } catch (err) {
            console.error("Lỗi parse JSON từ worker:", responseText);
            throw new Error("Không đọc được dữ liệu JSON trả về từ Worker.");
        }
    }
}