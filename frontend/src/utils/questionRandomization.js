export function shuffleItems(value, random = Math.random) {
  const items = Array.isArray(value) ? [...value] : [];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const sample = Number(random());
    const bounded = Number.isFinite(sample) ? Math.max(0, Math.min(0.999999999, sample)) : 0;
    const target = Math.floor(bounded * (index + 1));
    [items[index], items[target]] = [items[target], items[index]];
  }
  return items;
}

export function randomizeQuestions(value, random = Math.random) {
  const questions = Array.isArray(value)
    ? value.map((question) => ({
      ...question,
      options: Array.isArray(question?.options) ? shuffleItems(question.options, random) : question?.options,
    }))
    : [];
  return shuffleItems(questions, random);
}
