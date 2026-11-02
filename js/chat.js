import { auth, db } from "./firebase.js";

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
doc,
getDoc,
setDoc,
collection,
query,
orderBy,
onSnapshot,
addDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const messagesBox = document.getElementById("messages");
const input = document.getElementById("messageInput");
const form = document.getElementById("composer");
const sendButton = document.getElementById("sendButton");
const statusText = document.getElementById("status");

const personName = document.getElementById("personName");
const personUsername = document.getElementById("personUsername");

const params = new URLSearchParams(window.location.search);
const otherUid = params.get("uid");

let currentUser = null;
let conversationId = null;
let unsubscribeMessages = null;
let sending = false;

function setStatus(text) {
statusText.textContent = text;
}

function showError(error) {
console.error("Kampl'a Chat error:", error);
setStatus("Error: " + (error.message || "Something went wrong."));
}

function displayMessage(data) {
const bubble = document.createElement("div");

bubble.className =
"bubble " +
(data.senderId === currentUser.uid ? "sent" : "received");

const text = document.createElement("div");
text.textContent = data.text || "";

const time = document.createElement("span");
time.className = "time";

if (data.createdAt && data.createdAt.toDate) {
time.textContent = data.createdAt.toDate().toLocaleTimeString([], {
hour: "2-digit",
minute: "2-digit"
});
} else {
time.textContent = "Sending...";
}

bubble.append(text, time);
messagesBox.appendChild(bubble);
}

async function initializeChat() {
if (!otherUid) {
throw new Error("No account was selected.");
}

if (otherUid === currentUser.uid) {
throw new Error("You cannot chat with your own account.");
}

setStatus("Loading profile...");

const profileRef = doc(db, "users", otherUid);
const profileSnapshot = await getDoc(profileRef);

if (!profileSnapshot.exists()) {
throw new Error("The selected account does not exist.");
}

const profile = profileSnapshot.data();

personName.textContent =
profile.fullName || "Kampl'a Chat User";

personUsername.textContent =
"@" + (profile.username || "user");

const participants = [currentUser.uid, otherUid].sort();

conversationId = participants.join("_");

const conversationRef = doc(
db,
"conversations",
conversationId
);

setStatus("Opening conversation...");

const conversationSnapshot = await getDoc(conversationRef);

if (!conversationSnapshot.exists()) {
await setDoc(conversationRef, {
participants: participants,
createdAt: serverTimestamp(),
updatedAt: serverTimestamp()
});
} else {
const savedParticipants =
conversationSnapshot.data().participants || [];

if (
  savedParticipants.length !== 2 ||
  !participants.every(id => savedParticipants.includes(id))
) {
  throw new Error("Conversation verification failed.");
}

}

const messagesRef = collection(
db,
"conversations",
conversationId,
"messages"
);

const messagesQuery = query(
messagesRef,
orderBy("createdAt", "asc")
);

unsubscribeMessages = onSnapshot(
messagesQuery,

snapshot => {
  messagesBox.innerHTML = "";

  if (snapshot.empty) {
    const empty = document.createElement("p");
    empty.id = "empty";
    empty.textContent = "No messages yet. Say hello!";
    messagesBox.appendChild(empty);
  } else {
    snapshot.forEach(messageDoc => {
      displayMessage(messageDoc.data());
    });
  }

  messagesBox.scrollTop = messagesBox.scrollHeight;
  setStatus("Connected");
},

error => {
  showError(error);
}

);
}

form.addEventListener("submit", async event => {
event.preventDefault();

const messageText = input.value.trim();

if (!messageText || !conversationId || sending) {
return;
}

sending = true;
sendButton.disabled = true;

try {
const messagesRef = collection(
db,
"conversations",
conversationId,
"messages"
);

await addDoc(messagesRef, {
  senderId: currentUser.uid,
  text: messageText,
  createdAt: serverTimestamp()
});

input.value = "";
input.focus();

} catch (error) {
showError(error);
} finally {
sending = false;
sendButton.disabled = false;
}
});

document.getElementById("back").addEventListener("click", () => {
window.location.href = "people.html";
});

onAuthStateChanged(auth, async user => {
if (!user) {
window.location.href = "login.html";
return;
}

currentUser = user;

try {
await initializeChat();
} catch (error) {
showError(error);
}
});

window.addEventListener("beforeunload", () => {
if (unsubscribeMessages) {
unsubscribeMessages();
}
});
