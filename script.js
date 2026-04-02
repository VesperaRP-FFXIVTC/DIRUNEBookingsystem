// 1. 基本設定（已修正網址拼字，結尾必須是 exec）
const scriptURL = 'https://script.google.com/macros/s/AKfycbzVupRh1gjYn1FwNOY1spg46HXhkoD0xNd4K3ljRkwaOTeRkxrW79YjlQ6pn0UBlOQ7/exec';
const form = document.forms['submit-to-google-sheet'];
let allShiftData = []; 

// 2. 自動計費功能
function calculateDIRUNETotal() {
    const cats = document.querySelectorAll('input[name="cats"]:checked').length;
    const slots = document.querySelectorAll('input[name="timeSlots"]:checked').length;
    const total = cats * slots * 50000;
    const display = document.getElementById('total-price');
    if (display) {
        display.innerText = `預計指名費用：${total.toLocaleString()} Gil`;
    }
}

// 3. 網頁載入與監聽
window.addEventListener('load', () => {
    init(); // 抓取班表資料
    calculateDIRUNETotal(); 
});
document.addEventListener('change', calculateDIRUNETotal);

// 4. 抓取 Google 試算表班表資料
async function init() {
    try {
        const response = await fetch(scriptURL, { method: 'GET', redirect: 'follow' });
        if (!response.ok) throw new Error('網路回應不正確');
        allShiftData = await response.json();
        console.log("班表同步成功:", allShiftData);
        updateTimeSlots(); 
    } catch (error) {
        console.error("班表載入失敗:", error);
    }
}

// 5. 限制貓咪數量 (最多3位) [cite: 11]
document.querySelectorAll('input[name="cats"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        const checkedCount = document.querySelectorAll('input[name="cats"]:checked').length;
        if (checkedCount > 3) {
            this.checked = false;
            alert('抱歉，每筆預約最多只能指名 3 位貓咪喔！');
        }
        updateTimeSlots(); 
    });
});

// 6. 日期變更監聽 [cite: 12]
document.querySelectorAll('input[name="bookingDate"]').forEach(radio => {
    radio.addEventListener('change', updateTimeSlots);
});

// 7. 更新可用時段邏輯 [cite: 13]
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

// 8. 處理表單送出（將資料傳送到 Excel）
if (form) {
    form.addEventListener('submit', e => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        
        console.log("正在送出預約資料...");

        fetch(scriptURL, { 
            method: 'POST', 
            body: new FormData(form) 
        })
        .then(response => {
            console.log('送出成功!', response);
            alert('預約成功！我們已收到您的資訊。');
            form.reset();
            calculateDIRUNETotal(); 
            updateTimeSlots(); 
            if (submitBtn) submitBtn.disabled = false;
        })
        .catch(error => {
            console.error('送出失敗!', error.message);
            alert('預約失敗，請檢查網路連線。');
            if (submitBtn) submitBtn.disabled = false;
        });
    });
}