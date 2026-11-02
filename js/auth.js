import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
    doc,
    getDoc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Internal email domain used for username-based Firebase login.
const DOMAIN = "@kampalachat-firebaseapp.com";

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");

const message = document.getElementById("message");

function showMessage(text, color = "#ff7777") {
    if (message) {
        message.textContent = text;
        message.style.color = color;
    }
}

function normalizeUsername(value) {
    return value.trim().toLowerCase();
}

// -------------------------
// ACCOUNT REGISTRATION
// -------------------------

if (registerForm) {

    registerForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const fullName =
            document.getElementById("fullName").value.trim();

        const username = normalizeUsername(
            document.getElementById("username").value
        );

        const password =
            document.getElementById("password").value;

        const button = document.getElementById("registerBtn");

        button.disabled = true;

        let createdUser = null;

        try {

            if (fullName.length < 2) {
                throw new Error("Enter your full name.");
            }

            if (!/^[a-z0-9_]{3,20}$/.test(username)) {
                throw new Error(
                    "Username must be 3–20 characters. Use letters, numbers or underscores."
                );
            }

            if (password.length < 6) {
                throw new Error(
                    "Your password must contain at least 6 characters."
                );
            }

            showMessage("Creating your account...", "#1685ff");

            const usernameRef = doc(db, "usernames", username);

            // Check whether username is already reserved.
            const usernameSnapshot = await getDoc(usernameRef);

            if (usernameSnapshot.exists()) {
                throw new Error("That username is already taken.");
            }

            const email = username + DOMAIN;

            const credential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            createdUser = credential.user;

            // Reserve username and create profile atomically.
            await runTransaction(db, async (transaction) => {

                const userRef = doc(db, "users", createdUser.uid);

                const existingUsername =
                    await transaction.get(usernameRef);

                if (existingUsername.exists()) {
                    throw new Error("That username is already taken.");
                }

                transaction.set(usernameRef, {
                    uid: createdUser.uid,
                    username: username
                });

                transaction.set(userRef, {
                    uid: createdUser.uid,
                    fullName: fullName,
                    username: username,
                    createdAt: serverTimestamp(),
                    online: false
                });

            });

            // End the newly created session.
            await signOut(auth);

            showMessage(
                "Account created successfully! You can now log in.",
                "#35d58a"
            );

            registerForm.reset();

            setTimeout(() => {
                window.location.replace("login.html");
            }, 1200);

        } catch (error) {

            console.error("Registration error:", error);

            // Remove the Firebase Auth account if profile creation failed.
            if (createdUser) {
                try {
                    await deleteUser(createdUser);
                } catch (cleanupError) {
                    console.error("Account cleanup failed:", cleanupError);
                }
            }

            let errorText = "Registration failed. Please try again.";

            if (error.code === "auth/email-already-in-use") {
                errorText = "This username already has an account.";
            } else if (error.code === "auth/weak-password") {
                errorText = "Choose a stronger password.";
            } else if (
                error.code === "permission-denied" ||
                error.code === "firestore/permission-denied"
            ) {
                errorText = "Database permissions need to be checked.";
            } else if (error.message) {
                errorText = error.message;
            }

            showMessage(errorText);

        } finally {

            button.disabled = false;

        }

    });

}


// -------------------------
// ACCOUNT LOGIN
// -------------------------

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const username = normalizeUsername(
            document.getElementById("username").value
        );

        const password =
            document.getElementById("password").value;

        const button = document.getElementById("loginBtn");

        button.disabled = true;

        try {

            if (!/^[a-z0-9_]{3,20}$/.test(username)) {
                throw new Error("Enter a valid username.");
            }

            showMessage("Signing in...", "#1685ff");

            // Verify that this username exists.
            const usernameRef = doc(db, "usernames", username);

            const usernameSnapshot = await getDoc(usernameRef);

            if (!usernameSnapshot.exists()) {
                throw new Error("Username or password is incorrect.");
            }

            const email = username + DOMAIN;

            const credential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            // Verify that the user's profile exists.
            const userRef = doc(db, "users", credential.user.uid);

            const userSnapshot = await getDoc(userRef);

            if (!userSnapshot.exists()) {
                await signOut(auth);
                throw new Error("Your profile could not be found.");
            }

            showMessage("Login successful!", "#35d58a");

            setTimeout(() => {
                window.location.replace("people.html");
            }, 800);

        } catch (error) {

            console.error("Login error:", error);

            if (
                error.code === "auth/network-request-failed"
            ) {
                showMessage("Network error. Check your internet connection.");
            } else if (
                error.code === "permission-denied" ||
                error.code === "firestore/permission-denied"
            ) {
                showMessage("Firebase database permissions need checking.");
            } else {
                showMessage("Username or password is incorrect.");
            }

        } finally {

            button.disabled = false;

        }

    });

          }
