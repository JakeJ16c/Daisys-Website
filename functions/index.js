// ✅ Correctly import functions and admin
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// ✅ Initialize admin SDK
admin.initializeApp();

// ✅ This Cloud Function runs when a new order is created in Firestore
exports.notifyOnNewOrder = functions.firestore
  .document("Orders/{orderId}") // 🔁 Adjust path if needed
  .onCreate((snap, context) => {
    const orderData = snap.data();
    console.log("📦 New Order Received:", orderData);

    // Future logic to send notification could go here

    return null;
  });
