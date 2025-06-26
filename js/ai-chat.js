/**
 * AI CHAT MODULE - PHIÊN BẢN ĐÃ ĐƯỢC KIỂM TRA VÀ TỐI ƯU HÓA
 * - Sửa lỗi logic kéo-thả, đảm bảo chỉ nút FAB được di chuyển.
 * - Sử dụng 'transform' để tăng hiệu năng và độ mượt khi kéo.
 * - Tái cấu trúc 'initEventListeners' để tăng tính rõ ràng và dễ bảo trì.
 * - Giữ nguyên các chức năng cốt lõi: hít vào cạnh, ghi nhớ vị trí, phân biệt kéo/nhấn.
 */
class AIChatModule {
    constructor(app) {
        this.app = app;
        this.elements = {};
        this.chatHistory = [];
        this.storageKey = 'ai_chat_history';

        // Thuộc tính cho chức năng kéo-thả NÚT FAB
        this.isDragging = false; // Đổi tên để rõ ràng hơn
        this.wasDragged = false;
        this.dragThreshold = 5;

        this.dragStartX = 0;
        this.dragStartY = 0;

        // Tọa độ của nút FAB
        this.fabX = 0;
        this.fabY = 0;

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

        console.log('🤖 AI Chat Module Initialized (Optimized & Reviewed Version)');
    }

    initEventListeners() {
        // ---- 1. Gán các hàm xử lý sự kiện vào thuộc tính của class ----
        this.boundFabDragStart = this.fabDragStart.bind(this);
        this.boundFabDragMove = this.fabDragMove.bind(this);
        this.boundFabDragEnd = this.fabDragEnd.bind(this);
        this.boundSendMessage = this.sendMessage.bind(this);
        this.boundCloseChat = this.closeChat.bind(this);
        this.boundHandleModalClick = this.handleModalClick.bind(this);
        this.boundHandleEnterKey = this.handleEnterKey.bind(this);

        // ---- 2. Lấy các phần tử DOM ----
        const { fab, closeBtn, sendBtn, input, modal } = this.elements;

        // ---- 3. Gán sự kiện cho việc Kéo/Thả Nút FAB ----
        fab.addEventListener('pointerdown', this.boundFabDragStart);
        document.addEventListener('pointermove', this.boundFabDragMove);
        document.addEventListener('pointerup', this.boundFabDragEnd);

        // ---- 4. Gán sự kiện cho các hành động trong Modal Chat ----
        closeBtn.addEventListener('click', this.boundCloseChat);
        sendBtn.addEventListener('click', this.boundSendMessage);
        input.addEventListener('keypress', this.boundHandleEnterKey);
        modal.addEventListener('click', this.boundHandleModalClick);

        // ---- 5. Khởi tạo menu tùy chọn ----
        this.initOptionsMenu();
    }

    // == CÁC HÀM XỬ LÝ SỰ KIỆN PHỤ ==
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

    // == LOGIC KÉO THẢ NÚT FAB ==

    loadFabPosition() {
        const fab = this.elements.fab;
        const savedPosition = localStorage.getItem(this.fabPositionStorageKey);

        // Xóa thuộc tính top/left/bottom/right để transform hoạt động đúng
        fab.style.top = '0px';
        fab.style.left = '0px';
        fab.style.bottom = 'auto';
        fab.style.right = 'auto';

        if (savedPosition) {
            const { x, y } = JSON.parse(savedPosition);
            this.fabX = x;
            this.fabY = y;
        } else {
            // Vị trí mặc định ban đầu
            this.fabX = window.innerWidth - fab.offsetWidth - 20;
            this.fabY = window.innerHeight - fab.offsetHeight - 95;
        }
        fab.style.transform = `translate3d(${this.fabX}px, ${this.fabY}px, 0)`;
    }

    fabDragStart(e) {
        if (e.button && e.button !== 0) return; // Chỉ cho phép chuột trái

        const fab = this.elements.fab;
        fab.setPointerCapture(e.pointerId); // Bắt con trỏ để sự kiện không bị mất
        fab.style.transition = 'none'; // Tắt transition khi đang kéo
        fab.style.cursor = 'grabbing';

        this.isDragging = true;
        this.wasDragged = false;

        // Ghi lại vị trí bắt đầu kéo so với vị trí của nút
        this.dragStartX = e.clientX - this.fabX;
        this.dragStartY = e.clientY - this.fabY;

        // Bắt đầu vòng lặp animation để cập nhật vị trí
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = requestAnimationFrame(() => this.updateFabPosition());
    }

