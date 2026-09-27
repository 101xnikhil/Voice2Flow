import Fuse from 'fuse.js';
import { PrismaClient } from '@prisma/client';
import { Intent } from '@voice2flow/shared';

export interface TaskCandidate {
  id: string;
  userId: string;
  title: string;
  status: string;
  category: string;
  priority: string;
  dueAt: string | null;
  deletedAt?: string | null;
  score?: number;
}

export type TaskResolutionStatus = 'SINGLE' | 'AMBIGUOUS' | 'NONE';

export interface TaskResolutionResult {
  status: TaskResolutionStatus;
  task?: TaskCandidate;
  candidates?: TaskCandidate[];
  reason?: string;
  isFuzzy?: boolean;
}

export interface TaskResolverOptions {
  scope?: 'PENDING' | 'COMPLETED' | 'DELETED' | 'ALL_ACTIVE';
  scoreThreshold?: number;
  ambiguityMargin?: number;
  maxCandidates?: number;
}

/**
 * Normalizes query string: trims, lowercases, and strips determiners/pronouns
 * (my/the/a/mera/meri/etc.) while deliberately PRESERVING nouns like
 * "assignment", "task", "project", "exam", "quiz", "homework".
 */
export function normalizeTaskQuery(query: string): string {
  let normalized = query.toLowerCase().trim();

  // Strip punctuation except dashes/underscores
  normalized = normalized.replace(/[^\w\s-]/g, ' ');

  // List of determiners / articles / prepositions / pronouns to strip
  // English + Hinglish pronouns / postpositions
  const stopwords = new Set([
    'the',
    'my',
    'a',
    'an',
    'this',
    'that',
    'these',
    'those',
    'mera',
    'meri',
    'mere',
    'mujhe',
    'ka',
    'ki',
    'ke',
    'ko',
    'par',
    'se',
    'pe',
    'wala',
    'wali',
    'wale',
    'please',
    'can',
    'you',
  ]);

  const tokens = normalized.split(/\s+/).filter((tok) => tok.length > 0 && !stopwords.has(tok));
  return tokens.join(' ').trim() || normalized;
}

/**
 * Resolves a task query from an in-memory list of candidate tasks.
 */
export function resolveTaskFromList(
  rawQuery: string,
  tasks: TaskCandidate[],
  options: TaskResolverOptions = {}
): TaskResolutionResult {
  const query = normalizeTaskQuery(rawQuery);
  if (!query || tasks.length === 0) {
    return {
      status: 'NONE',
      candidates: [],
      reason: `No matching tasks found for '${rawQuery}'.`,
      isFuzzy: false,
    };
  }

  // Exact match check first
  const exactMatches = tasks.filter(
    (t) => t.title.toLowerCase().trim() === query || t.title.toLowerCase().trim() === rawQuery.toLowerCase().trim()
  );
  if (exactMatches.length === 1) {
    return {
      status: 'SINGLE',
      task: exactMatches[0],
      isFuzzy: false,
    };
  } else if (exactMatches.length > 1) {
    return {
      status: 'AMBIGUOUS',
      candidates: exactMatches.slice(0, options.maxCandidates || 5),
      reason: `Found multiple exact matches for '${rawQuery}'.`,
      isFuzzy: false,
    };
  }

  const scoreThreshold = options.scoreThreshold ?? 0.55;
  const ambiguityMargin = options.ambiguityMargin ?? 0.05;
  const maxCandidates = options.maxCandidates ?? 5;

  const fuse = new Fuse(tasks, {
    keys: ['title'],
    includeScore: true,
    threshold: scoreThreshold,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  const searchResults = fuse.search(query);
  if (searchResults.length === 0) {
    // Show top 3 closest items even if above threshold as fallback suggestions
    const looseFuse = new Fuse(tasks, {
      keys: ['title'],
      includeScore: true,
      threshold: 0.85,
      ignoreLocation: true,
    });
    const loose = looseFuse.search(query).slice(0, 3).map((r) => r.item);

    return {
      status: 'NONE',
      candidates: loose,
      reason: `I couldn't find a task matching '${rawQuery}'.`,
      isFuzzy: false,
    };
  }

  const topMatch = searchResults[0];
  if (!topMatch) {
    return {
      status: 'NONE',
      candidates: [],
      reason: `I couldn't find a task matching '${rawQuery}'.`,
      isFuzzy: false,
    };
  }
  const topScore = topMatch.score ?? 0;
  const isFuzzy = topScore > 0.05;

  if (searchResults.length === 1) {
    return {
      status: 'SINGLE',
      task: topMatch.item,
      isFuzzy,
    };
  }

  const secondMatch = searchResults[1];
  const secondScore = secondMatch ? secondMatch.score ?? 1.0 : 1.0;
  const scoreDiff = secondScore - topScore;

  // If top match has a clear margin over second match
  if (scoreDiff >= ambiguityMargin) {
    return {
      status: 'SINGLE',
      task: topMatch.item,
      isFuzzy,
    };
  }

  // Top matches are within ambiguity margin -> AMBIGUOUS
  const closeCandidates = searchResults
    .filter((r) => (r.score ?? 1.0) - topScore <= ambiguityMargin + 0.1)
    .slice(0, maxCandidates)
    .map((r) => ({ ...r.item, score: r.score }));

  return {
    status: 'AMBIGUOUS',
    candidates: closeCandidates,
    reason: `I found multiple matching tasks for '${rawQuery}'.`,
    isFuzzy,
  };
}

/**
 * Resolves a task query against PostgreSQL database scoped strictly by userId and intent.
 */
export async function resolveTask(
  prisma: PrismaClient,
  userId: string,
  rawQuery: string,
  intent: Intent,
  options: TaskResolverOptions = {}
): Promise<TaskResolutionResult> {
  // Determine database filter based on intent and options
  const whereClause: {
    userId: string;
    deletedAt?: { not: null } | null;
    status?: { in: ('PENDING' | 'IN_PROGRESS')[] } | 'COMPLETED';
  } = {
    userId,
  };

  if (intent === 'RESTORE_TASK' || options.scope === 'DELETED') {
    whereClause.deletedAt = { not: null };
  } else {
    whereClause.deletedAt = null;
    if (intent === 'COMPLETE_TASK' || options.scope === 'PENDING') {
      whereClause.status = { in: ['PENDING', 'IN_PROGRESS'] };
    } else if (options.scope === 'COMPLETED') {
      whereClause.status = 'COMPLETED';
    }
  }

  // Bounded to 500 candidate tasks per spec §6.10
  const tasks = await prisma.task.findMany({
    where: whereClause,
    take: 500,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      userId: true,
      title: true,
      status: true,
      category: true,
      priority: true,
      dueAt: true,
      deletedAt: true,
    },
  });

  const formattedCandidates: TaskCandidate[] = tasks.map((t) => ({
    id: t.id,
    userId: t.userId,
    title: t.title,
    status: t.status,
    category: t.category,
    priority: t.priority,
    dueAt: t.dueAt?.toISOString() ?? null,
    deletedAt: t.deletedAt?.toISOString() ?? null,
  }));

  return resolveTaskFromList(rawQuery, formattedCandidates, options);
}
