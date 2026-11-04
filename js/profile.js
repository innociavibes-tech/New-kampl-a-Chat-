import React, { useEffect, useState } from "react";
import {
  getAuth,
  updateProfile
} from "firebase/auth";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

import "./Profile.css";

export default function Profile() {
  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  const user = auth.currentUser;

  const [username, setUsername] = useState("");
  const [about, setAbout] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;

    async function loadProfile() {
      try {
        const profileRef = doc(db, "users", user.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data = profileSnap.data();
          setUsername(data.username || user.displayName || "");
          setAbout(data.about || "");
          setPhotoURL(data.photoURL || "");
        } else {
          setUsername(user.displayName || "");
          setPhotoURL(user.photoURL || "");
        }
      } catch (error) {
        console.error(error);
        setMessage("Could not load profile.");
      }
    }

    loadProfile();
  }, [user]);

  async function saveProfile() {
    if (!user) {
      setMessage("Please sign in first.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      let imageURL = photoURL;

      if (photo) {
        const imageRef = ref(
          storage,
          `profilePictures/${user.uid}/${Date.now()}`
        );

        await uploadBytes(imageRef, photo);
        imageURL = await getDownloadURL(imageRef);
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          username,
          about,
          photoURL: imageURL,
          uid: user.uid
        },
        { merge: true }
      );

      await updateProfile(user, {
        displayName: username,
        photoURL: imageURL || null
      });

      setPhotoURL(imageURL);
      setPhoto(null);
      setMessage("Profile updated successfully!");
    } catch (error) {
      console.error(error);
      setMessage("Failed to update profile. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return <p>Please sign in to view your profile.</p>;
  }

  return (
    <div className="profile-page">
      <h2>My Profile</h2>

      <div className="profile-photo">
        {photoURL && (
          <img src={photoURL} alt="Profile" />
        )}
      </div>

      <label className="upload-button">
        Change Profile Picture
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            if (e.target.files[0]) {
              setPhoto(e.target.files[0]);
              setPhotoURL(URL.createObjectURL(e.target.files[0]));
            }
          }}
        />
      </label>

      <div className="profile-form">
        <label>Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
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
