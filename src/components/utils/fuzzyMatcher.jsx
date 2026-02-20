import _ from 'lodash';

/**
 * Generates bigrams for a string (e.g., "bank" -> ["ba", "an", "nk"])
 */
const getBigrams = (str) => {
    const s = str.toLowerCase().replace(/\s+/g, '');
    const bigrams = [];
    for (let i = 0; i < s.length - 1; i++) {
        bigrams.push(s.slice(i, i + 2));
    }
    return bigrams;
};

/**
 * Grades how well str1 fits as a subsequence of str2
 * (e.g., "amzn" in "amazon")
 */
const scoreSubsequence = (sub, str) => {
    let n = -1;
    let matches = 0;

    // Walk through the sub string
    for (let i = 0; i < sub.length; i++) {
        const char = sub[i];
        // Find next occurrence of char in str after the last match
        n = str.indexOf(char, n + 1);
        if (n !== -1) {
            matches++;
        } else {
            break;
        }
    }

    if (matches === sub.length) {
        // Base score is length ratio, with a boost for starting with same char
        const ratio = sub.length / str.length;
        const startBoost = sub[0] === str[0] ? 0.2 : 0;
        return Math.min(ratio + startBoost, 1);
    }
    return 0;
};

/**
 * Returns a similarity score between 0 and 1
 */
export const calculateSimilarity = (str1, str2) => {
    +  const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1;

    // Grade 1: Subsequence (Good for abbreviations like amzn)
    // Check both ways because we don't know which is the "raw" one
    const subScore = Math.max(
        scoreSubsequence(s1, s2),
        scoreSubsequence(s2, s1)
    );

    // Grade 2: Bigrams (Good for typos)
    if (s1.length < 2 || s2.length < 2) return subScore;

    const pairs1 = getBigrams(s1);
    const pairs2 = getBigrams(s2);
    const union = pairs1.length + pairs2.length;

    let intersect = 0;
    const map = new Map();

    pairs1.forEach(p => map.set(p, (map.get(p) || 0) + 1));
    pairs2.forEach(p => {
        if (map.has(p) && map.get(p) > 0) {
            intersect++;
            map.set(p, map.get(p) - 1);
        }
    });

    const bigramScore = (2.0 * intersect) / union;

    // Return the best grade found
    return Math.max(subScore, bigramScore);
};

/**
 * Matches a raw string against a list of targets (categories/merchants)
 */
export const findBestMatch = (rawInput, targets, threshold = 0.4) => {
    return _.chain(targets)
        .map(target => ({
            target,
            score: calculateSimilarity(rawInput.toLowerCase(), target.name.toLowerCase())
        }))
        .filter(match => match.score >= threshold)
        .maxBy('score')
        .value()?.target || null;
};
