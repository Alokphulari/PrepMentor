export const EXECUTION_LANGUAGES = { JavaScript: 63, TypeScript: 74, Python: 71, Java: 62, "C++": 54, C: 50, "C#": 51, Go: 60 };
export const PROGRAM_STARTERS = {
  JavaScript: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim();\n// Parse input and print the answer.\n",
  TypeScript: "declare function require(name: string): any;\nconst input: string = require('fs').readFileSync(0, 'utf8').trim();\n// Parse input and print the answer.\n",
  Python: "import sys\ndata = sys.stdin.read()\n# Parse input and print the answer.\n",
  Java: "import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner in = new Scanner(System.in);\n    // Read input and print the answer.\n  }\n}\n",
  "C++": "#include <iostream>\nusing namespace std;\nint main() {\n  // Read input and print the answer.\n  return 0;\n}\n",
  C: "#include <stdio.h>\nint main(void) {\n  // Read input and print the answer.\n  return 0;\n}\n",
  "C#": "using System;\nclass Program {\n  static void Main() {\n    string input = Console.In.ReadToEnd();\n    // Parse input and print the answer.\n  }\n}\n",
  Go: "package main\nimport (\n  \"fmt\"\n  \"os\"\n  \"bufio\"\n)\nfunc main() {\n  in := bufio.NewReader(os.Stdin)\n  var n int\n  fmt.Fscan(in, &n)\n  // Read remaining input and print the answer.\n}\n",
};
