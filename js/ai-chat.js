/**
 * AI CHAT MODULE - PHIÊN BẢN NÂNG CAO
 * - Giao diện cửa sổ nổi có thể kéo thả (draggable).
 * - Lưu và phục hồi vị trí cửa sổ.
 * - Lưu và tải lại lịch sử trò chuyện.
 * - Menu tùy chọn: Sao chép, Xóa cuộc trò chuyện.
 * - Tối ưu hóa cho trải nghiệm người dùng.
 */
class AIChatModule {
    constructor(app) {
        this.app = app;
        this.elements = {};
        this.chatHistory = [];
        this.storageKey = 'ai_chat_history';
        
        // Thuộc tính cho chức năng kéo-thả
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.elementStartX = 0;
        this.elementStartY = 0;
        this.positionStorageKey = 'ai_chat_position';
    }

    init() {
        this.elements = {
            fab: document.getElementById('ai-chat-fab'),
            modal: document.getElementById('ai-chat-modal'),
            modalContent: document.querySelector('.ai-chat-modal-content'),
            header: document.querySelector('.ai-chat-modal-header'),
            closeBtn: document.getElementById('ai-chat-close-btn'),
            history: document.getElementById('ai-chat-history'),
            input: document.getElementById('ai-chat-input'),
            sendBtn: document.getElementById('ai-chat-send-btn'),
            optionsBtn: document.getElementById('ai-chat-options-btn'),
            optionsMenu: document.getElementById('ai-chat-options-menu'),
            deleteLogBtn: document.getElementById('ai-chat-delete-log'),
            copyLogBtn: document.getElementById('ai-chat-copy-log')
        };

        if (!this.elements.fab) return;

        this.loadChatHistory();
        this.initEventListeners();

        console.log('🤖 AI Chat Module Initialized (Draggable Window)');
    }

