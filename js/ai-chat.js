/**
 * AI CHAT MODULE - PHIÊN BẢN TỐI ƯU CHO CẢM ỨNG (IPHONE)
 * - Tối ưu hóa kéo-thả nút FAB siêu mượt bằng requestAnimationFrame và sự kiện touch.
 * - Sử dụng "will-change" để tăng tốc phần cứng (GPU acceleration).
 * - Giữ nguyên các chức năng cốt lõi: hít vào cạnh, ghi nhớ vị trí, phân biệt kéo/nhấn.
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
        
        // Sử dụng targetX/Y để requestAnimationFrame cập nhật, tránh layout thrashing
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

        console.log('🤖 AI Chat Module Initialized (Touch-Optimized Draggable FAB)');
    }

    initEventListeners() {
        const fab = this.elements.fab;

        // --- SỰ KIỆN CHO CẢ CHUỘT (POINTER) VÀ CẢM ỨNG (TOUCH) ---
        // Sử dụng pointer events làm mặc định cho cả chuột và bút cảm ứng
        fab.addEventListener('pointerdown', (e) => this.fabDragStart(e));
        document.addEventListener('pointermove', (e) => this.fabDragMove(e));
        document.addEventListener('pointerup', () => this.fabDragEnd());

        // Thêm sự kiện touch để tối ưu và ngăn chặn hành vi mặc định trên iOS
        fab.addEventListener('touchstart', (e) => this.fabDragStart(e), { passive: true });
        fab.addEventListener('touchmove', (e) => this.fabDragMove(e), { passive: false }); // passive: false để preventDefault() hoạt động
        fab.addEventListener('touchend', () => this.fabDragEnd());
        
        fab.addEventListener('click', () => this.handleFabClick());

        // Các sự kiện khác
        this.elements.closeBtn.addEventListener('click', () => this.closeChat());
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
        });
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.closeChat();
        });
        this.initOptionsMenu();
    }

    // --- CÁC HÀM TỐI ƯU CHO KÉO-THẢ ---

    loadFabPosition() {
        const fab = this.elements.fab;
        const savedPosition = localStorage.getItem(this.fabPositionStorageKey);
        if (savedPosition) {
            const { x, y } = JSON.parse(savedPosition);
            fab.style.left = `${x}px`;
            fab.style.top = `${y}px`;
        }
        // Xóa thuộc tính bottom/right để đảm bảo top/left được áp dụng
        fab.style.bottom = 'auto';
        fab.style.right = 'auto';
    }

    fabDragStart(e) {
        if (e.button && e.button !== 0) return; // Chỉ cho phép kéo bằng chuột trái

        const fab = this.elements.fab;
        fab.style.transition = 'none'; // Xóa hiệu ứng transition khi bắt đầu kéo
        fab.style.willChange = 'transform'; // Báo cho trình duyệt tối ưu hóa transform

        this.isDraggingFab = true;
        this.wasDragged = false;
        
        const touch = e.touches ? e.touches[0] : e;
        const rect = fab.getBoundingClientRect();
        
        // Tính toán vị trí bắt đầu kéo so với vị trí của nút
        this.dragOffsetX = touch.clientX - rect.left;
        this.dragOffsetY = touch.clientY - rect.top;

        // Bắt đầu vòng lặp animation
        if(this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = requestAnimationFrame(() => this.updateFabPosition());
    }

    fabDragMove(e) {
        if (!this.isDraggingFab) return;
        this.wasDragged = true;
        
        // Ngăn hành vi cuộn trang mặc định trên thiết bị cảm ứng khi đang kéo nút
        if (e.cancelable) {
            e.preventDefault();
        }
        
        const touch = e.touches ? e.touches[0] : e;
        
        // Chỉ cập nhật tọa độ đích, không thay đổi DOM trực tiếp ở đây
        this.fabTargetX = touch.clientX - this.dragOffsetX;
        this.fabTargetY = touch.clientY - this.dragOffsetY;
    }
    
    updateFabPosition() {
        if (!this.isDraggingFab) return;

        const fab = this.elements.fab;
        // Sử dụng transform để di chuyển sẽ mượt hơn là thay đổi top/left
        // translate3d ép trình duyệt sử dụng GPU
        fab.style.transform = `translate3d(${this.fabTargetX}px, ${this.fabTargetY}px, 0)`;

        // Tiếp tục vòng lặp animation
        this.animationFrameId = requestAnimationFrame(() => this.updateFabPosition());
    }

    fabDragEnd() {
        if (!this.isDraggingFab) return;

        this.isDraggingFab = false;
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;

        const fab = this.elements.fab;
        fab.style.willChange = 'auto'; // Dọn dẹp tối ưu hóa

        if (this.wasDragged) {
            // Cập nhật lại top/left từ transform trước khi "hít" vào cạnh
            const rect = fab.getBoundingClientRect();
            fab.style.transform = ''; // Reset transform
            fab.style.left = `${rect.left}px`;
            fab.style.top = `${rect.top}px`;
            
            this.snapFabToEdge();
        }
    }
    
    snapFabToEdge() {
        const fab = this.elements.fab;
        const fabSize = fab.offsetWidth;
        const padding = 16;
        const viewportCenterX = window.innerWidth / 2;
        
        // Lấy vị trí hiện tại sau khi kéo
        const currentX = fab.offsetLeft;
        const finalX = (currentX + fabSize / 2 < viewportCenterX)
            ? padding
            : window.innerWidth - fabSize - padding;

        const finalY = Math.max(padding, Math.min(fab.offsetTop, window.innerHeight - fabSize - padding));

        // Thêm hiệu ứng "hít" vào cạnh mượt mà
        fab.style.transition = 'left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        fab.style.left = `${finalX}px`;
        fab.style.top = `${finalY}px`;
        
        localStorage.setItem(this.fabPositionStorageKey, JSON.stringify({ x: finalX, y: finalY }));

        // Xóa transition sau khi hiệu ứng kết thúc để không ảnh hưởng lần kéo sau
        setTimeout(() => {
            fab.style.transition = '';
        }, 300);
    }

    handleFabClick() {
        // Chỉ mở chat nếu nút không bị kéo đi
        if (this.wasDragged) return;
        this.openChat();
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
            // Đây là nơi bạn sẽ gọi đến API của mô hình ngôn ngữ lớn (LLM)
            // Ví dụ: const parsedData = await this.callLLMAPI(userInput, ...);
            // Vì không có API thật, tôi sẽ giả lập một phản hồi sau 1 giây.
            
            setTimeout(() => {
                loadingMessage.remove(); // Xóa tin nhắn loading
                
                // Giả lập phản hồi từ AI
                const aiResponse = `Đã hiểu:
* **Loại:** Chi tiêu
* **Số tiền:** 50,000 ₫
* **Hạng mục:** Cà phê (Gợi ý)
* **Tài khoản:** Tiền mặt (Gợi ý)
* **Mô tả:** Cà phê`;
                
                this.addMessage(aiResponse, 'bot');

                // Sau khi có phản hồi, bật lại input
                this.elements.input.disabled = false;
                this.elements.sendBtn.disabled = false;
                this.elements.input.focus();
                
            }, 1000);

        } catch (error) {
            console.error('Lỗi khi gửi tin nhắn đến AI:', error);
            loadingMessage.remove();
            this.addMessage("Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.", 'bot');
            this.elements.input.disabled = false;
            this.elements.sendBtn.disabled = false;
        }
    }
}
