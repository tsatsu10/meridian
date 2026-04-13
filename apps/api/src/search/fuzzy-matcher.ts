/**
 * Fuzzy Matching Algorithm for Full-text Search
 * 
 * Implements Levenshtein distance-based fuzzy matching with scoring
 * for flexible project/task search without exact matches required
 * 
 * @category Search
 * @example
 * const matcher = new FuzzyMatcher("react component");
 * const score = matcher.score("React Components") // 0.95
 */

export class FuzzyMatcher {
  private query: string;
  private queryLength: number;

  constructor(query: string) {
    this.query = query.toLowerCase();
    this.queryLength = query.length;
  }

  /**
   * Calculate Levenshtein distance between query and target
   * Lower distance = more similar
   */
  private levenshteinDistance(target: string): number {
    const targetLower = target.toLowerCase();
    const targetLength = targetLower.length;
    const matrix: number[][] = Array(targetLength + 1)
      .fill(null)
      .map(() => Array(this.queryLength + 1).fill(0));

    // Initialize matrix
    for (let i = 0; i <= targetLength; i++) {
      matrix[i]![0] = i;
    }
    for (let j = 0; j <= this.queryLength; j++) {
      matrix[0]![j] = j;
    }

    // Calculate distances
    for (let i = 1; i <= targetLength; i++) {
      for (let j = 1; j <= this.queryLength; j++) {
        const cost = targetLower[i - 1] === this.query[j - 1] ? 0 : 1;
        const matrixRow = matrix[i]!;
        const prevRow = matrix[i - 1]!;
        matrixRow[j] = Math.min(
          prevRow[j]! + 1,           // deletion
          matrixRow[j - 1]! + 1,     // insertion
          prevRow[j - 1]! + cost     // substitution
        );
      }
    }

    return matrix[targetLength]![this.queryLength]!;
  }

  /**
   * Calculate sequence match score
   * Finds longest common subsequence between query and target
   */
  private sequenceMatchScore(target: string): number {
    const targetLower = target.toLowerCase();
    let queryIdx = 0;
    let targetIdx = 0;
    let matchLength = 0;

    while (queryIdx < this.queryLength && targetIdx < targetLower.length) {
      if (this.query[queryIdx] === targetLower[targetIdx]) {
        matchLength++;
        queryIdx++;
      }
      targetIdx++;
    }

    // Return ratio of matched characters to query length
    return matchLength / this.queryLength;
  }

  /**
   * Check for word boundary matches (higher priority)
   */
  private wordBoundaryScore(target: string): number {
    const targetLower = target.toLowerCase();
    const words = targetLower.split(/\s+/);
    
    let matches = 0;
    for (const word of words) {
      if (word.startsWith(this.query)) {
        matches++;
      } else if (word.includes(this.query)) {
        matches += 0.5;
      }
    }

    return Math.min(matches / Math.max(1, words.length), 1);
  }

  /**
   * Calculate position-based bonus
   * Earlier matches score higher
   */
  private positionBonus(target: string): number {
    const targetLower = target.toLowerCase();
    const position = targetLower.indexOf(this.query.substring(0, Math.min(3, this.queryLength)));
    
    if (position === -1) return 0;
    
    // Full match at start = 1.0, decreases with position
    return Math.max(0, 1 - (position / targetLower.length) * 0.3);
  }

  /**
   * Score a target string against the query
   * Returns 0-1 score (1 = perfect match, 0 = no match)
   */
  score(target: string): number {
    if (!target) return 0;
    if (target.toLowerCase() === this.query) return 1;
    if (!this.query) return 0.1;

    const targetLength = target.length;

    // Exact substring match = very high score
    if (target.toLowerCase().includes(this.query)) {
      return 0.95 - Math.abs(targetLength - this.queryLength) * 0.01;
    }

    // Calculate component scores
    const sequenceScore = this.sequenceMatchScore(target);
    const wordScore = this.wordBoundaryScore(target);
    const distance = this.levenshteinDistance(target);
    const maxDistance = Math.max(this.queryLength, targetLength);
    const distanceScore = 1 - (distance / maxDistance);
    const position = this.positionBonus(target);

    // Weighted average of scores
    const finalScore =
      sequenceScore * 0.25 +      // Subsequence matching
      wordScore * 0.35 +          // Word boundary matching (highest weight)
      distanceScore * 0.25 +      // Edit distance
      position * 0.15;            // Position bonus

    // Penalize if too different in length
    const lengthRatio = Math.min(this.queryLength, targetLength) / Math.max(this.queryLength, targetLength);
    return Math.max(0, finalScore * (0.7 + lengthRatio * 0.3));
  }

  /**
   * Check if target should be included in results
   * Threshold: 0.6 (60% similarity)
   */
  isMatch(target: string, threshold: number = 0.6): boolean {
    return this.score(target) >= threshold;
  }
}

/**
 * Search result with scoring and metadata
 */
export interface SearchResult<T> {
  item: T;
  score: number;
  matches: {
    field: string;
    value: string;
    position: number;
  }[];
}

/**
 * Ranked search results
 */
export interface RankedSearchResults<T> {
  results: SearchResult<T>[];
  totalCount: number;
  queryTime: number;
  executedAt: Date;
}

/**
 * Multi-field search across multiple text fields
 */
export function searchMultiField<T extends Record<string, any>>(
  items: T[],
  query: string,
  fields: (keyof T)[],
  options?: {
    threshold?: number;
    limit?: number;
    boost?: Record<string, number>;
  }
): RankedSearchResults<T> {
  const startTime = performance.now();
  const matcher = new FuzzyMatcher(query);
  const threshold = options?.threshold ?? 0.6;
  const limit = options?.limit ?? 100;
  const boost = options?.boost ?? {};

  const results: SearchResult<T>[] = [];

  for (const item of items) {
    let maxScore = 0;
    const matches: SearchResult<T>['matches'] = [];

    for (const field of fields) {
      const value = String(item[field] ?? '');
      const fieldScore = matcher.score(value);
      const boostFactor = boost[String(field)] ?? 1;
      const boostedScore = fieldScore * boostFactor;

      if (fieldScore >= threshold) {
        matches.push({
          field: String(field),
          value,
          position: value.toLowerCase().indexOf(query.toLowerCase()),
        });
      }

      maxScore = Math.max(maxScore, boostedScore);
    }

    if (maxScore >= threshold) {
      results.push({
        item,
        score: maxScore,
        matches,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Apply limit
  const limitedResults = results.slice(0, limit);

  const queryTime = performance.now() - startTime;

  return {
    results: limitedResults,
    totalCount: results.length,
    queryTime,
    executedAt: new Date(),
  };
}

/**
 * Highlight matching parts in text
 */
export function highlightMatches(text: string, query: string, tag: string = 'mark'): string {
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, `<${tag}>$1</${tag}>`);
}