    initEventListeners() {
        // Sự kiện cho các nút chính
        this.elements.fab.addEventListener('click', () => this.openChat());
        this.elements.closeBtn.addEventListener('click', () => this.closeChat());
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Gửi tin nhắn bằng phím Enter
        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Đóng modal khi click ra ngoài lớp phủ
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.closeChat();
        });

        // Khởi tạo menu và chức năng kéo thả
        this.initOptionsMenu();
        this.initDraggableModal();
    }

    // --- Chức năng Kéo-Thả (Draggable) ---
    initDraggableModal() {
        const { header, modalContent } = this.elements;
        if (!header || !modalContent) return;

        header.addEventListener('pointerdown', (e) => this.dragStart(e));
        document.addEventListener('pointermove', (e) => this.dragMove(e));
        document.addEventListener('pointerup', () => this.dragEnd());
        document.addEventListener('pointerleave', () => this.dragEnd());
    }

    dragStart(e) {
        if (e.button !== 0) return; // Chỉ cho phép kéo bằng chuột trái
        this.isDragging = true;
        
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;

        const rect = this.elements.modalContent.getBoundingClientRect();
        this.elementStartX = rect.left;
        this.elementStartY = rect.top;

        this.elements.modalContent.style.transition = 'none';
        document.body.classList.add('dragging-chat-modal');
    }

    dragMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        let newX = this.elementStartX + (e.clientX - this.dragStartX);
        let newY = this.elementStartY + (e.clientY - this.dragStartY);
        
        const { modalContent } = this.elements;
        const modalWidth = modalContent.offsetWidth;
        const modalHeight = modalContent.offsetHeight;

        // Giới hạn trong khung nhìn
        newX = Math.max(0, Math.min(newX, window.innerWidth - modalWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - modalHeight));

        modalContent.style.left = `${newX}px`;
        modalContent.style.top = `${newY}px`;
        modalContent.style.transform = 'none';
    }

    dragEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        
        this.elements.modalContent.style.transition = '';
        document.body.classList.remove('dragging-chat-modal');

        localStorage.setItem(this.positionStorageKey, JSON.stringify({
            left: this.elements.modalContent.style.left,
            top: this.elements.modalContent.style.top
        }));
    }

    // --- Quản lý hiển thị Modal ---
    openChat() {
        const { modal, modalContent } = this.elements;
        if (!modal || !modalContent) return;

        // Tải vị trí đã lưu
        const savedPosition = localStorage.getItem(this.positionStorageKey);
        if (savedPosition) {
            const { left, top } = JSON.parse(savedPosition);
            modalContent.style.left = left;
            modalContent.style.top = top;
            modalContent.style.transform = 'scale(1)';
        } else {
            // Đặt vị trí mặc định ở giữa
            modalContent.style.left = '50%';
            modalContent.style.top = '50%';
            modalContent.style.transform = 'translate(-50%, -50%) scale(1)';
        }

        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('visible');
            this.elements.input.focus();
        }, 10);
    }

    closeChat() {
        const { modal } = this.elements;
        if (!modal) return;
        
        this.elements.optionsMenu.classList.remove('visible');
        modal.classList.remove('visible');
        
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Khớp với thời gian transition trong CSS
    }

    // --- Quản lý Menu Tùy chọn ---
    initOptionsMenu() {
        const { optionsBtn, optionsMenu, deleteLogBtn, copyLogBtn } = this.elements;
        if (!optionsBtn || !optionsMenu) return;

        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            optionsMenu.classList.toggle('visible');
        });

        deleteLogBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn xóa toàn bộ cuộc trò chuyện này không?')) {
                this.chatHistory = [];
                this.saveChatHistory();
                this.renderChatHistory();
                optionsMenu.classList.remove('visible');
                Utils.UIUtils.showMessage('Đã xóa cuộc trò chuyện.', 'success');
            }
        });

        copyLogBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const conversationText = this.chatHistory.map(msg => `${msg.sender.toUpperCase()}:\n${msg.text}`).join('\n\n');
            navigator.clipboard.writeText(conversationText)
                .then(() => Utils.UIUtils.showMessage('Đã sao chép cuộc trò chuyện.', 'success'))
                .catch(() => Utils.UIUtils.showMessage('Không thể sao chép.', 'error'));
            optionsMenu.classList.remove('visible');
        });

        document.addEventListener('click', (e) => {
            if (!optionsMenu.contains(e.target) && !optionsBtn.contains(e.target)) {
                optionsMenu.classList.remove('visible');
            }
        });
    }

    // --- Quản lý Lịch sử Chat ---
    saveChatHistory() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.chatHistory));
        } catch (error) {
            console.error('Lỗi khi lưu lịch sử chat:', error);
        }
    }

    loadChatHistory() {
        try {
            const savedHistory = localStorage.getItem(this.storageKey);
            this.chatHistory = savedHistory ? JSON.parse(savedHistory) : [];
        } catch (error) {
            console.error('Lỗi khi tải lịch sử chat:', error);
            this.chatHistory = [];
        }
        this.renderChatHistory();
    }
    
    renderChatHistory() {
        this.elements.history.innerHTML = '';
        if (this.chatHistory.length === 0) {
            this.addMessage("Xin chào! Bạn đã chi tiêu những gì hôm nay? Hãy cho tôi biết, ví dụ: \"cà phê 50k bằng tiền mặt\"", 'bot', false);
        } else {
            this.chatHistory.forEach(msg => this.addMessage(msg.text, msg.sender, false));
        }
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
            let formattedText = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
            messageDiv.innerHTML = formattedText;
        }
        
        this.elements.history.appendChild(messageDiv);
        this.elements.history.scrollTop = this.elements.history.scrollHeight;
        return messageDiv;
    }

    // --- Xử lý Gửi tin nhắn và Tương tác với AI ---
    async sendMessage() {
        const userInput = this.elements.input.value.trim();
        if (!userInput) return;

        this.addMessage(userInput, 'user');
        this.elements.input.value = '';
        this.elements.input.disabled = true;
        this.elements.sendBtn.disabled = true;
        const loadingMessage = this.addMessage('', 'loading', false);

        try {
            const { incomeCategories, expenseCategories, accounts } = this.app.data;
            const parsedData = await this.callLLMAPI(userInput, 
                incomeCategories.map(c => c.value), 
                expenseCategories.map(c => c.value), 
                accounts.map(a => a.value)
            );

            loadingMessage.remove();

            if (!Array.isArray(parsedData)) {
                this.addMessage(parsedData || "❌ Lỗi: AI không trả về dữ liệu đúng định dạng.", 'bot');
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
            this.addMessage(`❌ Đã xảy ra lỗi: ${error.message}`, 'bot');
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