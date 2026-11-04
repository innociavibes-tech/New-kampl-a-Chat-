import { auth, db } from "./firebase.js";

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
collection,
query,
where,
getDocs,
doc,
getDoc,
orderBy,
limit
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const chatsList = document.getElementById("chatsList");
const message = document.getElementById("message");

onAuthStateChanged(auth, async user => {
if (!user) {
window.location.href = "login.html";
return;
}

try {
message.textContent = "Loading conversations...";

const conversationsQuery = query(
  collection(db, "conversations"),
  where("participants", "array-contains", user.uid)
);

const conversationsSnapshot = await getDocs(conversationsQuery);

chatsList.innerHTML = "";

if (conversationsSnapshot.empty) {
  message.textContent = "No conversations yet. Visit Home to find people.";
  return;
}

const conversations = [];

for (const conversationDoc of conversationsSnapshot.docs) {
  const data = conversationDoc.data();

  const otherUid = (data.participants || [])
    .find(uid => uid !== user.uid);

  if (!otherUid) continue;

  const profileSnapshot = await getDoc(
    doc(db, "users", otherUid)
  );

  if (!profileSnapshot.exists()) continue;

  const profile = profileSnapshot.data();

  const messagesQuery = query(
    collection(
      db,
      "conversations",
      conversationDoc.id,
      "messages"
    ),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  const messagesSnapshot = await getDocs(messagesQuery);

  let lastText = "No messages yet";
  let lastTime = 0;

  if (!messagesSnapshot.empty) {
    const lastMessage = messagesSnapshot.docs[0].data();
    lastText = lastMessage.text || "Message";

    if (lastMessage.createdAt?.toMillis) {
      lastTime = lastMessage.createdAt.toMillis();
    }
  }

  conversations.push({
    uid: otherUid,
    name: profile.fullName || profile.username || "User",
    username: profile.username || "",
    lastText,
    lastTime
  });
}

conversations.sort((a, b) => b.lastTime - a.lastTime);

if (conversations.length === 0) {
  message.textContent = "No conversations yet.";
  return;
}

message.textContent = "";

conversations.forEach(person => {
  const card = document.createElement("div");
  card.className = "conversation";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = person.name.charAt(0).toUpperCase();

  const details = document.createElement("div");
  details.className = "details";

  const name = document.createElement("h3");
  name.textContent = person.name;

  const preview = document.createElement("p");
  preview.textContent = person.lastText;

  details.append(name, preview);
  card.append(avatar, details);

  card.addEventListener("click", () => {
    window.location.href =
      "chat.html?uid=" + encodeURIComponent(person.uid);
  });

  chatsList.appendChild(card);
});

} catch (error) {
console.error("Chats loading error:", error);
message.textContent = "Could not load chats: " + error.message;
}
});
