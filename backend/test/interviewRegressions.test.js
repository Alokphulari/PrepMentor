import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAnswer, validateAnswerEvaluation, similarQuestion } from "../src/interviewAnswer.js";
import { nextInterviewQuestion, publicInterviewSession } from "../src/interviewSessions.js";
const evaluation = { score: 35, technicalAccuracy: 25, relevance: 60, communication: 65, reasoning: 30, strengths: ["Recognizes HTTP"], improvements: ["Explain resource methods"], feedback: "Clarify the HTTP methods", idealAnswer: "Use GET to retrieve, POST to create, PUT to replace and DELETE to remove a resource." };
test("per-answer evaluation supplies role, candidate context and bounded conversation", async () => {
  const result = await evaluateAnswer({ role: "Backend developer" }, Array.from({length:10},(_,i)=>({question:`Q${i}`, transcript:`A${i}`,focus:"HTTP"})), {question:"What is REST?",transcript:"It connects the frontend."}, {profile:{skills:["JavaScript"]}}, async (instruction,data,validate)=>{
    assert.match(instruction,/never length alone/);
    assert.equal(data.recentConversation.length,6);
    assert.equal(data.currentAnswer,"It connects the frontend.");
    assert.deepEqual(data.topicsCovered,["HTTP"]);
    assert.deepEqual(data.context.profile.skills,["JavaScript"]);
    return validate(evaluation);
  });
  assert.equal(result.technicalAccuracy,25);
  assert.ok(result.idealAnswer);
});
test("answer validation rejects fabricated metrics and missing sample answers",()=>{
  assert.throws(()=>validateAnswerEvaluation({...evaluation,score:"80"}));
  assert.throws(()=>validateAnswerEvaluation({...evaluation,idealAnswer:""}));
});
test("offline evaluation is explicitly non-semantic and does not invent correctness",async()=>{
  const result=await evaluateAnswer({},[],{question:"Explain HTTP",transcript:"A short answer"},{},async()=>{throw new Error("offline");});
  assert.match(result.source,/Offline/);
  assert.equal(result.technicalAccuracy,null);
  assert.equal(result.idealAnswer,null);
});
test("follow-up receives current evaluation and weak/strong adaptation instructions",async()=>{
  const result=await nextInterviewQuestion({role:"Backend developer",difficulty:"medium"},[{question:"What is REST?",transcript:"HTTP",focus:"API",answerEvaluation:evaluation}],async(instruction,data,validate)=>{
    assert.match(instruction,/weak evaluation/);assert.match(instruction,/strong evaluation/);
    assert.equal(data.recentConversation[0].answerEvaluation.score,35);
    return validate({question:"Which HTTP method creates a resource?",focus:"API",difficulty:"easy"});
  });
  assert.equal(result.difficulty,"easy");
});
test("duplicate and close paraphrase detection preserves distinct followups",()=>{
  assert.equal(similarQuestion("How would you design a REST API?","How would you design a REST API!"),true);
  assert.equal(similarQuestion("How would you design a REST API?","How would you design the REST API?"),true);
  assert.equal(similarQuestion("What is REST?","Which HTTP methods create resources?"),false);
});
test("Placement hides evaluations while active, practice and final reports retain samples",()=>{
  const session={config:{mode:"placement"},status:"active",turns:[{question:"REST?",transcript:"HTTP",answerEvaluation:evaluation}]};
  assert.equal(JSON.stringify(publicInterviewSession(session)).includes(evaluation.idealAnswer),false);
  assert.equal(session.turns[0].answerEvaluation,evaluation);
  assert.equal(publicInterviewSession({...session,config:{mode:"practice"}}).turns[0].answerEvaluation,evaluation);
  assert.equal(publicInterviewSession({...session,status:"completed"}).turns[0].answerEvaluation,evaluation);
});
