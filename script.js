const today = new Date();
const localDateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
document.getElementById('date-input').value = localDateStr;

const currentMonthStr = String(today.getMonth() + 1).padStart(2, '0');
document.getElementById('filter-month').value = currentMonthStr;

function populateYearDropdowns() {
    const filterYearSelect = document.getElementById('filter-year');
    const chartYearSelect = document.getElementById('chart-year');

    filterYearSelect.innerHTML = '';
    chartYearSelect.innerHTML = '';

    const currentYear = new Date().getFullYear();
    const years = new Set([currentYear]);

    const history = JSON.parse(localStorage.getItem('dailySpendingDetailed')) || {};
    Object.keys(history).forEach(dateStr => {
        const year = parseInt(dateStr.split('-')[0], 10);
        if (!isNaN(year)) {
            years.add(year);
        }
    });

    const sortedYears = Array.from(years).sort((a, b) => a - b);

    sortedYears.forEach(year => {
        const opt1 = document.createElement('option');
        opt1.value = year;
        opt1.textContent = year;
        filterYearSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = year;
        opt2.textContent = year;
        chartYearSelect.appendChild(opt2);
    });

    filterYearSelect.value = currentYear;
    chartYearSelect.value = currentYear;
}

/* Window Size Processor */
function toggleMaximize(id) {
    const el = document.getElementById(id);
    const overlay = document.getElementById('window-overlay');
    const btn = el.querySelector('.toggle-size-btn');

    if (el.classList.contains('maximized')) {
        el.classList.remove('maximized');
        overlay.style.display = 'none';
        btn.innerHTML = '<span class="maximize-icon"></span>';
    } else {
        closeAllMaximized();
        el.classList.add('maximized');
        overlay.style.display = 'block';
        btn.innerHTML = '<span class="restore-icon"></span>';
    }
}

function closeAllMaximized() {
    document.querySelectorAll('.window').forEach(w => {
        w.classList.remove('maximized');
        const btn = w.querySelector('.toggle-size-btn');
        if (btn) btn.innerHTML = '<span class="maximize-icon"></span>';
    });
    document.getElementById('window-overlay').style.display = 'none';
}

function loadLedger() {
    const ledgerBox = document.getElementById('ledger-box');
    const selectedDate = document.getElementById('date-input').value;
    const ledgerTitle = document.getElementById('ledger-title');

    ledgerBox.innerHTML = '';
    // Replace .textContent with .innerHTML
    ledgerTitle.innerHTML = `Entries for <b>${selectedDate || 'Selected Day'}</b>:`;

    const history = JSON.parse(localStorage.getItem('dailySpendingDetailed')) || {};
    const dayEntries = history[selectedDate] || [];

    if (dayEntries.length === 0) {
        ledgerBox.innerHTML = '<div style="color: #808080; text-align:center; margin-top:60px;">[No Records For This Date]</div>';
        renderMonthlySummary();
        renderAnnualChart();
        return;
    }

    dayEntries.forEach((entry, index) => {
        const div = document.createElement('div');
        div.className = 'log-item';
        div.innerHTML = `
            <span>${index + 1}. <strong>${entry.item}</strong></span>
            <span>₹${parseFloat(entry.amount).toFixed(2)} 
                <button class="delete-btn" onclick="deleteEntry('${selectedDate}', ${index})">[✕]</button>
            </span>
        `;
        ledgerBox.appendChild(div);
    });

    renderMonthlySummary();
    renderAnnualChart();
}

function renderMonthlySummary() {
    const targetMonth = document.getElementById('filter-month').value;
    const targetYear = document.getElementById('filter-year').value;
    const summaryBox = document.getElementById('monthly-summary-box');
    const totalBox = document.getElementById('total-spend-box');

    if (!targetYear) return;
    summaryBox.innerHTML = '';

    const history = JSON.parse(localStorage.getItem('dailySpendingDetailed')) || {};
    let runningMonthTotal = 0;
    const matchingDays = [];

    Object.keys(history).forEach(dateStr => {
        if (dateStr.startsWith(`${targetYear}-${targetMonth}`)) {
            let daySum = 0;
            history[dateStr].forEach(entry => {
                daySum += parseFloat(entry.amount);
            });

            runningMonthTotal += daySum;

            const parsedDate = new Date(dateStr);
            const readableDate = parsedDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            matchingDays.push({
                rawDate: dateStr,
                label: readableDate,
                total: daySum
            });
        }
    });

    totalBox.textContent = `₹${runningMonthTotal.toFixed(2)}`;

    if (matchingDays.length === 0) {
        summaryBox.innerHTML = '<div style="color: #808080; text-align:center; margin-top:60px;">[No Spend Records Found]</div>';
        return;
    }

    matchingDays.sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    matchingDays.forEach(day => {
        const div = document.createElement('div');
        div.className = 'log-item';
        div.style.cursor = 'pointer';
        div.onclick = () => {
            document.getElementById('date-input').value = day.rawDate;
            loadLedger();
        };
        div.innerHTML = `
            <span>📅 ${day.label}</span>
            <span style="color: #000080; font-weight: bold;">₹${day.total.toFixed(2)}</span>
        `;
        summaryBox.appendChild(div);
    });
}

