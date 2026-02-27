import fuzzysort from 'fuzzysort';
import { differenceInDays, parseISO } from 'date-fns';

// --- Configuration & Constants ---
const WEIGHTS = {
  IDENTITY: 0.4,
  AMOUNT: 0.4,
  TEMPORAL: 0.2,
};

const THRESHOLDS = {
  AUTO_MATCH: 85,
  SUGGESTION: 65,
  TIE_BREAKER_MARGIN: 5,
};

const STOP_WORDS = new Set([
  'pos', 'dd', 'so', 'crd', 'auth', 'fee', 'visa', 'mastercard',
  'payment', 'transfer', 'standing', 'order', 'direct', 'debit'
]);

// --- Utility Functions ---

/**
 * Normalizes and tokenizes a bank description, removing noise.
 */
const tokenize = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ') // Replace special chars with spaces
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word)); // Remove single letters & stop words
};

/**
 * Calculates Identity Score (0-100) using tokenized fuzzy matching.
 */
const calculateIdentityScore = (txRaw, aliases = [], title = '') => {
  const txTokens = tokenize(txRaw);
  if (txTokens.length === 0) return 0;

  const targets = [...aliases, title].filter(Boolean);
  if (targets.length === 0) return 0;

  let maxScore = 0;

  for (const target of targets) {
    const targetTokens = tokenize(target);
    if (targetTokens.length === 0) continue;

    let matchCount = 0;
    for (const tToken of targetTokens) {
      // Exact token match
      if (txTokens.includes(tToken)) {
        matchCount += 1;
        continue;
      }
      
      // Fuzzy token fallback (allows slight typos)
      const fuzzyRes = fuzzysort.go(tToken, txTokens, { threshold: -20, allowTypo: true });
      if (fuzzyRes.length > 0) {
        matchCount += 0.8; // 80% weight for a fuzzy token match
      }
    }

    const score = (matchCount / targetTokens.length) * 100;
    maxScore = Math.max(maxScore, Math.min(score, 100));
  }

  return maxScore;
};

/**
 * Calculates Amount Score (0-100) based on variance percentage.
 */
const calculateAmountScore = (txAmount, tplAmount, allowedVariancePct = 5) => {
  const diff = Math.abs(txAmount - tplAmount);
  if (diff === 0) return 100;

  const diffPct = (diff / Math.abs(tplAmount)) * 100;
  if (diffPct > allowedVariancePct) return 0;

  // Linear scale down to 0 as it approaches max variance
  return 100 - ((diffPct / allowedVariancePct) * 100);
};

/**
 * Calculates Temporal Score (0-100) based on days variance.
 */
const calculateTemporalScore = (txDateStr, tplDateStr, allowedVarianceDays = 3) => {
  if (!txDateStr || !tplDateStr) return 0;
  
  const txDate = parseISO(txDateStr);
  const tplDate = parseISO(tplDateStr);
  const diffDays = Math.abs(differenceInDays(txDate, tplDate));

  if (diffDays === 0) return 100;
  if (diffDays > allowedVarianceDays) return 0;

  // Linear scale down to 0 as it approaches max variance
  return 100 - ((diffDays / allowedVarianceDays) * 100);
};

// --- Main Engine ---

/**
 * Evaluates a single transaction against an array of recurring templates.
 * Returns the best match status and payload for UI/DB updates.
 * + * @param {Object} transaction - The incoming Transaction entity.
 * @param {Array} templates - Array of active RecurringTransaction entities.
 * @returns {Object} { status: 'auto_match' | 'needs_review' | 'no_match', matchConfidenceScore, suggestedRecurringId, recurringTransactionId }
 */
export const evaluateTransactionMatch = (transaction, templates) => {
  if (!templates || templates.length === 0) return { status: 'no_match', matchConfidenceScore: 0 };

  const scoredTemplates = templates
    .filter((tpl) => tpl.type === transaction.type) // Strict phase: types must match
    .map((tpl) => {
      const identityScore = calculateIdentityScore(transaction.rawDescription, tpl.known_aliases, tpl.title);
      const amountScore = calculateAmountScore(transaction.amount, tpl.amount, tpl.amount_variance_percentage || 5);
      const temporalScore = calculateTemporalScore(transaction.date, tpl.nextOccurrence, tpl.temporal_variance_days || 3);

      const totalScore = 
        (identityScore * WEIGHTS.IDENTITY) + 
        (amountScore * WEIGHTS.AMOUNT) + 
        (temporalScore * WEIGHTS.TEMPORAL);

      return { id: tpl.id, score: Math.round(totalScore) };
    })
    .sort((a, b) => b.score - a.score);

  if (scoredTemplates.length === 0) return { status: 'no_match', matchConfidenceScore: 0 };

  const topMatch = scoredTemplates[0];
  const runnerUp = scoredTemplates[1];

  // Tie-Breaker Safety Net
  if (topMatch.score >= THRESHOLDS.AUTO_MATCH) {
    if (runnerUp && (topMatch.score - runnerUp.score) < THRESHOLDS.TIE_BREAKER_MARGIN) {
      return { status: 'needs_review', matchConfidenceScore: topMatch.score, suggestedRecurringId: topMatch.id };
    }
    return { status: 'auto_match', matchConfidenceScore: topMatch.score, recurringTransactionId: topMatch.id };
  }

  if (topMatch.score >= THRESHOLDS.SUGGESTION) {
    return { status: 'needs_review', matchConfidenceScore: topMatch.score, suggestedRecurringId: topMatch.id };
  }

  return { status: 'no_match', matchConfidenceScore: topMatch.score };
};
