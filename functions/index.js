// Updated Cloud Function for basket notifications with category filtering
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.notifyOnNewOrder = functions.firestore
  .document("Orders/{orderId}")
  .onCreate(async (snap, context) => {
    const order = snap.data();
    console.log("📦 New order received:", JSON.stringify(order));

    // Get admin token
    const tokenSnap = await admin.firestore().doc("adminTokens/admin").get();

    if (!tokenSnap.exists) {
      console.error("❌ No adminTokens/admin document found.");
      return null;
    }

    const token = tokenSnap.data()?.token;
    console.log("📬 Retrieved token:", token);

    if (!token) {
      console.error("❌ Token field is missing.");
      return null;
    }

    // Check if admin has enabled this notification category
    const categories = tokenSnap.data()?.categories || {};
    if (categories.orders === false) {
      console.log("❌ Admin has disabled order notifications.");
      return null;
    }

    const message = {
      notification: {
        title: "New Order Received!",
        body: `From ${order.name}`,
      },
      data: {
        category: "orders",
        orderId: context.params.orderId,
        timestamp: new Date().toISOString()
      },
      token: token,
    };

    try {
      const response = await admin.messaging().send(message);
      console.log("✅ Notification sent successfully:", response);
    } catch (error) {
      console.error("❌ Error sending notification:", error.message || error);
    }

    return null;
  });

exports.notifyOnBasketUpdate = functions.firestore
  .document("BasketUpdates/{updateId}")
  .onCreate(async (snap, context) => {
    const update = snap.data();
    console.log("🛒 New basket activity:", JSON.stringify(update));

    const tokenSnap = await admin.firestore().doc("adminTokens/admin").get();
    if (!tokenSnap.exists) {
      console.error("❌ No adminTokens/admin document found.");
      return null;
    }

    const token = tokenSnap.data()?.token;
    console.log("📬 Retrieved token:", token);

    if (!token) {
      console.error("❌ Token field is missing.");
      return null;
    }

    // Check if admin has enabled this notification category
    const categories = tokenSnap.data()?.categories || {};
    if (categories.basket === false) {
      console.log("❌ Admin has disabled basket notifications.");
      return null;
    }

    const message = {
      notification: {
        title: "Basket Updated",
        body: `${update.name} added ${update.qty}x to their basket.`,
      },
      data: {
        category: "basket",
        productId: update.productId || "",
        productName: update.name || "",
        timestamp: new Date().toISOString()
      },
      token: token,
    };

    try {
      const response = await admin.messaging().send(message);
      console.log("✅ Basket notification sent:", response);
    } catch (error) {
      console.error("❌ Error sending basket notification:", error.message || error);
    }

    return null;
  });
