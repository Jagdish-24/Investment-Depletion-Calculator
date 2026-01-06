// Utility: Format number with Indian commas
function formatNumberInput(value) {
    if (!value) return "";
    // Remove existing commas to get raw number
    const rawValue = value.toString().replace(/,/g, '');
    if (isNaN(rawValue)) return value;
    
    // Format using Indian locale
    return parseFloat(rawValue).toLocaleString('en-IN');
}

// Utility: Parse number from formatted string
function parseFormattedNumber(value) {
    if (!value) return 0;
    const rawValue = value.toString().replace(/,/g, '');
    return parseFloat(rawValue) || 0;
}

// Utility: Convert Number to Words (Precise)
function getNumberToWords(number) {
    if (isNaN(number) || number === 0) return "Zero";
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    function convertLessThanOneThousand(n) {
        if (n === 0) return '';
        
        let words = '';
        
        if (n >= 100) {
            words += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
            if (n > 0) words += 'and ';
        }
        
        if (n >= 20) {
            words += tens[Math.floor(n / 10)];
            if (n % 10 > 0) words += ' ' + ones[n % 10];
        } else if (n >= 10) {
            words += teens[n - 10];
        } else if (n > 0) {
            words += ones[n];
        }
        
        return words.trim();
    }

    let n = Math.floor(number);
    let result = '';
    
    // Crore
    const crore = Math.floor(n / 10000000);
    if (crore > 0) {
        result += convertLessThanOneThousand(crore) + ' Crore ';
    }
    n %= 10000000;

    // Lakh
    const lakh = Math.floor(n / 100000);
    if (lakh > 0) {
        result += convertLessThanOneThousand(lakh) + ' Lakh ';
    }
    n %= 100000;

    // Thousand
    const thousand = Math.floor(n / 1000);
    if (thousand > 0) {
        result += convertLessThanOneThousand(thousand) + ' Thousand ';
    }
    n %= 1000;

    // Remaining (Hundred + Tens + Ones)
    if (n > 0) {
        result += convertLessThanOneThousand(n);
    }
    
    return result.trim();
}

// Event Listeners for Input Formatting
function setupInputFormatting(id) {
    const input = document.getElementById(id);
    
    // Initial format
    input.value = formatNumberInput(input.value);
    
    input.addEventListener('input', (e) => {
        // Save cursor position logic could go here but simple reformat is requested
        // For standard "input" simply reformatting might jump cursor, 
        // to keep it simple and robust:
        
        const cursorPosition = e.target.selectionStart;
        const originalLength = e.target.value.length;
        const oldCount = (e.target.value.substring(0, cursorPosition).match(/,/g) || []).length;
        
        const raw = e.target.value.replace(/,/g, '');
        if (!isNaN(raw) && raw !== '') {
            const formatted = parseFloat(raw).toLocaleString('en-IN');
            e.target.value = formatted;
            
            // Adjust cursor (basic estimation)
            const newLength = formatted.length;
            const newCount = (formatted.match(/,/g) || []).length;
            const addedCommas = newCount - oldCount;
            
            // If we are at the end, stay at end
            if (cursorPosition === originalLength) {
                 // do nothing, browser usually handles end
            } 
        }
        
        calculate(); // Recalculate immediately
    });
}

function init() {
    setupInputFormatting('capital');
    setupInputFormatting('withdrawal');
    
    // Standard inputs (no comma needed often, but good to have calc on change)
    document.getElementById('fdRate').addEventListener('input', calculate);
    document.getElementById('niftyRate').addEventListener('input', calculate);
    document.getElementById('taxRate').addEventListener('input', calculate);
    
    calculate();
}

