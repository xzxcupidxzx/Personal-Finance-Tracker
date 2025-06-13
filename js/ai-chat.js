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
        console.log('🤖 AI Chat Module Initialized for Google Gemini');
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
            const incomeCategories = this.app.data.incomeCategories.map(c => c.value);
            const expenseCategories = this.app.data.expenseCategories.map(c => c.value);
            const accounts = this.app.data.accounts.map(a => a.value);

            const parsedData = await this.callLLMAPI(userInput, incomeCategories, expenseCategories, accounts);

            loadingMessage.remove();
            
            let confirmationText = `OK! Tôi đã ghi nhận:\n- Loại: ${parsedData.type}\n- Số tiền: ${Utils.CurrencyUtils.formatCurrency(parsedData.amount)}\n`;
            if (parsedData.type === 'Transfer') {
                confirmationText += `- Từ: ${parsedData.account}\n- Đến: ${parsedData.toAccount}`;
            } else {
                confirmationText += `- Hạng mục: ${parsedData.category}\n- Tài khoản: ${parsedData.account}`;
            }
            confirmationText += `\n- Mô tả: "${parsedData.description}"`;
            this.addMessage(confirmationText, 'bot');
            
            this.ensureAccountExists(parsedData.account);
            if(parsedData.type === 'Transfer') {
                this.ensureAccountExists(parsedData.toAccount);
            } else {
                this.ensureCategoryExists(parsedData.category, parsedData.type);
            }

            const success = this.app.addTransaction(parsedData);
            if (success) {
                this.app.refreshAllModules();
                // XÓA HOẶC VÔ HIỆU HÓA DÒNG NÀY ĐỂ CHATBOX KHÔNG TỰ ĐỘNG ĐÓNG
                // setTimeout(() => this.closeChat(), 2500); 
            }
        } catch (error) {
            console.error("Lỗi xử lý AI:", error);
            loadingMessage.remove();
            this.addMessage(`Rất tiếc, đã xảy ra lỗi. Vui lòng kiểm tra lại API Key và cài đặt Billing trên Google Cloud.`, 'bot');
        }
    }
    
    ensureAccountExists(accountName) {
        if (!this.app.data.accounts.some(acc => acc.value.toLowerCase() === accountName.toLowerCase())) {
            this.app.data.accounts.push({ value: accountName, text: accountName, createdAt: new Date().toISOString(), createdBy: 'ai_import' });
        }
    }

    ensureCategoryExists(categoryName, type) {
        const targetArray = type === 'Thu' ? this.app.data.incomeCategories : this.app.data.expenseCategories;
        if (!targetArray.some(cat => cat.value.toLowerCase() === categoryName.toLowerCase())) {
            targetArray.push({ value: categoryName, text: categoryName, createdAt: new Date().toISOString(), createdBy: 'ai_import' });
        }
    }

	async callLLMAPI(userInput, incomeCategories, expenseCategories, accounts) {
		// !!! THAY API KEY CỦA BẠN VÀO ĐÂY !!!
		const API_KEY = window.CONFIG.GEMINI_API_KEY;
		const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;

		const prompt = `Phân tích văn bản sau để tạo giao dịch: "${userInput}". Hạng mục Thu nhập: [${incomeCategories.join(", ")}]. Hạng mục Chi tiêu: [${expenseCategories.join(", ")}]. Tài khoản: [${accounts.join(", ")}]. Quy tắc: 1. Xác định 'type' là "Thu", "Chi", hoặc "Transfer". 2. Nếu là 'Transfer', phải có 'account' (nguồn) và 'toAccount' (đích). 3. 'amount' phải là số nguyên. Chỉ trả về một đối tượng JSON hợp lệ theo mẫu: {"type": "Chi", "amount": 50000, "category": "Đi lại", "account": "BIDV", "description": "đổ xăng"}`;

		const response = await fetch(API_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }],
				"generationConfig": { // Yêu cầu Gemini trả về JSON
					"responseMimeType": "application/json",
				}
			})
		});

		if (!response.ok) {
			console.error("API Error Response:", await response.text());
			throw new Error('Lỗi khi gọi Google Gemini API.');
		}
		
		const data = await response.json();
		const jsonString = data.candidates[0].content.parts[0].text;

		// === SỬA LỖI QUAN TRỌNG NẰM Ở ĐÂY ===
		// Chuyển đổi chuỗi JSON thành đối tượng JavaScript trước khi trả về
		try {
			return JSON.parse(jsonString);
		} catch (e) {
			console.error("Lỗi phân tích JSON từ AI:", jsonString);
			throw new Error("AI đã trả về một định dạng JSON không hợp lệ.");
		}
	}
}