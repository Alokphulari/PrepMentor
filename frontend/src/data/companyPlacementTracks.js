export const companyPlacementTracks = [
  { id: "tcs", name: "TCS", accent: "from-blue-600 to-cyan-500", aptitude: "Numerical, verbal and reasoning", coding: "2 programming problems", typing: { target: "32 WPM / 90% accuracy", prompt: "Write a concise email explaining a delayed software release and its revised delivery plan." }, speaking: { target: "Clear 90-second response", prompt: "Introduce yourself and explain why your skills suit a client-facing technology role." } },
  { id: "infosys", name: "Infosys", accent: "from-cyan-600 to-blue-600", aptitude: "Reasoning and mathematical ability", coding: "2–3 implementation problems", typing: { target: "30 WPM / 88% accuracy", prompt: "Summarize how your team investigated and resolved a production defect." }, speaking: { target: "Structured 2-minute response", prompt: "Describe a difficult technical concept in language a non-technical client can understand." } },
  { id: "accenture", name: "Accenture", accent: "from-violet-600 to-fuchsia-600", aptitude: "Cognitive and technical assessment", coding: "2 logic and coding problems", typing: { target: "35 WPM / 90% accuracy", prompt: "Prepare a professional update about completed work, current risks, and next actions." }, speaking: { target: "Confident 90-second response", prompt: "Explain how you collaborate with teammates when requirements change unexpectedly." } },
  { id: "amazon", name: "Amazon", accent: "from-amber-500 to-orange-600", aptitude: "Work style and analytical reasoning", coding: "Data structures and algorithms", typing: { target: "40 WPM / 92% accuracy", prompt: "Write a data-driven status update that identifies a customer problem and corrective action." }, speaking: { target: "STAR-based 2-minute response", prompt: "Tell me about a time you took ownership of a difficult problem and delivered a measurable result." } },
];

export function getCompanyTrack(id) {
  return companyPlacementTracks.find((company) => company.id === id);
}
