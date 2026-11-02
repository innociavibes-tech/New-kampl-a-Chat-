import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const peopleList = document.getElementById("peopleList");
const message = document.getElementById("message");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    message.textContent = "Loading people...";

    const snapshot = await getDocs(collection(db, "users"));

    peopleList.innerHTML = "";

    if (snapshot.empty) {
      message.textContent = "No registered users found.";
      return;
    }

    snapshot.forEach((personDoc) => {
      const person = personDoc.data();
      const isMe = person.uid === user.uid;

      const card = document.createElement("div");
      card.className = "person";

      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent =
        (person.fullName || person.username || "?")
          .charAt(0).toUpperCase();

      const details = document.createElement("div");
      details.className = "details";

      const name = document.createElement("h3");
      name.textContent = person.fullName || "Kampl'a Chat User";

      const username = document.createElement("p");
      username.textContent = "@" + (person.username || "user");

      details.append(name, username);

      if (isMe) {
        const label = document.createElement("span");
        label.className = "you";
        label.textContent = "You";
        details.appendChild(label);
      } else {
        card.style.cursor = "pointer";

        card.addEventListener("click", () => {
          window.location.href =
            "chat.html?uid=" + encodeURIComponent(person.uid);
        });
      }

      card.append(avatar, details);
      peopleList.appendChild(card);
    });

    message.textContent = "People on Kampl'a Chat";

  } catch (error) {
    console.error(error);
    message.textContent = "Could not load people.";
  }
});

document.getElementById("logout").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});
