// Remote progress is derived exclusively from the server conversation.
export function remoteInterviewView(session, reviewPrevious = false) {
  if (!session || !Array.isArray(session.turns) || session.turns.length > 20) throw new Error("Invalid interview session. Please reload.");
  const completed = session.status === "completed";
  if (completed && !session.result) throw new Error("The interview report is unavailable. Please retry.");
  if (!completed && !session.currentQuestion?.question) throw new Error("The current question is unavailable. Please retry.");
  const previous = session.turns.at(-1);
  const feedback = !completed && reviewPrevious && session.config.mode !== "placement" ? previous?.answerEvaluation || null : null;
  return {
    completed, feedback, index: session.turns.length - (feedback ? 1 : 0),
    question: completed ? null : feedback ? previous : session.currentQuestion,
    answers: Object.fromEntries(session.turns.map((turn, index) => [index, turn.transcript])),
  };
}
