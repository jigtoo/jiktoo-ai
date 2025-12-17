// services/strategy/GeneticOptimizer.ts
import { StrategyGenome, LogicGroup } from '../types';

/**
 * GENETIC OPTIMIZER (The "Gene" Engine)
 * Responsibilities:
 * 1. Mutate: Randomly alter strategy parameters (DNA).
 * 2. Crossover: Combine two successful strategies (Mom & Dad).
 * 3. Logic Mutation: (Advanced) Alter the boolean logic structure itself.
 */

export class GeneticOptimizer {

    // Mutation Rate (Probability of a gene changing)
    private readonly MUTATION_RATE = 0.3;
    // Mutation Magnitude (How much it changes, e.g. +/- 20%)
    private readonly MUTATION_STRENGTH = 0.2;

    /**
     * Asexual Reproduction (Self-Improvement)
     * Takes a parent genome and introduces random variations.
     */
    public mutate(parent: StrategyGenome): StrategyGenome {
        const child = { ...parent };

        // 1. Mutate Moving Averages
        if (this.shouldMutate()) child.maShort = this.adj(child.maShort, 3, 20);
        if (this.shouldMutate()) child.maLong = this.adj(child.maLong, 20, 200);

        // Ensure reasonable spread
        if (child.maShort >= child.maLong) {
            child.maLong = child.maShort + 5;
        }

        // 2. Mutate RSI
        if (this.shouldMutate()) child.rsiPeriod = this.adj(child.rsiPeriod, 5, 28);
        if (this.shouldMutate()) child.rsiBuy = this.adj(child.rsiBuy, 10, 50);
        if (this.shouldMutate()) child.rsiSell = this.adj(child.rsiSell, 50, 90);

        // 3. Mutate Bollinger Bands
        if (this.shouldMutate()) child.bbPeriod = this.adj(child.bbPeriod, 10, 50);
        if (this.shouldMutate()) child.bbDev = this.adjFloat(child.bbDev, 1.0, 3.0);

        // 4. Mutate Risk Management
        if (this.shouldMutate()) child.stopLoss = this.adjFloat(child.stopLoss, 0.85, 0.99);
        if (this.shouldMutate()) child.takeProfit = this.adjFloat(child.takeProfit, 1.01, 1.30);

        return child;
    }

    /**
     * Crossover (Sexual Reproduction)
     * Combines genes from two parents.
     */
    public crossover(mom: StrategyGenome, dad: StrategyGenome): StrategyGenome {
        return {
            maShort: Math.random() > 0.5 ? mom.maShort : dad.maShort,
            maLong: Math.random() > 0.5 ? mom.maLong : dad.maLong,
            rsiPeriod: Math.random() > 0.5 ? mom.rsiPeriod : dad.rsiPeriod,
            rsiBuy: Math.random() > 0.5 ? mom.rsiBuy : dad.rsiBuy,
            rsiSell: Math.random() > 0.5 ? mom.rsiSell : dad.rsiSell,
            bbPeriod: Math.random() > 0.5 ? mom.bbPeriod : dad.bbPeriod,
            bbDev: Math.random() > 0.5 ? mom.bbDev : dad.bbDev,
            stochK: Math.random() > 0.5 ? mom.stochK : dad.stochK,
            stochD: Math.random() > 0.5 ? mom.stochD : dad.stochD,
            stopLoss: Math.random() > 0.5 ? mom.stopLoss : dad.stopLoss,
            takeProfit: Math.random() > 0.5 ? mom.takeProfit : dad.takeProfit,
        };
    }

    // --- Helpers ---

    private shouldMutate(): boolean {
        return Math.random() < this.MUTATION_RATE;
    }

    // Adjust Integer
    private adj(val: number, min: number, max: number): number {
        if (!val) val = (min + max) / 2;
        const change = Math.floor(val * this.MUTATION_STRENGTH * (Math.random() - 0.5) * 2);
        // Ensure at least +/- 1 change if mutating
        const delta = change === 0 ? (Math.random() > 0.5 ? 1 : -1) : change;
        let newVal = val + delta;
        return Math.min(Math.max(newVal, min), max);
    }

    // Adjust Float
    private adjFloat(val: number, min: number, max: number): number {
        if (!val) val = (min + max) / 2;
        const change = val * this.MUTATION_STRENGTH * (Math.random() - 0.5) * 2;
        let newVal = val + change;
        // Keep within bounds
        newVal = Math.min(Math.max(newVal, min), max);
        // Round to 2 decimals for cleanliness
        return Math.round(newVal * 100) / 100;
    }
}

export const geneticOptimizer = new GeneticOptimizer();
