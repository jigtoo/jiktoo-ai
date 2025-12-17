# Jiktoo Strategy Lab 2.0: The Ultimate Hybrid Screener

## 1. Benchmarking Report

We analyzed the industry leaders to identify the best features to incorporate into Jiktoo.

### 🥇 Kiwoom Hero (The Logical Powerhouse)
*   **Best Feature:** **Logical Grouping (AND/OR/NOT)**.
    *   Allows complex nesting like `(A AND B) OR (C AND D)`.
    *   Crucial for sophisticated traders who combine disparate conditions (e.g., "Bullish Trend" OR "Oversold Bounce").
*   **Killer Feature:** **Real-time Search (Jang-Joong)**.
    *   Strategies are not just for scanning past data; they actively "hunt" stocks in real-time.
*   **Weakness:** complex UI, steep learning curve (codes, proprietary syntax).

### 🥈 TradingView (The Visual & Flexible)
*   **Best Feature:** **UX/UI & Sliders**.
    *   Extremely intuitive "Range Sliders" for filters (e.g., Market Cap > 10B).
*   **Killer Feature:** **Pine Script**.
    *   Infinite flexibility. If you can code it, you can screen it.
*   **Weakness:** Pine Script is hard for non-coders. The basic GUI is too simple for complex logic.

---

## 2. Jiktoo Strategy Lab 2.0 Concept
**"Hyper-Hybrid Engine": The Best of AI + Visual Logic + Real-time.**

We will not choose between "Easy (TradingView GUI)" and "Powerful (Kiwoom Logic)". We will use **AI** to bridge them.

### Core Philosophy
> "Tell the AI what you want, see the Logic Blocks it builds, and let the Hunter execute it."

---

## 3. Key Features Proposal

### A. AI-First Input (The Jiktoo Edge)
*   **Comparison:** Unlike Kiwoom (manual search) or TradingView (manual filters), Jiktoo starts with **Natural Language**.
*   **Workflow:** User types *"Find Golden Cross stocks with RSI under 40"*.
*   **Action:** AI parses this into the **Visual Logic Blocks** below.

### B. Visual Logic Blocks (Kiwoom-Style Logic, TradingView-Style UX)
Instead of just a list of strings, we will implement a **Block-based UI**.
*   **Structure:**
    *   `[ Block A: MA(20) > MA(60) ]`
    *   `   AND`
    *   `[ Group B: (RSI < 30) OR (MFI < 20) ]`
*   **Benefit:** Users can verify and tweak what the AI generated. No "black box" logic.

### C. The "Hunter" Mode (Real-time Execution)
*   **Concept:** A saved strategy is not static. It becomes a **"Hunter"**.
*   **Mechanism:**
    *   The `AutonomousScheduler` will have a new cycle: `runHunters()`.
    *   It iterates through active User Strategies every minute (or 10 mins).
    *   If a stock hits the condition, it pushes a **Real-time Alert** via Telegram/App.

### D. "Backtest-First" Safety Valve
*   **Rule:** You cannot enable "Hunter Mode" until you pass a **Backtest**.
*   **Reason:** Prevents spamming alerts from bad logic.
*   **Implementation:** Use the existing `runRealBacktest` (Polygon.io) to validate the "Win Rate" before deployment.

---

## 4. Technical Roadmap (Schema Proposal)

To support this, we need to upgrade `UserDefinedStrategyRules` from a simple string array to a structured JSON tree.

```typescript
// Proposed New Type Structure

type LogicOperator = 'AND' | 'OR' | 'NOT';

interface StrategyCondition {
  id: string;
  type: 'INDICATOR' | 'PATTERN' | 'FUNDAMENTAL';
  field: string; // e.g., 'RSI'
  params: Record<string, any>; // e.g., { period: 14 }
  operator: '>' | '<' | '=' | 'CROSS_UP' | 'CROSS_DOWN';
  value: number;
}

interface LogicGroup {
  type: 'GROUP';
  operator: LogicOperator; // Connection to previous block
  conditions: (StrategyCondition | LogicGroup)[]; // Recursive nesting
}

interface JiktooStrategy {
  name: string;
  logic: LogicGroup; // The root logic tree
  execution: {
    targetMarket: 'KR' | 'US';
    timeframe: '1m' | '1h' | '1d';
    alertChannel: 'TELEGRAM' | 'APP';
  }
}
```

## 5. Next Steps
1.  **Refine Logic Schema:** precise definition of supported indicators.
2.  **UI Prototype:** Design the "Block Builder" component.
3.  **Backend Update:** Update `AutonomousScheduler` to interpret this JSON logic (The Hunter).
