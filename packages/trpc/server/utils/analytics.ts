export type ResponseTiming = {
  startedAt: Date;
  submittedAt: Date | null;
};

export function computeCompletionRate(responses: ResponseTiming[]): number {
  const totalResponses = responses.length;
  if (totalResponses === 0) return 0;

  const submittedCount = responses.filter((r) => r.submittedAt !== null).length;
  return Math.round((submittedCount / totalResponses) * 100 * 100) / 100;
}

export function computeAvgDuration(
  responses: ResponseTiming[],
): number | null {
  const submitted = responses.filter((r) => r.submittedAt !== null) as Array<
    ResponseTiming & { submittedAt: Date }
  >;
  if (submitted.length === 0) return null;

  const totalSeconds = submitted.reduce((sum, r) => {
    const duration = (r.submittedAt.getTime() - r.startedAt.getTime()) / 1000;
    return sum + duration;
  }, 0);

  return Math.round(totalSeconds / submitted.length);
}
