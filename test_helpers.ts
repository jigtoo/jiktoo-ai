
// Paste necessary helpers from BacktestEngine.ts to verify logic
// Mock interfaces
interface Bar { c: number; v?: number; o?: number; }
interface IndicatorCache { [key: string]: number[] }

// --- Helpers ---
function getIndicatorKey(name: string, params: number[]) {
    return `${name}_${params.join('_')}`;
}
function isStandardIndicator(name: string) {
    return ['SMA', 'EMA', 'RSI', 'Bollinger'].includes(name.toUpperCase());
}

function checkBinary(lhs: string, op: string, rhs: string, index: number, data: Bar[], cache: IndicatorCache): boolean {
    const resolve = (val: string, idx: number) => {
        // "SMA5", "SMA(5)", "Close"
        // Normalize "SMA(5)" -> "SMA5"
        let clean = val.replace(/[\(\)]/g, '').replace(' ', '');

        if (clean.toUpperCase() === 'CLOSE') return data[idx].c;
        if (clean.toUpperCase() === 'OPEN') return data[idx].o;

        // Match SMA120_20, SMA5
        const match = clean.match(/([A-Z]+)(\d+)(?:_(\d+))?/);
        if (match) {
            const name = match[1];
            const param = Number(match[2]);
            const offset = match[3] ? Number(match[3]) : 0;
            const t = idx - offset;
            if (isStandardIndicator(name)) {
                const key = getIndicatorKey(name, [param]);
                // console.log(`Resolve ${clean}: looking for ${key} at ${t}`);
                if (t < 0) return NaN;
                return cache[key] ? cache[key][t] : NaN;
            }
        }
        return NaN;
    };

    if (op === 'CROSS_UP') {
        const cl = resolve(lhs, index);
        const cr = resolve(rhs, index);
        const pl = resolve(lhs, index - 1);
        const pr = resolve(rhs, index - 1);
        // console.log(`CrossUp: ${lhs}(${cl}) > ${rhs}(${cr}) AND ${lhs}[-1](${pl}) <= ${rhs}[-1](${pr})`);
        return cl > cr && pl <= pr;
    }

    const l = resolve(lhs, index);
    const r = resolve(rhs, index);
    // console.log(`Binary: ${lhs}(${l}) ${op} ${rhs}(${r})`);

    // Allow strict inequality of NaNs? No.
    if (isNaN(l) || isNaN(r)) return false;

    if (op === '>') return l > r;
    if (op === '>=') return l >= r;
    if (op === '<') return l < r;
    return false;
}

function evaluateStringCondition(conditionRaw: string, index: number, data: Bar[], cache: IndicatorCache): boolean {
    const condStr = conditionRaw.trim().toUpperCase();

    // 1. Chains: "A > B > C"
    if (condStr.includes('>')) {
        const parts = condStr.split('>').map(s => s.trim());
        if (parts.length > 2) {
            for (let i = 0; i < parts.length - 1; i++) {
                if (!checkBinary(parts[i], '>', parts[i + 1], index, data, cache)) return false;
            }
            return true;
        } else if (parts.length === 2) {
            return checkBinary(parts[0], '>', parts[1], index, data, cache);
        }
    }

    // 2. Cross: "SMA5_CROSS_UP_SMA20"
    if (condStr.includes('_CROSS_UP_')) {
        const [l, r] = condStr.split('_CROSS_UP_');
        return checkBinary(l, 'CROSS_UP', r, index, data, cache);
    }
    return false;
}

// --- Test Case ---
function runTest() {
    console.log("Starting Logic Test...");

    // Mock Data: 10 bars
    // Price: 10, 11, 12... 
    const data: Bar[] = Array.from({ length: 30 }, (_, i) => ({ c: 100 + i, o: 100 + i })); // Uptrend

    // Mock Cache
    // SMA5 = Price (approx)
    // SMA20 = Price - small lag
    // SMA50 = Price - large lag
    const cache: IndicatorCache = {
        'SMA_5': data.map(d => d.c - 2), // SMA5 is consistently below Price
        'SMA_20': data.map(d => d.c - 10), // SMA20 is below SMA5
        'SMA_50': data.map(d => d.c - 20), // SMA50 is below SMA20
        'SMA_120': data.map(d => d.c - 30), // SMA120 even lower
    };

    const idx = 25; // Valid index

    // Test A: SMA5 > SMA20
    const resA = evaluateStringCondition("SMA5 > SMA20", idx, data, cache);
    console.log(`Test A (SMA5 > SMA20): ${resA} (Expected: true)`);

    // Test B: SMA5 > SMA20 > SMA50
    const resB = evaluateStringCondition("SMA5 > SMA20 > SMA50", idx, data, cache);
    console.log(`Test B (Chain): ${resB} (Expected: true)`);

    // Test C: Offset SMA20_5 (SMA20 5 bars ago)
    // At idx 25, SMA20 is (125-10)=115.
    // At idx 20 (5 bars ago), SMA20 is (120-10)=110.
    // Check SMA20 > SMA20_5 (115 > 110)
    const resC = evaluateStringCondition("SMA20 > SMA20_5", idx, data, cache);
    console.log(`Test C (Offset): ${resC} (Expected: true)`);

    // Test D: Cross Up
    // Mock Cross: SMA5 crosses SMA20
    // i=24: SMA5=100, SMA20=100 (Equal)
    // i=25: SMA5=105, SMA20=101 (Above)
    cache['SMA_5'][24] = 100; cache['SMA_20'][24] = 100;
    cache['SMA_5'][25] = 105; cache['SMA_20'][25] = 101;

    const resD = evaluateStringCondition("SMA5_CROSS_UP_SMA20", 25, data, cache);
    console.log(`Test D (CrossUp): ${resD} (Expected: true)`);
}

runTest();
