import type { ContentQuestion } from './catalog';
import { analyzeQuizQuality, type QualityIssue } from './quality';

export type QuizQualityIssues = Map<string, QualityIssue[]>;
export interface QuizQualityReport { key: string; issues: QuizQualityIssues }
export type QualityAnalyzer = (questions: ContentQuestion[]) => QuizQualityIssues;

/**
 * Expensive O(n²) local analysis of one quiz bank. It is deliberately kept
 * behind an explicit admin action and must never be called from a render path.
 */
export function buildQuizQualityReport(key: string, questions: ContentQuestion[], analyze: QualityAnalyzer = analyzeQuizQuality): QuizQualityReport {
  return { key, issues: analyze(questions) };
}

/** A report is shown only while it matches the key of the currently selected bank. */
export function isQuizQualityReportFresh(report: QuizQualityReport | null | undefined, key: string): report is QuizQualityReport {
  return report?.key === key;
}

export function quizQualityIssueIds(issues: QuizQualityIssues, questions: ContentQuestion[]): string[] {
  return questions.filter(question => (issues.get(question.id)?.length ?? 0) > 0).map(question => question.id);
}
