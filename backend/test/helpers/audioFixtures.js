// Minimal container signatures for input-validation tests, not intelligible audio.
export function audioFixture(mimeType = "audio/webm") {
  const buffer = Buffer.alloc(48);
  if (mimeType.includes("webm")) Buffer.from([0x1a, 0x45, 0xdf, 0xa3]).copy(buffer);
  else if (mimeType.includes("ogg")) buffer.write("OggS");
  else if (mimeType.includes("mp4")) buffer.write("ftyp", 4);
  else if (mimeType.includes("wav")) { buffer.write("RIFF"); buffer.write("WAVE", 8); }
  else buffer.write("ID3");
  return buffer;
}
