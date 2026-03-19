/**
 * Cloudinary config — Shining Stars
 * Cloud: dg9m3ktno
 */

export const CLOUDINARY_CLOUD  = "dg9m3ktno";
export const CLOUDINARY_PRESET = "shining-stars-students"; // default preset

/**
 * Sheet ထဲ Photo_URL → display URL ပြောင်းပေးသည်
 * Cloudinary URL ဆိုရင် transformation ထပ်ထည့်ပေးသည်
 */
export function getPhotoUrl(url, size = 300) {
  if (!url || typeof url !== "string") return null;
  const u = url.trim();
  if (!u) return null;

  // Already a Cloudinary URL with transformation — return as-is
  if (u.includes("cloudinary.com") && u.includes("f_auto")) return u;

  // Cloudinary URL without transformation — add it
  if (u.includes("cloudinary.com")) {
    return u.replace(/\/upload\/(?:v\d+\/)?/, `/upload/f_auto,q_auto,w_${size},h_${size},c_fill/`);
  }

  // Local /public path
  if (u.startsWith("/")) return u;

  // Google Drive fallback
  if (u.includes("drive.google.com")) {
    let fileId = "";
    if (u.includes("/d/"))  fileId = u.split("/d/")[1]?.split("/")[0];
    else if (u.includes("id=")) fileId = u.split("id=")[1]?.split("&")[0];
    if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
  }

  return u;
}

/**
 * File တစ်ခုကို Cloudinary သို့ upload လုပ်သည်
 */
export async function uploadToCloudinary(file, folder = "students") {
  const preset = folder === "staff" ? "shining-stars-staff" : "shining-stars-students";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);
  formData.append("public_id", file.name.replace(/\.[^/.]+$/, "").trim());

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.secure_url;
}