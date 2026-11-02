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

const params = new URLSearchParams(location.search);
const otherUid = params.get("uid");

let currentUser = null;
let conversationId = null;
let sending = false;
let unsubscribeMessages = null;

function showStatus(text) {
  statusText.textContent = text;
}

function showError(error) {
  console.error(error);
  showStatus("Error: " + error.message);
}

document.getElementById("back").onclick = () => {
  location.href = "people.html";
};

function showMessage(data) {
  const bubble = document.createElement("div");

  bubble.className =
    "bubble " +
    (data.senderId === currentUser.uid ? "sent" : "received");

  const text = document.createElement("div");
  text.textContent = data.text;

  const time = document.createElement("span");
  time.className = "time";

  if (data.createdAt?.toDate) {
    time.textContent =
      data.createdAt.toDate().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
  } else {
    time.textContent = "Sending...";
  }

  bubble.append(text, time);
  messagesBox.appendChild(bubble);
}

async function startChat() {
  if (!otherUid) {
    throw new Error("No account was selected.");
  }

  if (otherUid === currentUser.uid) {
    throw new Error("You cannot chat with yourself.");
  }

  showStatus("Loading profile...");

  const userRef = doc(db, "users", otherUid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    throw new Error("This user's profile was not found.");
  }

  const otherUser = userSnapshot.data();

  document.getElementById("personName").textContent =
    otherUser.fullName || "Kampl'a Chat User";

  document.getElementById("personUsername").textContent =
    "@" + (otherUser.username || "user");

  const participants = [currentUser.uid, otherUid].sort();

  conversationId = participants.join("_");

  const conversationRef = doc(
    db,
    "conversations",
    conversationId
  );

  showStatus("Opening conversation...");

  const conversationSnapshot = await getDoc(conversationRef);

  if (!conversationSnapshot.exists()) {
    await setDoc(conversationRef, {
      participants: participants,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } else {
    const saved = conversationSnapshot.data().participants || [];

    if (
      saved.length !== 2 ||
      !participants.every(id => saved.includes(id))
    ) {
      throw new Error("Conversation participants do not match.");
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

  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

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
          showMessage(messageDoc.data());
        });
      }

      messagesBox.scrollTop = messagesBox.scrollHeight;
      showStatus("Connected");
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

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  currentUser = user;

  try {
    await startChat();
  } catch (error) {
    showError(error);
  }
});

window.addEventListener("beforeunload", () => {
  if (unsubscribeMessages) {
    unsubscribeMessages();
  }
});
