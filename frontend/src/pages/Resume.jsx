import { useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  X,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Resume() {
  const navigate = useNavigate();
  const { markResumeUploaded } = useAuth();

  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    setError("");

    if (!selectedFile) {
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please upload your resume as a PDF or DOCX file.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("Resume must be smaller than 5 MB.");
      return;
    }

    setFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setError("");
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select your resume first.");
      return;
    }

    setError("");
    setUploading(true);

    /*
      Backend resume upload will be connected here later.
      For now we store the completed state locally.
    */

    setTimeout(() => {
      markResumeUploaded();

      setUploading(false);

      navigate("/dashboard");
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-semibold text-blue-600 mb-2">
          Step 2 of 3
        </p>

        <h1 className="text-3xl font-bold text-gray-900">
          Upload your resume
        </h1>

        <p className="mt-2 text-gray-500">
          Upload your latest resume so PrepMentor can analyze your
          skills, education, projects, and experience.
        </p>
      </div>

      {/* Upload Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">

        {!file ? (
          <label
            htmlFor="resume-upload"
            className="block border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition"
          >
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Upload size={30} />
            </div>

            <h2 className="text-lg font-semibold text-gray-900">
              Upload your resume
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Drag and drop your file here or click to browse
            </p>

            <p className="mt-3 text-xs text-gray-400">
              PDF or DOCX • Maximum 5 MB
            </p>

            <input
              id="resume-upload"
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <div className="border border-gray-200 rounded-2xl p-5">

            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-4">

                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <FileText size={24} />
                </div>

                <div>
                  <p className="font-semibold text-gray-900 break-all">
                    {file.name}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={removeFile}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
                aria-label="Remove resume"
              >
                <X size={20} />
              </button>

            </div>

            <div className="mt-5 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle size={18} />
              Resume selected successfully
            </div>

          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Continue */}
        <div className="mt-8 flex justify-end">

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue
                <ArrowRight size={18} />
              </>
            )}
          </button>

        </div>

      </div>

      {/* Information */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900">
            Skills
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Identify your technical and professional skills.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900">
            Experience
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Extract projects, internships, and work experience.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900">
            AI Analysis
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Generate personalized preparation recommendations.
          </p>
        </div>

      </div>

    </div>
  );
}

export default Resume;