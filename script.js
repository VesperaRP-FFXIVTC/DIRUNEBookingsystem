// 1. 全域變數 (請確認網址結尾是 exec)
const scriptURL = 'https://script.google.com/macros/s/AKfycbzVupRh1gjYn1FwNOY1spg46HXhkoD0xNd4K3ljRkwaOTeRkxrW79YjlQ6pn0UBlOQ7/execl';
const form = document.forms['submit-to-google-sheet'];

// 2. 自動計費邏輯 (放在頂端)
function calculateDIRUNETotal() {
    const cats = document.querySelectorAll('input[name="cats"]:checked').length;
    const slots = document.querySelectorAll('input[name="timeSlots"]:checked').length;
    const total = cats * slots * 50000;
    const display = document.getElementById('total-price');
    if (display) {
        display.innerText = `預計指名費用：${total.toLocaleString()} Gil`;
    }
}
document.addEventListener('change', calculateDIRUNETotal);
window.addEventListener('load', calculateDIRUNETotal);

// 3. 處理表單送出 (保留這一段即可)
if (form) {
    form.addEventListener('submit', e => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        
        console.log("正在送出預約資料...");

        fetch(scriptURL, { 
            method: 'POST', 
            body: new FormData(form) // 這樣寫最保險
        })
        .then(response => {
            console.log('送出成功!', response);
            alert('預約成功！我們已收到您的資訊。');
            form.reset();
            calculateDIRUNETotal();
            if (submitBtn) submitBtn.disabled = false;
        })
        .catch(error => {
            console.error('送出失敗!', error.message);
            alert('預約失敗，請檢查網路連線。');
            if (submitBtn) submitBtn.disabled = false;
        });
    });
}

// 4. 原本的班表讀取邏輯 (init, updateTimeSlots 等)
// ... 請接續放置你原本負責讀取班表的程式碼 ...
// 1. 網頁加載時抓取班表
async function init() {
    try {
        // 加入 redirect: 'follow' 處理 Google 的重導向
        const response = await fetch(scriptURL, {
            method: 'GET',
            redirect: 'follow'
        });
        
        // 檢查是否成功抓到資料
        if (!response.ok) throw new Error('網路回應不正確');
        
        allShiftData = await response.json();
        console.log("班表同步成功:", allShiftData);
    } catch (error) {
        console.error("無法載入班表，錯誤訊息:", error);
    }
}

window.onload = init;

// 2. 限制貓咪勾選數量 (最多3位)
const maxCats = 3;
document.querySelectorAll('input[name="cats"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        const checkedCount = document.querySelectorAll('input[name="cats"]:checked').length;
        if (checkedCount > maxCats) {
            this.checked = false;
            alert('抱歉，每筆預約最多只能指名 ' + maxCats + ' 位貓咪喔！');
        }
        updateTimeSlots(); // 每次勾選貓咪時都要更新可用時段
    });
});

// 監聽日期變更
document.querySelectorAll('input[name="bookingDate"]').forEach(radio => {
    radio.addEventListener('change', updateTimeSlots);
});

// 3. 動態更新可用時段邏輯
function updateTimeSlots() {
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
            console.log(`正在檢查貓咪：${catName} 的排班資料：`, staffShift.slots); // 偵錯用
            allTimeCheckboxes.forEach(cb => {
                const status = staffShift.slots[cb.value] ? staffShift.slots[cb.value].trim() : "";
                
                // 這裡改用更嚴格的判斷：只要不是「可預約」，通通鎖起來
                if (status !== "可預約" && status !== "") {
                    console.log(`發現不可預約時段：${cb.value}，狀態為：${status}`);
                    cb.disabled = true;
                    cb.checked = false;
                }
            });
        } else {
            console.warn(`找不到貓咪 ${catName} 在 ${selectedDate} 的排班`);
        }
    });
};