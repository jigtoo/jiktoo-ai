
// test_engine_bundled.ts

// --- MOCK TYPES ---
interface LogicGroup {
    id: string;
    type: 'GROUP';
    operator: 'AND' | 'OR';
    children: (any | LogicGroup)[];
}
interface Bar { t: number; o: number; h: number; l: number; c: number; v: number; }

// --- TECHNICAL ANALYSIS MOCK ---
class TechnicalAnalysis {
    static SMA(data: number[], period: number): number[] {
        if (data.length < period) return new Array(data.length).fill(NaN);
        const results = [];
        let sum = 0;
        for (let i = 0; i < period; i++) sum += data[i];
        results.push(sum / period);
        for (let i = period; i < data.length; i++) {
            sum = sum - data[i - period] + data[i];
            results.push(sum / period);
        }
        return [...new Array(period - 1).fill(NaN), ...results];
    }
}

// --- ENGINE LOGIC EXTRACT ---
function getIndicatorKey(name: string, params: number[]) {
    return `${name}_${params.join('_')}`;
}

function evaluateLogic(logic: any, index: number, data: Bar[], cache: any): boolean {
    if (!logic) return false;
    if (logic.type === 'GROUP') {
        const results = logic.children.map((child: any) => evaluateLogic(child, index, data, cache));
        if (logic.operator === 'AND') return results.every((r: boolean) => r);
        if (logic.operator === 'OR') return results.some((r: boolean) => r);
        return false;
    }

    const cond = logic;

    // --- CROSS_UP LOGIC START ---
    if (cond.operator === 'CROSS_UP' || cond.operator === 'CROSS_DOWN') {
        if (index === 0) return false;

        const getValue = (idx: number) => {
            // LHS
            let l = 0;
            if (cond.indicator === 'Close') l = data[idx].c;
            else if (cond.indicator === 'SMA') {
                const param = cond.params && cond.params.length > 0 ? Number(cond.params[0].value) : 14;
                const key = getIndicatorKey(cond.indicator, [param]);
                l = cache[key] ? cache[key][idx] : NaN;
            }

            // RHS
            let r = 0;
            if (cond.comparisonType === 'NUMBER') {
                r = Number(cond.comparisonValue);
            } else {
                if (typeof cond.comparisonValue === 'string' && cond.comparisonValue.startsWith('SMA')) {
                    const match = cond.comparisonValue.match(/\((\d+)\)/);
                    const p = match ? Number(match[1]) : 20;
                    const key = getIndicatorKey('SMA', [p]);
                    r = cache[key] ? cache[key][idx] : NaN;
                } else {
                    r = Number(cond.comparisonValue);
                }
            }
            return { l, r };
        };

        const curr = getValue(index);
        const prev = getValue(index - 1);

        console.log(`Idx: ${index}, CurrL: ${curr.l.toFixed(2)}, CurrR: ${curr.r.toFixed(2)}, PrevL: ${prev.l.toFixed(2)}, PrevR: ${prev.r.toFixed(2)}`);

        if (isNaN(curr.l) || isNaN(curr.r) || isNaN(prev.l) || isNaN(prev.r)) return false;

        if (cond.operator === 'CROSS_UP') return curr.l > curr.r && prev.l <= prev.r;
        if (cond.operator === 'CROSS_DOWN') return curr.l < curr.r && prev.l >= prev.r;
    }
    // --- CROSS_UP LOGIC END ---

    return false;
}

// --- RUNNER ---
async function run() {
    const mockData: Bar[] = [];
    for (let i = 0; i < 200; i++) {
        // Simple Cross: SMA 5 (Fast) vs SMA 20 (Slow)
        // Price starts low, goes high to pull SMA 5 above SMA 20
        const price = 100 + (i > 50 && i < 150 ? 50 : 0);
        mockData.push({ t: i, o: price, h: price, l: price, c: price, v: 100 });
    }

    const closes = mockData.map(d => d.c);
    const cache: any = {};

    // Calc SMA 5 & 20
    cache['SMA_5'] = TechnicalAnalysis.SMA(closes, 5);
    cache['SMA_20'] = TechnicalAnalysis.SMA(closes, 20);

    const logic = {
        id: 'cond1',
        type: 'INDICATOR',
        indicator: 'SMA',
        params: [{ name: 'period', value: 5 }],
        operator: 'CROSS_UP',
        comparisonType: 'INDICATOR',
        comparisonValue: 'SMA(20)'
    };

    console.log("Starting Simulation...");
    let trades = 0;
    for (let i = 20; i < mockData.length; i++) {
        if (evaluateLogic(logic, i, mockData, cache)) {
            console.log(`CROSS UP DETECTED at index ${i}`);
            trades++;
        }
    }
    console.log(`Total Trades: ${trades}`);
}

run();
