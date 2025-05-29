const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.notifyOnNewOrder = functions.firestore
  .document("Orders/{orderId}")
  .onCreate(async (snap, context) => {
    const order = snap.data();

    // Log order for debug
    console.log("Order:", JSON.stringify(order));

    // 🔍 Get admin token
    const tokenSnap = await admin.firestore().doc("adminTokens/admin").get();

    if (!tokenSnap.exists) {
      console.error("❌ No adminTokens/admin document found.");
      return null;
    }

    const token = tokenSnap.data()?.token;
    console.log("📬 Admin token found:", token);

    if (!token) {
      console.error("❌ Token field missing in admin document.");
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
      console.log("✅ Notification sent successfully:", response);
    } catch (error) {
      console.error("❌ Error sending notification:", error);
    }

    return null;
  });

