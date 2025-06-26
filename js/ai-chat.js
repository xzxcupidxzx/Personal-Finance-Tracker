/**
 * ===================================================================
 * AI CHAT MODULE - PHIÊN BẢN TỐI ƯU HÓA TOÀN DIỆN
 *
 * Cải tiến chính:
 * - Logic kéo-thả mượt mà hơn bằng `requestAnimationFrame` và `transform`.
 * - Tăng kích thước nút FAB và cải thiện phản hồi cảm ứng.
 * - Thêm class `.is-dragging` để kiểm soát hiệu ứng CSS khi kéo.
 * - Tối ưu hóa việc hiển thị modal dạng "Bottom Sheet".
 * - Giữ nguyên các chức năng cốt lõi: lưu/tải lịch sử chat, menu tùy chọn.
 * ===================================================================
 */
class AIChatModule {
    constructor(app) {
        this.app = app;
        this.elements = {};
        this.chatHistory = [];
        this.storageKey = 'ai_chat_history';

        // === Trạng thái kéo-thả ===
        this.isDragging = false;
        this.wasDragged = false;
        this.dragThreshold = 5; // Ngưỡng pixel để xác định là kéo thay vì nhấn

        // Tọa độ hiện tại của nút FAB
        this.fabX = 0;
        this.fabY = 0;

        // Tọa độ bắt đầu của con trỏ so với nút FAB
        this.dragStartX = 0;
        this.dragStartY = 0;

        this.animationFrameId = null;
        this.fabPositionStorageKey = 'ai_chat_fab_position';
    }

    /**
     * Khởi tạo module
     */
    init() {
        if (!this.initializeElements()) {
            console.error("AI Chat Module: Không thể khởi tạo vì thiếu các element cần thiết.");
            return;
        }

        this.bindEventHandlers();
        this.initializeEventListeners();
        this.loadChatHistory();
        this.loadFabPosition();

        console.log('🤖 AI Chat Module Initialized (Optimized Version)');
    }

