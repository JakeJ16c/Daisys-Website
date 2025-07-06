const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const corsModule = require('cors');
const Stripe = require('stripe');
const axios = require('axios');

const cors = corsModule({ origin: true });
const stripe = new Stripe(functions.config().stripe.secret, { apiVersion: '2022-11-15' });

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// 🔔 Notify on new order creation
exports.notifyOnNewOrder = functions.firestore
  .document('Orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    functions.logger.info("📦 New order received:", order);

    try {
      const snapshot = await db.collection('adminTokens').get();
      const tokens = snapshot.docs
        .map(doc => doc.data())
        .filter(data => data.categories?.orders !== false && data.token)
        .map(data => data.token);

      if (!tokens.length) return null;

      const itemSummary = order.items.map(item => `${item.qty} ${item.productName}`).join(', ');
      const totalAmount = `£${(order.finalTotal || 0).toFixed(2)}`;

      await Promise.all(tokens.map(token =>
        messaging.send({
          notification: {
            title: "New Order Recieved!",
            body: `${order.name || 'A customer'} ordered ${itemSummary} worth ${totalAmount}`,
          },
          data: {
            category: "orders",
            orderId: context.params.orderId,
            timestamp: new Date().toISOString()
          },
          token
        })
      ));
    } catch (error) {
      functions.logger.error("❌ Order notification error:", error);
    }

    return null;
  });

// 🔔 Notify on basket update
exports.notifyOnBasketUpdate = functions.firestore
  .document('BasketUpdates/{updateId}')
  .onCreate(async (snap, context) => {
    const update = snap.data();
    functions.logger.info("🛒 New basket activity:", update);

    try {
      const snapshot = await db.collection('adminTokens').get();
      const tokens = snapshot.docs
        .map(doc => doc.data())
        .filter(data => data.categories?.basket !== false && data.token)
        .map(data => data.token);

      if (!tokens.length) return null;

      const userType = update.isGuest ? "A guest" : "A customer";
      const sizeInfo = update.size && update.size.toLowerCase() !== "onesize" ? ` (Size: ${update.size})` : "";

      await Promise.all(tokens.map(token =>
        messaging.send({
          notification: {
            title: "You're So Golden",
            body: `${userType} added ${update.qty || 1} ${update.name || 'a product'}${sizeInfo} to their basket.`
          },
          data: {
            category: "basket",
            productId: update.productId || "",
            productName: update.name || "",
            timestamp: new Date().toISOString()
          },
          token
        })
      ));
    } catch (error) {
      functions.logger.error("❌ Basket notification error:", error);
    }

    return null;
  });

// 💳 Stripe checkout session creator
exports.createStripeCheckout = functions.https.onCall(async (data, context) => {
  const { items } = data;
  try {
    const line_items = items.map(item => ({
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
    functions.logger.error("❌ Stripe Checkout error:", err);
    throw new functions.https.HttpsError('internal', err.message);
  }
});

// 🔔 Notify on new user account
exports.notifyOnNewUserAccount = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const user = snap.data();
    try {
      const totalSnap = await db.collection("users").get();
      const totalUsers = totalSnap.size;

      const snapshot = await db.collection('adminTokens').get();
      const tokens = snapshot.docs
        .map(doc => doc.data())
        .filter(data => data.categories?.newacccount !== false && data.token)
        .map(data => data.token);

      if (!tokens.length) return null;

      const firstName = user.firstName || "";
      const lastName = user.lastName || "";
      const city = user.address?.city || user.city || "";

      await Promise.all(tokens.map(token =>
        messaging.send({
          notification: {
            title: "New Account Created!",
            body: `${(firstName + " " + lastName).trim() || 'A customer'} just signed up${city ? ` from ${city}` : ""}. Total users: ${totalUsers}.`
          },
          data: {
            category: "newaccount",
            timestamp: new Date().toISOString()
          },
          token
        })
      ));
    } catch (error) {
      functions.logger.error("❌ Error in notifyOnNewUserAccount:", error);
    }
    return null;
  });

// 🧹 Cleanup user data when account is deleted
exports.cleanupDeletedUsers = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  functions.logger.info(`🧹 Cleaning up data for deleted user: ${uid}`);

  try {
    await db.collection('users').doc(uid).delete();
    functions.logger.info(`✅ Deleted user data from Firestore for UID: ${uid}`);
  } catch (error) {
    functions.logger.error(`❌ Error deleting user data from Firestore for UID: ${uid}`, error);
  }

  return null;
});

// 🔔 Autocomplete Address Modal
const GOOGLE_API_KEY = functions.config().google.key;

exports.autocompleteAddress = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const input = req.query.input;

    if (!input) {
      return res.status(400).json({ error: "Missing input parameter" });
    }

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json`,
        {
          params: {
            input,
            key: GOOGLE_API_KEY,
            types: "address",
            components: "country:gb"
          }
        }
      );

      res.status(200).json(response.data);
    } catch (error) {
      console.error("Autocomplete error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
});