	fabDragMove(e) {
		if (!this.isDragging) return;

		// Cập nhật vị trí mới của nút
		const newX = e.clientX - this.dragStartX;
		const newY = e.clientY - this.dragStartY;
		
		// Chỉ xác nhận là "đã kéo" nếu di chuyển vượt ngưỡng
		if (!this.wasDragged && (Math.abs(newX - this.fabX) > this.dragThreshold || Math.abs(newY - this.fabY) > this.dragThreshold)) {
			this.wasDragged = true;

			// === THÊM MỚI: VÔ HIỆU HÓA NỀN KHI BẮT ĐẦU KÉO ===
			document.body.classList.add('is-dragging-chat');
			// ===============================================
		}
		
		this.fabX = newX;
		this.fabY = newY;
	}
    
    updateFabPosition() {
        if (!this.isDragging) return;

        this.elements.fab.style.transform = `translate3d(${this.fabX}px, ${this.fabY}px, 0)`;

        // Tiếp tục vòng lặp animation
        this.animationFrameId = requestAnimationFrame(() => this.updateFabPosition());
    }

	fabDragEnd(e) {
		// === THÊM MỚI: KÍCH HOẠT LẠI NỀN KHI KẾT THÚC KÉO ===
		// Luôn gỡ bỏ lớp CSS này khi người dùng nhấc ngón tay/chuột ra
		document.body.classList.remove('is-dragging-chat');
		// ===============================================

		if (!this.isDragging) return;

		this.isDragging = false;
		cancelAnimationFrame(this.animationFrameId);
		this.animationFrameId = null;

		const fab = this.elements.fab;
		try {
			fab.releasePointerCapture(e.pointerId); // Giải phóng con trỏ
		} catch(err) {
			// Bỏ qua lỗi nếu con trỏ đã được giải phóng tự động
		}
		fab.style.cursor = 'grab';

		if (this.wasDragged) {
			this.snapFabToEdge();
		} else {
			// Nếu không kéo, đó là một cú nhấn -> mở chat
			this.openChat();
		}
	}
    snapFabToEdge() {
        const fab = this.elements.fab;
        const fabSize = fab.offsetWidth;
        const padding = 20;
        const viewportCenterX = window.innerWidth / 2;
        const navHeight = document.querySelector('.bottom-nav')?.offsetHeight || 85;

        // Xác định vị trí cuối cùng
        const finalX = (this.fabX + fabSize / 2 < viewportCenterX)
            ? padding
            : window.innerWidth - fabSize - padding;

        const finalY = Math.max(padding, Math.min(this.fabY, window.innerHeight - fabSize - navHeight));

        this.fabX = finalX;
        this.fabY = finalY;

        // Thêm hiệu ứng "hít" vào cạnh mượt mà
        fab.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        fab.style.transform = `translate3d(${this.fabX}px, ${this.fabY}px, 0)`;
        
        localStorage.setItem(this.fabPositionStorageKey, JSON.stringify({ x: this.fabX, y: this.fabY }));

        setTimeout(() => {
            fab.style.transition = '';
        }, 300);
    }

    // == CÁC HÀM CÒN LẠI (GIỮ NGUYÊN) ==
    
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
                // Giả sử bạn có Utils.UIUtils.showMessage
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
            // This is where you would call your actual LLM API
            // const parsedData = await this.callLLMAPI(userInput, ...);
            
            // Simulating an API call with a timeout
            setTimeout(() => {
                loadingMessage.remove();
                
                // Mock response from AI
                const aiResponse = `Đã hiểu:
* **Loại:** Chi tiêu
* **Số tiền:** 50,000 ₫
* **Hạng mục:** Cà phê (Gợi ý)
* **Tài khoản:** Tiền mặt (Gợi ý)
* **Mô tả:** Cà phê`;
                
                this.addMessage(aiResponse, 'bot');

                // Re-enable input after response
                this.elements.input.disabled = false;
                this.elements.sendBtn.disabled = false;
                this.elements.input.focus();
                
            }, 1000);

        } catch (error) {
            console.error('Error sending message to AI:', error);
            loadingMessage.remove();
            this.addMessage("Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.", 'bot');
            this.elements.input.disabled = false;
            this.elements.sendBtn.disabled = false;
        }
    }
}