    /**
     * Lấy và kiểm tra các element cần thiết từ DOM
     */
    initializeElements() {
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
            copyLogBtn: document.getElementById('ai-chat-copy-log'),
            overlay: document.getElementById('ai-chat-overlay')
        };
        // Kiểm tra các phần tử quan trọng
        return this.elements.fab && this.elements.modal && this.elements.input;
    }

    /**
     * Tạo các phiên bản "bound" của các hàm xử lý sự kiện
     */
    bindEventHandlers() {
        this.boundFabDragStart = this.fabDragStart.bind(this);
        this.boundFabDragMove = this.fabDragMove.bind(this);
        this.boundFabDragEnd = this.fabDragEnd.bind(this);
        this.boundSendMessage = this.sendMessage.bind(this);
        this.boundCloseChat = this.closeChat.bind(this);
        this.boundHandleModalClick = this.handleModalClick.bind(this);
        this.boundHandleEnterKey = this.handleEnterKey.bind(this);
    }

    /**
     * Gán các sự kiện cho element
     */
    initializeEventListeners() {
        const { fab, closeBtn, sendBtn, input, modal } = this.elements;

        // Sự kiện kéo-thả cho FAB
        fab.addEventListener('pointerdown', this.boundFabDragStart);
        document.addEventListener('pointermove', this.boundFabDragMove);
        document.addEventListener('pointerup', this.boundFabDragEnd);

        // Sự kiện trong modal chat
        closeBtn.addEventListener('click', this.boundCloseChat);
        sendBtn.addEventListener('click', this.boundSendMessage);
        input.addEventListener('keypress', this.boundHandleEnterKey);
        modal.addEventListener('click', this.boundHandleModalClick);

        // Khởi tạo menu tùy chọn
        this.initializeOptionsMenu();
    }

    // ===============================================
    // === LOGIC KÉO-THẢ NÚT FAB (Tối ưu hóa) ===
    // ===============================================

    loadFabPosition() {
        const { fab } = this.elements;
        const savedPosition = localStorage.getItem(this.fabPositionStorageKey);

        // Đặt gốc tọa độ là top/left để transform hoạt động nhất quán
        fab.style.top = '0px';
        fab.style.left = '0px';
        fab.style.bottom = 'auto';
        fab.style.right = 'auto';

        if (savedPosition) {
            const { x, y } = JSON.parse(savedPosition);
            this.fabX = x;
            this.fabY = y;
        } else {
            // Vị trí mặc định ban đầu (góc dưới bên phải)
            this.fabX = window.innerWidth - fab.offsetWidth - 20;
            this.fabY = window.innerHeight - fab.offsetHeight - 95;
        }
        fab.style.transform = `translate3d(${this.fabX}px, ${this.fabY}px, 0)`;
    }

    fabDragStart(e) {
        // Chỉ cho phép chuột trái hoặc chạm
        if (e.button && e.button !== 0) return;

        const { fab, overlay } = this.elements;
        
        // Bắt con trỏ và hiển thị lớp phủ
        fab.setPointerCapture(e.pointerId);
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Tắt hiệu ứng transition khi đang kéo
        fab.style.transition = 'none';

        this.isDragging = true;
        this.wasDragged = false;

        // Ghi lại vị trí bắt đầu kéo tương đối so với nút
        this.dragStartX = e.clientX - this.fabX;
        this.dragStartY = e.clientY - this.fabY;

        // Bắt đầu vòng lặp animation
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = requestAnimationFrame(() => this.updateFabPosition());
    }

    fabDragMove(e) {
        if (!this.isDragging) return;
        e.preventDefault(); // Ngăn cuộn trang khi kéo

        const newX = e.clientX - this.dragStartX;
        const newY = e.clientY - this.dragStartY;

        // Xác định là đã kéo nếu di chuyển vượt ngưỡng
        if (!this.wasDragged && (Math.abs(newX - this.fabX) > this.dragThreshold || Math.abs(newY - this.fabY) > this.dragThreshold)) {
            this.wasDragged = true;
            this.elements.fab.classList.add('is-dragging');
            document.body.classList.add('is-dragging-chat');
        }
        
        this.fabX = newX;
        this.fabY = newY;
    }

    updateFabPosition() {
        if (!this.isDragging) return;
        // Cập nhật vị trí bằng transform để có hiệu suất cao nhất
        this.elements.fab.style.transform = `translate3d(${this.fabX}px, ${this.fabY}px, 0)`;
        // Tiếp tục vòng lặp animation
        this.animationFrameId = requestAnimationFrame(() => this.updateFabPosition());
    }

    fabDragEnd(e) {
        const { fab, overlay } = this.elements;

        // Dọn dẹp và trả lại trạng thái bình thường
        overlay.style.display = 'none';
        document.body.classList.remove('is-dragging-chat');
        document.body.style.overflow = '';
        fab.classList.remove('is-dragging');

        if (!this.isDragging) return;
        this.isDragging = false;

        // Dừng vòng lặp animation
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;

        try {
            fab.releasePointerCapture(e.pointerId);
        } catch (err) {
            // Bỏ qua lỗi nếu con trỏ đã được giải phóng
        }
        
        if (this.wasDragged) {
            this.snapFabToEdge();
        } else {
            // Nếu không kéo, đó là một cú nhấn -> mở chat
            this.openChat();
        }
    }

    snapFabToEdge() {
        const { fab } = this.elements;
        const fabSize = fab.offsetWidth;
        const padding = 20;
        const viewportCenterX = window.innerWidth / 2;
        const navHeight = document.querySelector('.bottom-nav')?.offsetHeight || 85;

        // Xác định vị trí cuối cùng (trái hoặc phải)
        const finalX = (this.fabX + fabSize / 2 < viewportCenterX)
            ? padding
            : window.innerWidth - fabSize - padding;

        // Giới hạn vị trí theo chiều dọc
        const finalY = Math.max(padding, Math.min(this.fabY, window.innerHeight - fabSize - navHeight));

        this.fabX = finalX;
        this.fabY = finalY;

        // Thêm hiệu ứng "hít" vào cạnh mượt mà
        fab.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        fab.style.transform = `translate3d(${this.fabX}px, ${this.fabY}px, 0)`;
        
        localStorage.setItem(this.fabPositionStorageKey, JSON.stringify({ x: this.fabX, y: this.fabY }));

        // Xóa transition sau khi hiệu ứng kết thúc
        setTimeout(() => {
            fab.style.transition = '';
        }, 300);
    }

    // ===============================================
    // === LOGIC MODAL & CHAT (Không thay đổi nhiều) ===
    // ===============================================

    openChat() {
        const { modal, input } = this.elements;
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('visible');
            input.focus();
        }, 10); // Delay nhỏ để trình duyệt có thời gian render display:flex
    }

    closeChat() {
        const { modal, optionsMenu } = this.elements;
        optionsMenu.classList.remove('visible');
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 400); // Chờ hiệu ứng trượt xuống hoàn tất
    }

    initializeOptionsMenu() {
        const { optionsBtn, optionsMenu, deleteLogBtn, copyLogBtn } = this.elements;

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
                if(window.Utils) Utils.UIUtils.showMessage('Đã xóa cuộc trò chuyện.', 'success');
            }
        });

        copyLogBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const conversationText = this.chatHistory.map(msg => `${msg.sender.toUpperCase()}:\n${msg.text}`).join('\n\n');
            navigator.clipboard.writeText(conversationText)
                .then(() => { if(window.Utils) Utils.UIUtils.showMessage('Đã sao chép cuộc trò chuyện.', 'success')})
                .catch(() => { if(window.Utils) Utils.UIUtils.showMessage('Không thể sao chép.', 'error')});
            optionsMenu.classList.remove('visible');
        });

        // Đóng menu khi nhấn ra ngoài
        document.addEventListener('click', (e) => {
            if (!optionsMenu.contains(e.target) && !optionsBtn.contains(e.target)) {
                optionsMenu.classList.remove('visible');
            }
        });
    }
    
    handleEnterKey(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    handleModalClick(e) {
        if (e.target === this.elements.modal) {
            this.closeChat();
        }
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
            // === PHẦN NÀY LÀ NƠI GỌI API ĐẾN LLM CỦA BẠN ===
            // const aiResponse = await callYourLLMAPI(userInput, this.app.data);
            
            // Giả lập một API call
            setTimeout(() => {
                loadingMessage.remove();
                
                // Phản hồi giả lập từ AI
                const aiResponse = `Đã hiểu:
* **Loại:** Chi tiêu
* **Số tiền:** 50,000 ₫
* **Hạng mục:** Cà phê (Gợi ý)
* **Tài khoản:** Tiền mặt (Gợi ý)
* **Mô tả:** Cà phê`;
                
                this.addMessage(aiResponse, 'bot');

                // Kích hoạt lại khung nhập liệu
                this.elements.input.disabled = false;
                this.elements.sendBtn.disabled = false;
                this.elements.input.focus();
                
            }, 1200); // Giả lập độ trễ mạng

        } catch (error) {
            console.error('Error sending message to AI:', error);
            loadingMessage.remove();
            this.addMessage("Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.", 'bot');
            this.elements.input.disabled = false;
            this.elements.sendBtn.disabled = false;
        }
    }
}