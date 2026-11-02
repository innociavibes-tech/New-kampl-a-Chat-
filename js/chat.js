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
  writeBatch,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const messagesBox = document.getElementById("messages");
const emptyMessage = document.getElementById("empty");
const input = document.getElementById("messageInput");
const form = document.getElementById("composer");
const sendButton = document.getElementById("sendButton");
const statusText = document.getElementById("status");

const params = new URLSearchParams(window.location.search);
const otherUid = params.get("uid");

let currentUser = null;
let conversationId = null;
let sending = false;
let unsubscribeMessages = null;

document.getElementById("back").addEventListener("click", () => {
  window.location.href = "people.html";
});

function showError(message) {
  statusText.textContent = message;
}

function displayMessage(data) {
  const bubble = document.createElement("div");

  bubble.className =
    "bubble " +
    (data.senderId === currentUser.uid ? "sent" : "received");

  const text = document.createElement("div
