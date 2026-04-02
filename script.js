// 1. 基本設定（已修正網址拼字）
const scriptURL = 'https://script.google.com/macros/s/AKfycbzVupRh1gjYn1FwNOY1spg46HXhkoD0xNd4K3ljRkwaOTeRkxrW79YjlQ6pn0UBlOQ7/exec';
const form = document.forms['submit-to-google-sheet'];
let allShiftData = []; // 儲存班表資料

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
    init(); // 抓班表
    calculateDIRUNETotal(); // 算錢
});
document.addEventListener('change', calculateDIRUNETotal);

// 4. 抓取 Google 試算表班表
async function init() {
    try {
        const response = await fetch(scriptURL, { method: 'GET', redirect: 'follow' });
        allShiftData = await response.json();
        console.log("班表同步成功");
        updateTimeSlots(); 
    } catch (error) {
        console.error("班表載入失敗:", error);
    }
}

// 5. 限制貓咪數量 (最多3位) 與連動時段
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

// 6. 日期變更監聽
document.querySelectorAll('input[name="bookingDate"]').forEach(radio => {
    radio.addEventListener('change', updateTimeSlots);
});

// 7. 更新可用時段邏輯
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

// 8. 處理表單送出（資料傳到 Excel）
if (form) {
    form.addEventListener('submit', e => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        
        fetch(scriptURL, { method: 'POST', body: new FormData(form) })
        .then(response => {
            alert('預約成功！');
            form.reset();
            calculateDIRUNETotal();
            updateTimeSlots();
            submitBtn.disabled = false;
        })
        .catch(error => {
            alert('預約失敗，請稍後再試。');
            submitBtn.disabled = false;
        });
    });
}