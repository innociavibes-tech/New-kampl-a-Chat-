import React, { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import "./Profile.css";

const CLOUD_NAME = "n7w3vwhg";
const UPLOAD_PRESET = "Kampl'a Chat";

export default function Profile() {
const [user, setUser] = useState(null);
const [username, setUsername] = useState("");
const [about, setAbout] = useState("");
const [photoURL, setPhotoURL] = useState("");
const [photo, setPhoto] = useState(null);
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState("");

useEffect(() => {
const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
setUser(currentUser);

  if (!currentUser) return;

  try {
    const profileRef = doc(db, "users", currentUser.uid);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const data = profileSnap.data();
      setUsername(data.username || currentUser.displayName || "");
      setAbout(data.about || "");
      setPhotoURL(data.photoURL || currentUser.photoURL || "");
    } else {
      setUsername(currentUser.displayName || "");
      setPhotoURL(currentUser.photoURL || "");
    }
  } catch (error) {
    console.error(error);
    setMessage("Could not load profile.");
  }
});

return () => unsubscribe();

}, []);

function selectPhoto(event) {
const file = event.target.files?.[0];

if (!file) return;

if (!file.type.startsWith("image/")) {
  setMessage("Please select an image.");
  return;
}

if (file.size > 5 * 1024 * 1024) {
  setMessage("Image must be smaller than 5 MB.");
  return;
}

setPhoto(file);
setPhotoURL(URL.createObjectURL(file));
setMessage("");

}

async function saveProfile() {
if (!user) {
setMessage("Please sign in first.");
return;
}

if (!username.trim()) {
  setMessage("Please enter your username.");
  return;
}

setLoading(true);
setMessage("");

try {
  let finalPhotoURL = photoURL;

  if (photo) {
    const formData = new FormData();
    formData.append("file", photo);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", "profile-pictures");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || "Image upload failed.");
    }

    finalPhotoURL = result.secure_url;
  }

  const profileData = {
    uid: user.uid,
    username: username.trim(),
    about: about.trim(),
    photoURL: finalPhotoURL,
    updatedAt: new Date().toISOString()
  };

  await setDoc(
    doc(db, "users", user.uid),
    profileData,
    { merge: true }
  );

  await updateProfile(user, {
    displayName: username.trim(),
    photoURL: finalPhotoURL || null
  });

  setPhotoURL(finalPhotoURL);
  setPhoto(null);
  setMessage("Profile saved successfully!");

} catch (error) {
  console.error("Profile save error:", error);
  setMessage("Error: " + error.message);
} finally {
  setLoading(false);
}

}

if (!user) {
return <div className="profile-page">Please sign in to view your profile.</div>;
}

return (
<div className="profile-page">
<h2>My Profile</h2>

  <div className="profile-photo">
    {photoURL ? (
      <img src={photoURL} alt="Profile" />
    ) : (
      <div className="empty-profile">Add Photo</div>
    )}
  </div>

  <label className="upload-button">
    Choose Profile Picture
    <input
      type="file"
      accept="image/*"
      hidden
      onChange={selectPhoto}
    />
  </label>

  <div className="profile-form">
    <label>Username</label>

    <input
      type="text"
      value={username}
      onChange={(e) => setUsername(e.target.value)}
      placeholder="Enter your username"
    />

    <label>About</label>

    <textarea
      value={about}
      onChange={(e) => setAbout(e.target.value)}
      placeholder="Tell people about yourself..."
      rows="4"
    />

    <button onClick={saveProfile} disabled={loading}>
      {loading ? "Saving..." : "Save Profile"}
    </button>

    {message && <p>{message}</p>}
  </div>
</div>

);
      }
