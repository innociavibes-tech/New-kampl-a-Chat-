import React, { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import "./Profile.css";

const CLOUD_NAME = "n7w3vwhg";
const UPLOAD_PRESET = "Kampl'a Chat";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [about, setAbout] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setMessage("Please sign in first.");
        return;
      }

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
        console.error("Profile loading error:", error);
        setMessage("Could not load profile: " + error.message);
      }
    });

    return () => unsubscribe();
  }, []);

  function selectPhoto(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Image must be smaller than 5 MB.");
      return;
    }

    setPhoto(file);

    const previewURL = URL.createObjectURL(file);
    setPreview(previewURL);
    setMessage("Picture selected. Press Save Profile to upload it.");
  }

  async function saveProfile(event) {
    event.preventDefault();

    if (!user) {
      setMessage("Please sign in first.");
      return;
    }

    if (!username.trim()) {
      setMessage("Please enter your username.");
      return;
    }

    setLoading(true);
    setMessage("Saving your profile...");

    try {
      let finalPhotoURL = photoURL;

      // Upload picture to Cloudinary
      if (photo) {
        const formData = new FormData();

        formData.append("file", photo);
        formData.append("upload_preset", UPLOAD_PRESET);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          {
            method: "POST",
            body: formData
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error?.message || "Cloudinary image upload failed."
          );
        }

        finalPhotoURL = result.secure_url;
      }

      // Save profile information in Firestore
      const profileRef = doc(db, "users", user.uid);

      await setDoc(
        profileRef,
        {
          uid: user.uid,
          username: username.trim(),
          about: about.trim(),
          photoURL: finalPhotoURL,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      // Update Firebase authentication profile
      try {
        await updateProfile(user, {
          displayName: username.trim(),
          photoURL: finalPhotoURL || null
        });
      } catch (authError) {
        console.error("Authentication profile update:", authError);
      }

      setPhotoURL(finalPhotoURL);
      setPhoto(null);
      setPreview("");

      setMessage("SUCCESS! Your profile has been saved.");

    } catch (error) {
      console.error("SAVE PROFILE ERROR:", error);

      setMessage("FAILED: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="profile-page">
        Please sign in to view your profile.
      </div>
    );
  }

  return (
    <div className="profile-page">

      <h2>My Profile</h2>
      <p className="profile-subtitle">
        Manage your Kampl'a Chat account
      </p>

      <div className="profile-photo">
        {(preview || photoURL) ? (
          <img
            src={preview || photoURL}
            alt="Profile"
          />
        ) : (
          <span className="empty-profile">
            Add Photo
          </span>
        )}
      </div>

      <label className="upload-button">
        Choose Picture From Phone

        <input
          type="file"
          accept="image/*"
          hidden
          onChange={selectPhoto}
        />
      </label>

      <form
        className="profile-form"
        onSubmit={saveProfile}
      >

        <label>Username</label>

        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required
        />

        <label>About</label>

        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="Tell people about yourself..."
          rows="4"
        />

        <button
          type="submit"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>

        {message && (
          <div className="profile-message">
            {message}
          </div>
        )}

      </form>

    </div>
  );
            }