function calculate() {
    // Get Raw Values
    const capital = parseFormattedNumber(document.getElementById('capital').value);
    const fdRateQuery = parseFloat(document.getElementById('fdRate').value) || 0;
    const niftyRate = parseFloat(document.getElementById('niftyRate').value) || 0;
    const withdrawal = parseFormattedNumber(document.getElementById('withdrawal').value);
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;

    // Update Helper Words
    document.getElementById('capital-words').textContent = capital > 0 ? getNumberToWords(capital) : "";
    document.getElementById('withdrawal-words').textContent = withdrawal > 0 ? getNumberToWords(withdrawal) : "";

    // Allocations
    const fdPrincipal = capital / 2;
    const niftyPrincipal = capital / 2;

    document.getElementById('fd-initial').textContent = fdPrincipal.toLocaleString('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0});
    document.getElementById('nifty-initial').textContent = niftyPrincipal.toLocaleString('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0});

    // --- FD Calculation (Variable Rate) ---
    // Rule: First year (0-11 months) is fixed at 6.0%. Subsequent years use the input rate.
    let balance = fdPrincipal;
    let months = 0;
    
    // Rates per month
    const rateYear1 = (6.0 / 100) / 12;      // Fixed 6% first year
    const rateYear2Plus = (fdRateQuery / 100) / 12; // User input rate thereafter

    // Build timeline cap (e.g. 100 years)
    while (balance > 0 && months < 1200) {
        // Determine rate based on month index
        // Months 0-11 use Year 1 rate. Month 12+ use Year 2+ rate.
        const currentMonthlyRate = (months < 12) ? rateYear1 : rateYear2Plus;
        
        const interest = balance * currentMonthlyRate;
        balance = balance + interest - withdrawal;
        months++;
    }

    // Display FD
    let fdResult = "";
    let fdSub = "";
    
    if (months >= 1200) {
        fdResult = "Indefinite";
        fdSub = "Interest covers monthly withdrawal";
    } else {
        const years = Math.floor(months / 12);
        const remMonths = months % 12;
        fdResult = `${months} Months`;
        
        let timeString = [];
        if (years > 0) timeString.push(`${years} Years`);
        if (remMonths > 0) timeString.push(`${remMonths} Months`);
        fdSub = `~ ${timeString.join(', ')}`;
    }

    document.getElementById('fd-duration').textContent = fdResult;
    document.getElementById('fd-details').textContent = fdSub;


    // --- Nifty Calculation (Linked Duration) ---
    // Duration strictly linked to FD survival months
    const yearsFloat = months / 12;
    
    // Compound Interest Formula: A = P(1 + r/n)^(nt) -> assuming annual compounding (n=1) for simpler CAGR match
    // OR monthly compounding to match FD precision? 
    // Standard CAGR applies annually. P * (1 + r)^t
    const niftyGross = niftyPrincipal * Math.pow((1 + niftyRate / 100), yearsFloat);
    
    // Tax Logic (Profit Only)
    const gains = niftyGross - niftyPrincipal;
    const tax = gains > 0 ? gains * (taxRate / 100) : 0;
    const niftyNet = niftyGross - tax;

    // Display Nifty
    document.getElementById('nifty-value').textContent = niftyNet.toLocaleString('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0});
    
    document.getElementById('nifty-gross').textContent = `Gross: ${niftyGross.toLocaleString('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0})}`;
    // Explicitly show tax is on profit
    document.getElementById('nifty-tax').textContent = `Tax (${taxRate}% on Gains): ${tax.toLocaleString('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0})}`;
    
    document.getElementById('nifty-words').textContent = getNumberToWords(Math.round(niftyNet));
}

function copySummary() {
    const capital = document.getElementById('capital').value;
    const fdRate = document.getElementById('fdRate').value;
    const niftyRate = document.getElementById('niftyRate').value;
    const withdrawal = document.getElementById('withdrawal').value;
    const taxRate = document.getElementById('taxRate').value;
    
    // Helper to get text safely
    const getTxt = (id) => document.getElementById(id).textContent.trim();

    const text = `FINANCIAL PROJECTION SUMMARY
----------------------------
INPUTS
Capital: ₹${capital}
Strategy: 50:50 Split
Rates: FD ${fdRate}% | Nifty ${niftyRate}%
Tax Rate: ${taxRate}%
Monthly Withdrawal: ₹${withdrawal}

PROJECTIONS
1. Fixed Deposit (Survival Duration)
   Duration: ${getTxt('fd-duration')}
   Status: ${getTxt('fd-details')}

2. Nifty 50 (Future Value)
   Net Value: ${getTxt('nifty-value')}
   Breakdown: 
   - ${getTxt('nifty-gross')}
   - ${getTxt('nifty-tax')}

INITIAL ALLOCATION
FD Fund: ${getTxt('fd-initial')}
Nifty Fund: ${getTxt('nifty-initial')}
----------------------------`;
    
    navigator.clipboard.writeText(text).then(() => {
        alert("Detailed summary copied to clipboard!"); 
    });
}

// Run on load
window.addEventListener('DOMContentLoaded', init);
