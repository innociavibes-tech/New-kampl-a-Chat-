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
const logoutButton = document.getElementById("logout");

function openChat(personUid) {
if (!personUid) {
message.textContent = "This account has no user ID.";
return;
}

const chatUrl = new URL("./chat.html", window.location.href);
chatUrl.searchParams.set("uid", personUid);

window.location.assign(chatUrl.href);
}

onAuthStateChanged(auth, async (user) => {
if (!user) {
window.location.assign("./login.html");
return;
}

message.textContent = "Loading people...";
peopleList.innerHTML = "";

try {
const snapshot = await getDocs(collection(db, "users"));

if (snapshot.empty) {
  message.textContent = "No registered users found.";
  return;
}

snapshot.forEach((personDoc) => {
  const person = personDoc.data();

  const personUid = person.uid || personDoc.id;
  const isMe = personUid === user.uid;

  const card = document.createElement("button");
  card.type = "button";
  card.className = "person";

  card.style.width = "100%";
  card.style.textAlign = "left";
  card.style.color = "white";
  card.style.font = "inherit";
  card.style.cursor = isMe ? "default" : "pointer";

  const avatar = document.createElement("div");
  avatar.className = "avatar";

  avatar.textContent = (
    person.fullName ||
    person.username ||
    "?"
  ).charAt(0).toUpperCase();

  const details = document.createElement("div");
  details.className = "details";

  const name = document.createElement("h3");
  name.textContent =
    person.fullName || "Kampl'a Chat User";

  const username = document.createElement("p");
  username.textContent =
    "@" + (person.username || "user");

  details.append(name, username);

  if (isMe) {
    const label = document.createElement("span");
    label.className = "you";
    label.textContent = "You";
    details.appendChild(label);
    card.disabled = true;
  } else {
    const label = document.createElement("span");
    label.className = "you";
    label.textContent = "Tap to chat";
    details.appendChild(label);

    card.addEventListener("click", () => {
      openChat(personUid);
    });
  }

  card.append(avatar, details);
  peopleList.appendChild(card);
});

message.textContent = "People on Kampl'a Chat";

} catch (error) {
console.error("People loading error:", error);
message.textContent =
"Could not load people. Please refresh and try again.";
}
});

logoutButton.addEventListener("click", async () => {
logoutButton.disabled = true;

try {
await signOut(auth);
window.location.assign("./login.html");
} catch (error) {
console.error("Logout error:", error);
logoutButton.disabled = false;
message.textContent = "Logout failed. Please try again.";
}
});
