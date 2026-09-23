import { useEffect, useState } from "react";
import { authorizedRequest } from "../services/authService";
import { hasRemoteApi } from "../services/api";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import LearningResources from "./LearningResources";

export default function PersonalizedLearningPlan() {
  const [plan, setPlan] = useState(null);
  useEffect(() => {
    if (!hasRemoteApi) return;
    let active = true;
    authorizedRequest("/api/learning/plan", { timeoutMs: 65000 }).then((value) => { if (active) setPlan(value.plan); }).catch(() => {});
    return () => { active = false; };
  }, []);
  if (!plan) return null;
  return <section className="surface-card space-y-4 rounded-3xl p-6"><h2 className="text-xl font-bold">Your personalized learning plan</h2><p className="text-sm text-gray-500">{plan.source}</p>{!plan.learningPlan.length && <p>Complete an assessment to identify areas for practice.</p>}{plan.learningPlan.map((item) => <article key={item.topic} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 dark:border-gray-700 dark:bg-gray-800/40"><h3 className="font-bold text-indigo-700 dark:text-indigo-300">{item.topic} · {item.priority}</h3><p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{item.explanation}</p><ul className="my-3 list-disc space-y-2 pl-5 text-sm leading-6">{item.tasks.map((task) => <li key={task}>{task}</li>)}</ul><p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{item.practiceGoal}</p>{plan.weakTopics?.length>0&&<Link to="/learning" state={{topicPerformance:plan.weakTopics.map((topic)=>({topic:topic.topic,percentage:topic.score})),learningPlan:plan.learningPlan,selectedTopic:item.topic}} className="my-4 flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-300">Start learning <ArrowRight size={16}/></Link>}<LearningResources topic={item.topic}/></article>)}</section>;
}