function renderAnnualChart() {
    const targetYear = parseInt(document.getElementById('chart-year').value, 10);
    const chartBox = document.getElementById('annual-chart-box');
    if (!targetYear) return;
    chartBox.innerHTML = '';

    const history = JSON.parse(localStorage.getItem('dailySpendingDetailed')) || {};

    const monthlyTotals = Array(12).fill(0);
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let dataFound = false;

    Object.keys(history).forEach(dateStr => {
        if (dateStr.startsWith(targetYear.toString())) {
            const monthIndex = parseInt(dateStr.split('-')[1], 10) - 1;
            history[dateStr].forEach(entry => {
                monthlyTotals[monthIndex] += parseFloat(entry.amount);
                dataFound = true;
            });
        }
    });

    const sysDate = new Date();
    const sysYear = sysDate.getFullYear();
    const sysMonthIndex = sysDate.getMonth();

    let maxVisibleMonths = 12;
    if (targetYear === sysYear) {
        maxVisibleMonths = sysMonthIndex + 1;
    }

    if (!dataFound) {
        chartBox.innerHTML = '<div style="color: #808080; width: 100%; text-align:center; line-height: 160px;">[No Data Logs For Year]</div>';
        return;
    }

    const visibleTotals = monthlyTotals.slice(0, maxVisibleMonths);
    const absoluteYearlyMax = Math.max(...visibleTotals);

    for (let index = 0; index < maxVisibleMonths; index++) {
        const total = monthlyTotals[index];
        const barWrapper = document.createElement('div');
        barWrapper.className = 'chart-bar-wrapper';
        barWrapper.title = `${monthLabels[index]} ${targetYear}: ₹${total.toFixed(2)}`;

        const pct = absoluteYearlyMax > 0 ? (total / absoluteYearlyMax) * 80 : 0;
        const displayAmt = total > 0 ? `₹${Math.round(total)}` : '₹0';

        barWrapper.innerHTML = `
            <div style="font-size: 8px; margin-bottom: 2px; white-space: nowrap;">${total > 0 ? displayAmt : ''}</div>
            <div class="chart-bar"></div>
            <div class="chart-label" style="font-weight: ${total > 0 ? 'bold' : 'normal'}">${monthLabels[index]}</div>
        `;
        barWrapper.querySelector('.chart-bar').style.height = `${pct}%`;
        chartBox.appendChild(barWrapper);
    }
}

function saveSpending() {
    const dateInput = document.getElementById('date-input').value;
    const itemInput = document.getElementById('item-input').value.trim();
    const amountInput = document.getElementById('amount-input').value;

    if (!dateInput || !itemInput || !amountInput || amountInput <= 0) {
        alert("Error: Please provide valid date, label description, and amount.");
        return;
    }

    const history = JSON.parse(localStorage.getItem('dailySpendingDetailed')) || {};

    if (!history[dateInput]) {
        history[dateInput] = [];
    }

    history[dateInput].push({
        item: itemInput,
        amount: parseFloat(amountInput)
    });

    localStorage.setItem('dailySpendingDetailed', JSON.stringify(history));

    document.getElementById('item-input').value = '';
    document.getElementById('amount-input').value = '';

    populateYearDropdowns();
    loadLedger();
}

function deleteEntry(date, index) {
    const history = JSON.parse(localStorage.getItem('dailySpendingDetailed')) || {};
    if (history[date]) {
        history[date].splice(index, 1);
        if (history[date].length === 0) {
            delete history[date];
        }
        localStorage.setItem('dailySpendingDetailed', JSON.stringify(history));
    }
    populateYearDropdowns();
    loadLedger();
}

function exportDataFile() {
    const dataStr = localStorage.getItem('dailySpendingDetailed') || "{}";
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'spend_backup.txt');
    linkElement.click();
}

function importDataFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const parsedData = JSON.parse(e.target.result);
            if (typeof parsedData === 'object' && parsedData !== null) {
                localStorage.setItem('dailySpendingDetailed', JSON.stringify(parsedData));
                alert("System registry successfully updated.");
                populateYearDropdowns();
                loadLedger();
            } else {
                alert("Error: File payload invalid.");
            }
        } catch (err) {
            alert("Critical Error: Core format corrupted.");
        }
    };
    reader.readAsText(file);
}

// Initial Boot Sequence
populateYearDropdowns();
loadLedger();