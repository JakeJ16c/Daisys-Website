const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.notifyOnNewOrder = functions.firestore
  .document("Orders/{orderId}")
  .onCreate(async (snap, context) => {
    const order = snap.data();

    // Get admin token from Firestore
    const tokenSnap = await admin.firestore().doc("adminTokens/admin").get();
    const token = tokenSnap.data()?.token;

    if (!token) {
      console.log("No token found for admin.");
      return null;
    }

    const message = {
      notification: {
        title: "New Order Received!",
        body: `From ${order.name}`,
      },
      token: token,
    };

    try {
      const response = await admin.messaging().send(message);
      console.log("Notification sent successfully:", response);
    } catch (error) {
      console.error("Error sending notification:", error);
    }

    return null;
  });
