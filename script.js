// 1. 在最頂端宣告變數，防止 "is not defined" 錯誤
const scriptURL = 'https://script.google.com/macros/s/AKfycbzVupRh1gjYn1FwNOY1spg46HXhkoD0xNd4K3ljRkwaOTeRkxrW79YjlQ6pn0UBlOQ7/exec';
let allShiftData = []; 

// 2. 自動計費邏輯
function calculateDIRUNETotal() {
    const cats = document.querySelectorAll('input[name="cats"]:checked').length;
    const slots = document.querySelectorAll('input[name="timeSlots"]:checked').length;
    const total = cats * slots * 50000;
    const display = document.getElementById('total-price');
    if (display) {
        display.innerText = `預計指名費用：${total.toLocaleString()} Gil`;
    }
}

// 3. 抓取班表資料
async function init() {
    try {
        console.log("正在嘗試連線至 Google Sheet...");
        const response = await fetch(scriptURL, { method: 'GET', redirect: 'follow' });
        if (!response.ok) throw new Error('網路回應不正確');
        allShiftData = await response.json();
        console.log("班表同步成功:", allShiftData);
        updateTimeSlots(); 
    } catch (error) {
        console.error("無法載入班表:", error);
    }
}

// 4. 監聽器設定 (放在 DOMContentLoaded 確保 HTML 元素都讀取完了)
document.addEventListener('DOMContentLoaded', () => {
    init();
    calculateDIRUNETotal();

    // 監聽所有勾選變動
    document.addEventListener('change', (e) => {
        if (e.target.name === 'cats' || e.target.name === 'timeSlots' || e.target.name === 'bookingDate') {
            calculateDIRUNETotal();
            updateTimeSlots();
        }
    });

    // 限制貓咪數量
    document.querySelectorAll('input[name="cats"]').forEach(cb => {
        cb.addEventListener('change', function() {
            if (document.querySelectorAll('input[name="cats"]:checked').length > 3) {
                this.checked = false;
                alert('每筆預約最多只能指名 3 位貓咪喔！');
            }
        });
    });

    // --- 關鍵修復：處理表單送出 ---
    const bookingForm = document.forms['submit-to-google-sheet'] || document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.onsubmit = async function(e) {
            e.preventDefault(); // 【重要】強制停止網頁跳轉與重刷
            e.stopPropagation();

            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = "傳送中...";
            }

            console.log("正在送出預約...");

            try {
                const response = await fetch(scriptURL, { 
                    method: 'POST', 
                    body: new FormData(bookingForm) 
                });
                
                alert('預約成功！我們已收到您的資訊。');
                bookingForm.reset(); // 送出成功後才清空
                calculateDIRUNETotal();
                updateTimeSlots();
            } catch (error) {
                console.error('送出失敗!', error);
                alert('預約失敗，請檢查網路連線。');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "確定預約";
                }
            }
            return false; // 二重保險：防止跳轉
        };
    }
});

// 5. 更新可用時段 (加入安全鎖)
function updateTimeSlots() {
    if (!allShiftData || allShiftData.length === 0) return;
    
    const selectedCats = Array.from(document.querySelectorAll('input[name="cats"]:checked')).map(el => el.value);
    const selectedDateEl = document.querySelector('input[name="bookingDate"]:checked');
    const allTimeCheckboxes = document.querySelectorAll('input[name="timeSlots"]');

    allTimeCheckboxes.forEach(cb => {
        cb.disabled = false;
        cb.parentElement.classList.remove('disabled-item');
    });

    if (!selectedDateEl || selectedCats.length === 0) return;
    const selectedDate = selectedDateEl.value.trim().replace(/-/g, '/');

    selectedCats.forEach(catName => {
        const staffShift = allShiftData.find(s => {
            const dbDate = s.date.trim().replace(/-/g, '/');
            return s.name.trim() === catName.trim() && dbDate === selectedDate;
        });
        
        if (staffShift) {
            allTimeCheckboxes.forEach(cb => {
                const status = staffShift.slots[cb.value] ? staffShift.slots[cb.value].trim() : "";
                if (status !== "可預約" && status !== "") {
                    cb.disabled = true;
                    cb.checked = false;
                }
            });
        }
    });
}