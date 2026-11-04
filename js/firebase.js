import { initializeApp } from
"https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import { getAuth } from
"https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { getFirestore } from
"https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { getStorage } from
"https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
apiKey: "AIzaSyCpv3bNkmpZu94p6iBV9vTBOUv6qwWGJ8I",
authDomain: "kampl-a-chat-app.firebaseapp.com",
projectId: "kampl-a-chat-app",
storageBucket: "kampl-a-chat-app.firebasestorage.app",
messagingSenderId: "332882151772",
appId: "1:332882151772:web:2c57925e5599da3502d999",
measurementId: "G-66F1JY4RFM"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
