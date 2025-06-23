const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require('stripe')(functions.config().stripe.secret);

admin.initializeApp();

// 🔔 Notify on new order creation
exports.notifyOnNewOrder = functions.firestore
  .document("Orders/{orderId}")
  .onCreate(async (snap, context) => {
    const order = snap.data();
    console.log("📦 New order received:", JSON.stringify(order));

    try {
      const snapshot = await admin.firestore().collection('adminTokens').get();
      if (snapshot.empty) {
        console.log("❌ No admin tokens found.");
        return null;
      }

      const tokens = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.categories?.orders !== false && data.token) {
          tokens.push(data.token);
        }
      });

      if (tokens.length === 0) {
        console.log("❌ No eligible tokens.");
        return null;
      }

      for (const token of tokens) {
        const itemSummary = order.items.map(item => `${item.qty} ${item.productName}`).join(', ');
        const totalAmount = `£${(order.finalTotal || 0).toFixed(2)}`;

        const message = {
          notification: {
            title: "New Order Recieved!",
            body: `${order.name || 'A customer'} ordered ${itemSummary} worth ${totalAmount}`,
          },
          data: {
            category: "orders",
            orderId: context.params.orderId,
            timestamp: new Date().toISOString()
          },
          token: token
        };

        try {
          const response = await admin.messaging().send(message);
          console.log(`✅ Sent to token: ${token.substring(0, 10)}...`);
        } catch (error) {
          console.error(`❌ Error sending to token: ${token.substring(0, 10)}...`, error.message || error);
        }
      }
    } catch (error) {
      console.error("❌ Order notification error:", error.message || error);
    }

    return null;
  });


// 🔔 Notify on basket update
exports.notifyOnBasketUpdate = functions.firestore
  .document("BasketUpdates/{updateId}")
  .onCreate(async (snap, context) => {
    const update = snap.data();
    console.log("🛒 New basket activity:", JSON.stringify(update));

    try {
      const snapshot = await admin.firestore().collection('adminTokens').get();
      if (snapshot.empty) {
        console.log("❌ No admin tokens.");
        return null;
      }

      const tokens = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.categories?.basket !== false && data.token) {
          tokens.push(data.token);
        }
      });

      if (tokens.length === 0) {
        console.log("❌ No eligible tokens.");
        return null;
      }

      for (const token of tokens) {
        const sizeInfo = update.size ? ` (Size: ${update.size})` : "";
        const message = {
          notification: {
            title: "You're So Golden",
            body: `Someone added ${update.qty || 1} ${update.name || 'a product'}${sizeInfo} to their basket.`,
          },
          data: {
            category: "basket",
            productId: update.productId || "",
            productName: update.name || "",
            timestamp: new Date().toISOString()
          },
          token: token
        };

        try {
          const response = await admin.messaging().send(message);
          console.log(`✅ Basket notif sent to token: ${token.substring(0, 10)}...`);
        } catch (error) {
          console.error(`❌ Error sending basket notif:`, error.message || error);
        }
      }
    } catch (error) {
      console.error("❌ Basket notification error:", error.message || error);
    }

    return null;
  });


// 💳 Stripe checkout session creator
exports.createStripeCheckout = functions.https.onCall(async (data, context) => {
  try {
    const line_items = data.items.map(item => ({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: item.name + (item.size ? ` (${item.size})` : ''),
          images: item.image ? [item.image] : [],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.qty,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      success_url: 'https://jakej16c.github.io/Daisys-Website/success.html',
      cancel_url: 'https://jakej16c.github.io/Daisys-Website/cancel.html',
    });

    return { url: session.url };
  } catch (err) {
    console.error("❌ Stripe Checkout error:", err.message);
    throw new functions.https.HttpsError('internal', err.message);
  }
});


// 🔔 Notify on new account creation (now with city support)
exports.notifyOnNewUserAccount = functions.firestore
  .document("AdminNotifications/{notifId}")
  .onCreate(async (snap, context) => {
    const notif = snap.data();

    if (notif.type !== 'new_account') {
      console.log("ℹ️ Not a new_account notification.");
      return null;
    }

    try {
      const snapshot = await admin.firestore().collection('adminTokens').get();
      if (snapshot.empty) {
        console.log("❌ No admin tokens.");
        return null;
      }

      const tokens = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.categories?.reviews !== false && data.token) {
          tokens.push(data.token);
        }
      });

      if (tokens.length === 0) {
        console.log("❌ No eligible tokens.");
        return null;
      }

      for (const token of tokens) {
        const firstName = notif.firstName || "";
        const lastName = notif.lastName || "";
        const city = notif.city || "";

        const message = {
          notification: {
            title: "New Account Created!",
            body: `${(firstName + " " + lastName).trim() || 'A customer'} just signed up${city ? ` from ${city}` : ""}. Total users: ${notif.userCount || '?'}.`,
          },
          data: {
            category: "reviews",
            timestamp: new Date().toISOString()
          },
          token: token
        };

        try {
          const response = await admin.messaging().send(message);
          console.log(`✅ New user notif sent to token: ${token.substring(0, 10)}...`, response);
        } catch (error) {
          console.error(`❌ Error sending user notif to ${token.substring(0, 10)}:`, error.message || error);
        }
      }
    } catch (error) {
      console.error("❌ Error notifying new user registration:", error.message || error);
    }

    return null;
  });
