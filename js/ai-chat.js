/**
 * AI CHAT MODULE - PHIÊN BẢN HOÀN CHỈNH
 * - Nút FAB di chuyển mượt mà và "hít" vào cạnh màn hình như AssistiveTouch.
 * - Giữ nguyên các chức năng cốt lõi: ghi nhớ vị trí, phân biệt kéo/nhấn, bottom-sheet chat.
 */
class AIChatModule {
    constructor(app) {
        this.app = app;
        this.elements = {};
        this.chatHistory = [];
        this.storageKey = 'ai_chat_history';
        
        // Thuộc tính cho chức năng kéo-thả NÚT FAB
        this.isDraggingFab = false;
        this.wasDragged = false;
        
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        this.fabTargetX = 0;
        this.fabTargetY = 0;
        
        this.animationFrameId = null;
        this.fabPositionStorageKey = 'ai_chat_fab_position';
    }

    init() {
        this.elements = {
            fab: document.getElementById('ai-chat-fab'),
            modal: document.getElementById('ai-chat-modal'),
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
        this.loadFabPosition();
        this.initEventListeners();

        console.log('🤖 AI Chat Module Initialized (Snap-to-Edge FAB)');
    }

    initEventListeners() {
        // --- LOGIC XỬ LÝ SỰ KIỆN CHO NÚT FAB ---
        this.elements.fab.addEventListener('pointerdown', (e) => this.fabDragStart(e));
        document.addEventListener('pointermove', (e) => this.fabDragMove(e));
        document.addEventListener('pointerup', () => this.fabDragEnd());
        this.elements.fab.addEventListener('click', () => this.handleFabClick());

        // Các sự kiện khác giữ nguyên
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
        this.initOptionsMenu();
    }

    // --- CÁC HÀM TỐI ƯU CHO KÉO-THẢ NÚT FAB VÀ "HÍT" CẠNH ---

    loadFabPosition() {
        const fab = this.elements.fab;
        const savedPosition = localStorage.getItem(this.fabPositionStorageKey);
        if (savedPosition) {
            const { x, y } = JSON.parse(savedPosition);
            fab.style.left = `${x}px`;
            fab.style.top = `${y}px`;
            fab.style.bottom = 'auto';
            fab.style.right = 'auto';
        }
    }

    fabDragStart(e) {
        if (e.button !== 0 && e.pointerType !== 'touch') return;
        
        const fab = this.elements.fab;
        fab.style.transition = 'none'; // Xóa hiệu ứng transition khi bắt đầu kéo

        this.isDraggingFab = true;
        this.wasDragged = false;
        
        const rect = fab.getBoundingClientRect();
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;

        document.body.classList.add('dragging-chat-modal');

        this.animationFrameId = requestAnimationFrame(() => this.updateFabPosition());
    }

    fabDragMove(e) {
        if (!this.isDraggingFab) return;
        this.wasDragged = true;
        e.preventDefault();

        this.fabTargetX = e.clientX - this.dragOffsetX;
        this.fabTargetY = e.clientY - this.dragOffsetY;
    }
    
    updateFabPosition() {
        if (!this.isDraggingFab) return;

        const fab = this.elements.fab;
        const fabSize = fab.offsetWidth;
        const padding = 16; // Khoảng đệm an toàn

        // Giới hạn trong khung nhìn với khoảng đệm
        const constrainedX = Math.max(padding, Math.min(this.fabTargetX, window.innerWidth - fabSize - padding));
        const constrainedY = Math.max(padding, Math.min(this.fabTargetY, window.innerHeight - fabSize - padding));

        fab.style.left = `${constrainedX}px`;
        fab.style.top = `${constrainedY}px`;
        
        this.animationFrameId = requestAnimationFrame(() => this.updateFabPosition());
    }

    fabDragEnd() {
        if (!this.isDraggingFab) return;
        
        this.isDraggingFab = false;
        document.body.classList.remove('dragging-chat-modal');
        cancelAnimationFrame(this.animationFrameId);
        
        if (this.wasDragged) {
            const fab = this.elements.fab;
            const fabSize = fab.offsetWidth;
            const padding = 16;
            const viewportCenterX = window.innerWidth / 2;
            const fabCurrentCenterX = fab.offsetLeft + fabSize / 2;
            
            // Xác định vị trí cuối cùng sẽ "hít" vào
            const finalX = (fabCurrentCenterX < viewportCenterX)
                ? padding
                : window.innerWidth - fabSize - padding;

            const finalY = fab.offsetTop; // Vị trí Y đã được giới hạn trong lúc kéo

            // Thêm hiệu ứng chuyển động mượt mà để "hít" vào cạnh
            fab.style.transition = 'left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
            fab.style.left = `${finalX}px`;

            // Lưu vị trí mới sau khi đã "hít"
            localStorage.setItem(this.fabPositionStorageKey, JSON.stringify({
                x: finalX,
                y: finalY
            }));

            // Xóa transition sau khi animation kết thúc để không ảnh hưởng lần kéo sau
            setTimeout(() => {
                fab.style.transition = '';
            }, 300);
        }
    }

    handleFabClick() {
        if (this.wasDragged) return;
        this.openChat();
    }
    
    // ... (Các hàm còn lại như openChat, closeChat, initOptionsMenu, sendMessage... giữ nguyên) ...
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
        this.elements.optionsMenu.classList.remove('visible');
        this.elements.modal.classList.remove('visible');
        setTimeout(() => {
            this.elements.modal.style.display = 'none';
        }, 400);
    }
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