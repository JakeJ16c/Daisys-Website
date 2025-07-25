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

      const itemSummary = order.items.map(item => `${item.qty} ${item.name}`).join(', ');
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
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(data => data.categories?.basket !== false && data.token);

      if (!tokens.length) return null;

      const message = {
        notification: {
          title: "You're So Golden",
          body: `${update.isGuest ? "A guest" : "A customer"} added ${update.qty || 1} ${update.name || 'a product'}${update.size && update.size.toLowerCase() !== 'onesize' ? ` (Size: ${update.size})` : ''} to their basket.`
        },
        data: {
          category: "basket",
          productId: update.productId || "",
          productName: update.name || "",
          timestamp: new Date().toISOString()
        }
      };

      const sendResults = await Promise.all(tokens.map(t =>
        messaging.send({ ...message, token: t.token })
          .then(() => ({ success: true }))
          .catch(err => ({ success: false, error: err, tokenId: t.id }))
      ));

      // 🔥 Remove any invalid tokens
      const toDelete = sendResults.filter(r =>
        !r.success && r.error?.code === "messaging/registration-token-not-registered"
      );

      await Promise.all(toDelete.map(t => {
        functions.logger.warn("🧹 Removing invalid token:", t.tokenId);
        return db.collection('adminTokens').doc(t.tokenId).delete();
      }));

    } catch (error) {
      functions.logger.error("❌ Basket notification error:", error);
    }

    return null;
  });

// 💳 Stripe checkout Embedded
exports.createStripePaymentIntent = functions.https.onCall(async (data, context) => {
  const { items, customerEmail } = data;

  try {
    const amount = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const amountInPence = Math.round(amount * 100); // GBP uses pence

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: 'gbp',
      receipt_email: customerEmail || undefined,
      automatic_payment_methods: { enabled: true },
    });

    return {
      clientSecret: paymentIntent.client_secret
    };
  } catch (error) {
    console.error("❌ PaymentIntent error:", error);
    throw new functions.https.HttpsError("internal", error.message);
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

      const predictions = response.data.predictions || [];

      // ✅ Return only the necessary array
      const simplified = predictions.map((p) => ({
        description: p.description,
        place_id: p.place_id,
      }));

      // 🔍 Add full log of what Google returned
      console.log("📦 Google response:", JSON.stringify(response.data));

      res.status(200).json({ predictions: simplified });
    } catch (error) {
      console.error("Autocomplete error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
});

// 📍 Resolve full address from Google Place ID
exports.resolvePlaceId = functions.https.onCall(async (data, context) => {
  const placeId = data.placeId;

  if (!placeId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing placeId");
  }

  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json`,
      {
        params: {
          place_id: placeId,
          key: GOOGLE_API_KEY,
          fields: "address_component",
        },
      }
    );

    const components = response.data.result.address_components || [];

    const getComponent = (type) =>
      components.find((c) => c.types.includes(type))?.long_name || "";

    return {
      houseNumber: getComponent("street_number"),
      street: getComponent("route"),
      city: getComponent("postal_town") || getComponent("locality"),
      county: getComponent("administrative_area_level_2") || getComponent("administrative_area_level_1"),
      postcode: getComponent("postal_code"),
    };
  } catch (error) {
    console.error("Place ID resolution error:", error);
    throw new functions.https.HttpsError("internal", "Failed to resolve address from Place ID");
  }
});
