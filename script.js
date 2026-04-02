// 1. 全域變數
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
        const response = await fetch(scriptURL, { method: 'GET', redirect: 'follow' });
        if (!response.ok) throw new Error('網路回應不正確');
        
        const data = await response.json();
        
        // 【關鍵修復】檢查拿到的資料是不是清單 (Array)
        if (Array.isArray(data)) {
            allShiftData = data;
            console.log("班表同步成功:", allShiftData);
            updateTimeSlots();
        } else {
            // 如果拿到的是 {result: 'success'} 而不是班表，就不執行 find
            console.warn("拿到的不是班表清單，格式為:", data);
        }
    } catch (error) {
        console.error("無法載入班表:", error);
    }
}

// 4. 監聽器設定 (修正括號問題)
document.addEventListener('DOMContentLoaded', () => {
    init();
    calculateDIRUNETotal();

    document.addEventListener('change', (e) => {
        if (e.target.name === 'cats' || e.target.name === 'timeSlots' || e.target.name === 'bookingDate') {
            calculateDIRUNETotal();
            updateTimeSlots();
        }
    });

    const bookingForm = document.forms['submit-to-google-sheet'] || document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.onsubmit = async function(e) {
            e.preventDefault();
            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;

            fetch(scriptURL, { 
                method: 'POST',  
                body: new FormData(bookingForm) 
            })
            .then(() => {
                alert('預約申請已送出！請稍後檢查確認。');
                bookingForm.reset();
                calculateDIRUNETotal();
                updateTimeSlots();
            })
            .catch(error => {
                alert('預約失敗，請檢查網路。');
            })
            .finally(() => {
                if (submitBtn) submitBtn.disabled = false;
            });
            return false;
        };
    }
}); // <--- 這就是你截圖中缺少的那個括號！

// 5. 更新可用時段
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