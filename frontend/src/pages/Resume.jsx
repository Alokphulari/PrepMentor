import { useRef, useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Download,
  Sparkles,
  Briefcase,
  GraduationCap,
  Code2,
} from "lucide-react";

function Resume() {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Please upload a PDF or DOCX file.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5 MB.");
      return;
    }

    setUploading(true);

    setTimeout(() => {
      setFile(selectedFile);
      setUploading(false);
    }, 1000);
  };

  const handleInputChange = (event) => {
    handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    const droppedFile = event.dataTransfer.files?.[0];
    handleFile(droppedFile);
  };

  const removeFile = () => {
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownload = () => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = file.name;
    link.click();

    URL.revokeObjectURL(url);
  };

  const skills = [
    "React",
    "JavaScript",
    "TypeScript",
    "Node.js",
    "REST APIs",
    "Git",
  ];

  const recommendations = [
    "Add measurable achievements to your experience section.",
    "Mention specific projects that demonstrate your technical skills.",
    "Include keywords related to your target job role.",
  ];

  return (
    <div className="space-y-8">

      {/* Header */}
      <section>
        <p className="text-sm font-medium text-blue-600">
          Resume
        </p>

        <h1 className="mt-1 text-3xl font-bold text-gray-900">
          Resume Analysis
        </h1>

        <p className="mt-2 text-gray-500">
          Upload your resume to get personalized insights and interview
          preparation recommendations.
        </p>
      </section>

      {/* Upload Section */}
      {!file ? (
        <section
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDrop={handleDrop}
          className={`bg-white border-2 border-dashed rounded-2xl p-10 md:p-14 text-center transition ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300"
          }`}
        >

          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Upload size={28} />
          </div>

          <h2 className="mt-6 text-xl font-semibold text-gray-900">
            Upload your resume
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Drag and drop your resume here, or select a file from your
            computer.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleInputChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {uploading ? (
              <>
                <Upload size={18} className="animate-bounce" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={18} />
                Choose Resume
              </>
            )}
          </button>

          <p className="mt-4 text-xs text-gray-400">
            PDF or DOCX · Maximum 5 MB
          </p>

        </section>
      ) : (
        /* Uploaded File */
        <section className="bg-white border border-gray-200 rounded-2xl p-6">

          <div className="flex flex-col sm:flex-row sm:items-center gap-5">

            <div className="w-14 h-14 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <FileText size={27} />
            </div>

            <div className="flex-1 min-w-0">

              <h2 className="font-semibold text-gray-900 truncate">
                {file.name}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>

            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={handleDownload}
                className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                title="Download"
              >
                <Download size={19} />
              </button>

              <button
                type="button"
                onClick={removeFile}
                className="p-2.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                title="Remove"
              >
                <Trash2 size={19} />
              </button>

            </div>

          </div>

          <div className="mt-5 flex items-center gap-2 text-sm text-green-600">

            <CheckCircle2 size={18} />

            Resume uploaded successfully.

          </div>

        </section>
      )}

      {/* Analysis */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Resume Score */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">

          <div className="flex items-center justify-between">

            <div>
              <h2 className="font-semibold text-gray-900">
                Resume Score
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Overall resume quality
              </p>
            </div>

            <Sparkles className="text-blue-600" size={21} />

          </div>

          <div className="mt-8 flex justify-center">

            <div className="w-36 h-36 rounded-full border-[12px] border-blue-100 flex items-center justify-center">

              <div className="text-center">

                <p className="text-4xl font-bold text-gray-900">
                  82
                </p>

                <p className="text-sm text-gray-500">
                  / 100
                </p>

              </div>

            </div>

          </div>

          <div className="mt-7">

            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">
                Strong resume
              </span>

              <span className="font-semibold text-green-600">
                Good
              </span>
            </div>

            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full w-[82%] bg-blue-600 rounded-full" />
            </div>

          </div>

        </div>

        {/* Skills */}
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl p-6">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Code2 size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">
                Detected Skills
              </h2>

              <p className="text-sm text-gray-500">
                Skills found in your resume
              </p>
            </div>

          </div>

          <div className="mt-6 flex flex-wrap gap-3">

            {skills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700"
              >
                {skill}
              </span>
            ))}

          </div>

          <div className="mt-8 grid sm:grid-cols-2 gap-4">

            <div className="p-4 rounded-xl bg-blue-50">

              <div className="flex items-center gap-2 text-blue-700">
                <Briefcase size={18} />
                <span className="font-semibold">
                  Experience
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-600">
                2+ years of relevant experience detected.
              </p>

            </div>

            <div className="p-4 rounded-xl bg-green-50">

              <div className="flex items-center gap-2 text-green-700">
                <GraduationCap size={18} />
                <span className="font-semibold">
                  Education
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-600">
                Bachelor's degree detected.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* Recommendations */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6">

        <div className="flex items-start gap-3">

          <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
            <AlertCircle size={20} />
          </div>

          <div>

            <h2 className="font-semibold text-gray-900">
              AI Recommendations
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Suggestions to make your resume stronger.
            </p>

          </div>

        </div>

        <div className="mt-6 space-y-3">

          {recommendations.map((recommendation, index) => (
            <div
              key={recommendation}
              className="flex gap-3 p-4 bg-gray-50 rounded-xl"
            >

              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                {index + 1}
              </span>

              <p className="text-sm text-gray-700">
                {recommendation}
              </p>

            </div>
          ))}

        </div>

      </section>

      {/* Privacy Notice */}
      <section className="text-center">

        <p className="text-xs text-gray-400">
          Your resume will be used only to personalize your PrepMentor
          experience.
        </p>

      </section>

    </div>
  );
}

export default Resume;