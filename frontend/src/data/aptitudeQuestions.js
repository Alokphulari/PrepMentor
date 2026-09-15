const make = (rows) => rows.map(([question, options, answer, topic], index) => ({ id: index + 1, question, options, answer, topic }));

export const aptitudeQuestions = {
  quantitative: {
    easy: make([
      ["What is 15% of 200?", ["20", "25", "30", "35"], "30", "Percentages"],
      ["What is the average of 12, 18, and 24?", ["16", "18", "20", "22"], "18", "Averages"],
      ["A car travels 120 km in 2 hours. What is its speed?", ["50 km/h", "60 km/h", "70 km/h", "80 km/h"], "60 km/h", "Speed and Distance"],
      ["Simplify the ratio 18:24.", ["2:3", "3:4", "4:5", "6:7"], "3:4", "Ratios"],
      ["What is 7 × 8 − 10?", ["42", "46", "52", "54"], "46", "Arithmetic"],
    ]),
    medium: make([
      ["A price rises from ₹800 to ₹920. What is the percentage increase?", ["10%", "12%", "15%", "20%"], "15%", "Percentages"],
      ["If 6 workers finish a task in 10 days, how many days will 12 workers take?", ["4", "5", "6", "8"], "5", "Time and Work"],
      ["The ratio of two numbers is 3:5 and their sum is 64. What is the larger number?", ["24", "32", "40", "48"], "40", "Ratios"],
      ["A train covers 270 km in 4.5 hours. Find its average speed.", ["50 km/h", "55 km/h", "60 km/h", "65 km/h"], "60 km/h", "Speed and Distance"],
      ["What is the simple interest on ₹5,000 at 8% for 2 years?", ["₹600", "₹700", "₹800", "₹900"], "₹800", "Interest"],
    ]),
    hard: make([
      ["A sum doubles in 8 years at simple interest. In how many years will it triple?", ["12", "14", "16", "18"], "16", "Interest"],
      ["Two pipes fill a tank in 12 and 18 hours. How long together?", ["6.2 h", "7.2 h", "8 h", "9 h"], "7.2 h", "Time and Work"],
      ["A 180 m train crosses a pole in 9 seconds. What is its speed?", ["60 km/h", "72 km/h", "80 km/h", "90 km/h"], "72 km/h", "Speed and Distance"],
      ["If x:y = 4:7 and y:z = 14:15, what is x:z?", ["4:15", "8:15", "8:21", "14:15"], "8:15", "Ratios"],
      ["An item sold at 20% profit for ₹1,440. Find its cost price.", ["₹1,100", "₹1,150", "₹1,200", "₹1,250"], "₹1,200", "Profit and Loss"],
    ]),
  },
  logical: {
    easy: make([
      ["What comes next: 2, 4, 6, 8, ?", ["9", "10", "11", "12"], "10", "Number Series"],
      ["All cats are animals. Milo is a cat. What must be true?", ["Milo is wild", "Milo is an animal", "All animals are cats", "Milo is a dog"], "Milo is an animal", "Syllogisms"],
      ["Which item does not belong?", ["Circle", "Square", "Triangle", "Banana"], "Banana", "Classification"],
      ["If EAST is coded as FBTU, how is WEST coded?", ["XFTU", "XFST", "VDRS", "XFSU"], "XFTU", "Coding-Decoding"],
      ["Book is to Reading as Fork is to…", ["Drawing", "Writing", "Eating", "Running"], "Eating", "Analogies"],
    ]),
    medium: make([
      ["What comes next: 3, 6, 12, 24, ?", ["36", "42", "48", "54"], "48", "Number Series"],
      ["Some pens are blue. All blue things are bright. Which follows?", ["All pens are bright", "Some pens are bright", "No pens are bright", "All bright things are pens"], "Some pens are bright", "Syllogisms"],
      ["If MONDAY is 123456, what represents DAY?", ["123", "345", "456", "156"], "456", "Coding-Decoding"],
      ["Riya faces north, turns right, then right again. Which direction now?", ["North", "South", "East", "West"], "South", "Directions"],
      ["A is older than B; B is older than C. Who is youngest?", ["A", "B", "C", "Cannot tell"], "C", "Ordering"],
    ]),
    hard: make([
      ["Find the next term: 1, 2, 6, 24, 120, ?", ["240", "360", "600", "720"], "720", "Number Series"],
      ["No poets are dull. Some writers are poets. Which follows?", ["All writers are bright", "Some writers are not dull", "No writers are dull", "Some dull people are poets"], "Some writers are not dull", "Syllogisms"],
      ["In a row, P is 7th from left and 12th from right. How many people?", ["17", "18", "19", "20"], "18", "Ordering"],
      ["A clock shows 3:30. What is the smaller angle between the hands?", ["60°", "75°", "90°", "105°"], "75°", "Clock Reasoning"],
      ["If A=1, B=2… what is the value of CODE?", ["25", "27", "29", "31"], "27", "Coding-Decoding"],
    ]),
  },
  verbal: {
    easy: make([
      ["Choose the synonym of ‘rapid’.", ["Slow", "Quick", "Quiet", "Weak"], "Quick", "Vocabulary"],
      ["Choose the antonym of ‘ancient’.", ["Old", "Historic", "Modern", "Ruined"], "Modern", "Vocabulary"],
      ["She ___ to college every day.", ["go", "goes", "going", "gone"], "goes", "Grammar"],
      ["Select the correctly spelled word.", ["Recieve", "Receive", "Receeve", "Receve"], "Receive", "Spelling"],
      ["A person who writes books is an…", ["actor", "author", "auditor", "artist"], "author", "One-word Substitution"],
    ]),
    medium: make([
      ["Choose the synonym of ‘meticulous’.", ["Careless", "Precise", "Noisy", "Rapid"], "Precise", "Vocabulary"],
      ["Neither the manager nor the employees ___ available.", ["was", "were", "is", "be"], "were", "Grammar"],
      ["Choose the correct sentence.", ["He don't know", "He doesn't knows", "He doesn't know", "He not know"], "He doesn't know", "Sentence Correction"],
      ["‘Break the ice’ means to…", ["damage something", "start a conversation", "feel cold", "end a meeting"], "start a conversation", "Idioms"],
      ["The report was concise ___ informative.", ["but", "and", "because", "unless"], "and", "Connectors"],
    ]),
    hard: make([
      ["Choose the closest meaning of ‘equivocal’.", ["Certain", "Ambiguous", "Generous", "Hostile"], "Ambiguous", "Vocabulary"],
      ["Identify the error: Each of the players have a locker.", ["Each", "players", "have", "locker"], "have", "Grammar"],
      ["Choose the correctly structured sentence.", ["Hardly I arrived when it rained", "Hardly had I arrived when it rained", "Hardly had I arrive than it rained", "I hardly had arrived when raining"], "Hardly had I arrived when it rained", "Sentence Correction"],
      ["‘A Pyrrhic victory’ is a victory that…", ["is unexpected", "costs too much", "is effortless", "ends a war"], "costs too much", "Idioms"],
      ["Choose the word that best completes: Her argument was ___ by reliable evidence.", ["substantiated", "evaded", "diminished", "contradicted"], "substantiated", "Contextual Vocabulary"],
    ]),
  },
};

export const aptitudeCategories = [
  { id: "quantitative", title: "Quantitative Aptitude", description: "Percentages, ratios, averages, work, and speed." },
  { id: "logical", title: "Logical Reasoning", description: "Series, syllogisms, directions, and deduction." },
  { id: "verbal", title: "Verbal Ability", description: "Vocabulary, grammar, sentence correction, and idioms." },
];
