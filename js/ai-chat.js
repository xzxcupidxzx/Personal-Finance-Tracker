/**
 * ===================================================================
 * AI CHAT MODULE - PHIÊN BẢN CỐ ĐỊNH (FIXED POSITION)
 *
 * Tối ưu hóa:
 * - Loại bỏ hoàn toàn logic kéo-thả (drag-and-drop).
 * - Icon được định vị bằng CSS, JavaScript chỉ xử lý việc mở/đóng chat.
 * - Mã nguồn nhẹ hơn, không còn các tính toán vị trí phức tạp.
 * ===================================================================
 */
class AIChatModule {
    constructor(app) {
        this.app = app;
        this.elements = {};
        this.chatHistory = [];
        this.storageKey = 'ai_chat_history';
    }

    init() {
        if (!this.initializeElements()) {
            console.error("AI Chat: Không tìm thấy các element HTML cần thiết. Module sẽ không chạy.");
            return;
        }
        this.setupEventListeners();
        this.loadChatHistory();
        console.log('🤖 AI Chat Module Initialized (Fixed Position Edition)');
    }

    initializeElements() {
        this.elements = {
            fab: document.getElementById('ai-chat-fab'),
            modal: document.getElementById('ai-chat-modal'),
            closeBtn: document.getElementById('ai-chat-close-btn'),
            history: document.getElementById('ai-chat-history'),
            input: document.getElementById('ai-chat-input'),
            sendBtn: document.getElementById('ai-chat-send-btn'),
            // Các element khác cho menu nếu bạn có (optionsBtn, optionsMenu, etc.)
        };
        return this.elements.fab && this.elements.modal;
    }

    setupEventListeners() {
        const { fab, closeBtn, sendBtn, input, modal } = this.elements;

        // Chỉ cần một sự kiện 'click' đơn giản để mở chat
        fab.addEventListener('click', () => this.openChat());

        // Các sự kiện cho modal và chat
        closeBtn.addEventListener('click', () => this.closeChat());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeChat();
        });
        sendBtn.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Nếu có menu, hãy gọi hàm khởi tạo menu ở đây
        // this.initializeOptionsMenu();
    }

    openChat() {
        const { modal, input } = this.elements;
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('visible');
            if(input) input.focus();
        }, 10);
    }

    closeChat() {
        const { modal } = this.elements;
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 400); // Chờ hiệu ứng trượt xuống hoàn tất
    }

    // Các hàm như initializeOptionsMenu, loadChatHistory, sendMessage...
    // có thể giữ nguyên như phiên bản trước của bạn.
    
    loadChatHistory() {
        try {
            const savedHistory = localStorage.getItem(this.storageKey);
            this.chatHistory = savedHistory ? JSON.parse(savedHistory) : [];
        } catch (error) {
            this.chatHistory = [];
        }
        this.renderChatHistory();
    }
    
    saveChatHistory() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.chatHistory));
    }

    renderChatHistory() {
        const historyContainer = this.elements.history;
        historyContainer.innerHTML = '';
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
            // Định dạng markdown cơ bản
            let formattedText = text
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');
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
            // Giả lập API call
            setTimeout(() => {
                loadingMessage.remove();
                const aiResponse = `Đã hiểu: * **Loại:** Chi tiêu * **Số tiền:** 50,000 ₫ * **Hạng mục:** Cà phê (Gợi ý) * **Tài khoản:** Tiền mặt (Gợi ý) * **Mô tả:** Cà phê`;
                this.addMessage(aiResponse, 'bot');
                this.elements.input.disabled = false;
                this.elements.sendBtn.disabled = false;
                this.elements.input.focus();
            }, 1200);
        } catch (error) {
            loadingMessage.remove();
            this.addMessage("Xin lỗi, đã có lỗi xảy ra.", 'bot');
            this.elements.input.disabled = false;
            this.elements.sendBtn.disabled = false;
        }
    }
}