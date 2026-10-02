export const learningTopics = [
  { category: "Aptitude", topics: ["Percentages", "Profit and Loss", "Ratio and Proportion", "Time and Work", "Speed Distance and Time", "Probability", "Permutations and Combinations", "Algebra", "Data Interpretation", "Logical Reasoning", "Verbal Ability"] },
  { category: "Programming", topics: ["JavaScript", "Python", "Java", "C++", "C Programming", "TypeScript", "SQL", "Git and GitHub"] },
  { category: "Computer Science", topics: ["Data Structures", "Algorithms", "Object Oriented Programming", "Database Management Systems", "Operating Systems", "Computer Networks", "Software Engineering", "System Design"] },
  { category: "Web Development", topics: ["HTML and CSS", "React", "Node.js", "REST APIs", "Authentication", "Web Security", "Testing", "Cloud Computing"] },
  { category: "Career Skills", topics: ["Technical Interview", "Behavioral Interview", "Communication Skills", "Resume Writing", "Typing Skills", "Public Speaking", "Group Discussion", "Problem Solving"] },
];

export const allLearningTopics = learningTopics.flatMap((group) =>
  group.topics.map((topic) => ({ topic, category: group.category }))
);
