// 核心設定：請替換為你的 GAS 網址
const scriptURL = 'https://script.google.com/macros/s/AKfycbzVupRh1gjYn1FwNOY1spg46HXhkoD0xNd4K3ljRkwaOTeRkxrW79YjlQ6pn0UBlOQ7/exec';
let allShiftData = [];

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

    // 1. 重置狀態
    allTimeCheckboxes.forEach(cb => {
        cb.disabled = false;
        cb.parentElement.classList.remove('disabled-item');
    });

    if (!selectedDateEl || selectedCats.length === 0) return;

    // 取得選中的日期，並統一格式（把 - 換成 /，去除多餘空格）
    const selectedDate = selectedDateEl.value.trim().replace(/-/g, '/');

    selectedCats.forEach(catName => {
        // 在抓到的資料中尋找這隻貓咪
        const staffShift = allShiftData.find(s => {
            // 統一將資料庫的日期也轉成 / 格式進行比對
            const dbDate = s.date.trim().replace(/-/g, '/');
            return s.name.trim() === catName.trim() && dbDate === selectedDate;
        });
        
        if (staffShift) {
            allTimeCheckboxes.forEach(cb => {
                const status = staffShift.slots[cb.value];
                // 這裡最重要：只要狀態「不是」可預約，就鎖定
                // 這樣不管是「休假」還是「已預約」，都會變灰
                if (status !== "可預約") {
                    cb.disabled = true;
                    cb.checked = false;
                }
            });
        }
    });
}

// 4. 表單送出
document.getElementById('bookingForm').onsubmit = function(e) {
    e.preventDefault();
    
    const formData = {
        gameId: document.getElementById('gameId').value,
        cats: Array.from(document.querySelectorAll('input[name="cats"]:checked')).map(el => el.value),
        bookingDate: document.querySelector('input[name="bookingDate"]:checked').value,
        timeSlots: Array.from(document.querySelectorAll('input[name="timeSlots"]:checked')).map(el => el.value),
        notes: document.getElementById('notes').value
    };

    if (formData.cats.length === 0) return alert('請至少選擇一位指名的貓咪！');
    if (formData.timeSlots.length === 0) return alert('請至少選擇一個預約時段！');

    fetch(scriptURL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        body: JSON.stringify(formData)
    })
    .then(() => {
        alert('預約成功！感謝您的預約。');
        document.getElementById('bookingForm').reset();
        updateTimeSlots(); // 重置介面
    })
    .catch(error => alert('預約失敗，請稍後再試。' + error.message));
};