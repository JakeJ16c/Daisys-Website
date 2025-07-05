import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { onUserDeleted } from 'firebase-functions/v2/auth';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import fetch from 'node-fetch';
import corsModule from 'cors';
import Stripe from 'stripe';

const cors = corsModule({ origin: true });
const stripe = new Stripe(functions.config().stripe.secret, { apiVersion: '2022-11-15' });

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// 🔔 Notify on new order creation
export const notifyOnNewOrder = onDocumentCreated('Orders/{orderId}', async (event) => {
  const order = event.data.data();
  logger.info("📦 New order received:", order);

  try {
    const snapshot = await db.collection('adminTokens').get();
    const tokens = snapshot.docs
      .map(doc => doc.data())
      .filter(data => data.categories?.orders !== false && data.token)
      .map(data => data.token);

    if (!tokens.length) return null;

    const itemSummary = order.items.map(item => `${item.qty} ${item.productName}`).join(', ');
    const totalAmount = `£${(order.finalTotal || 0).toFixed(2)}`;

    await Promise.all(tokens.map(token => messaging.send({
      notification: {
        title: "New Order Recieved!",
        body: `${order.name || 'A customer'} ordered ${itemSummary} worth ${totalAmount}`,
      },
      data: {
        category: "orders",
        orderId: event.params.orderId,
        timestamp: new Date().toISOString()
      },
      token
    })));
  } catch (error) {
    logger.error("❌ Order notification error:", error);
  }

  return null;
});

// 🔔 Notify on basket update
export const notifyOnBasketUpdate = onDocumentCreated('BasketUpdates/{updateId}', async (event) => {
  const update = event.data.data();
  logger.info("🛒 New basket activity:", update);

  try {
    const snapshot = await db.collection('adminTokens').get();
    const tokens = snapshot.docs
      .map(doc => doc.data())
      .filter(data => data.categories?.basket !== false && data.token)
      .map(data => data.token);

    if (!tokens.length) return null;

    const userType = update.isGuest ? "A guest" : "A customer";
    const sizeInfo = update.size && update.size.toLowerCase() !== "onesize" ? ` (Size: ${update.size})` : "";

    await Promise.all(tokens.map(token => messaging.send({
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
    })));
  } catch (error) {
    logger.error("❌ Basket notification error:", error);
  }

  return null;
});

// 💳 Stripe checkout session creator
export const createStripeCheckout = onCall(async (request) => {
  const { items } = request.data;
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
    logger.error("❌ Stripe Checkout error:", err);
    throw new functions.https.HttpsError('internal', err.message);
  }
});

// 🔔 Notify on new account creation
export const notifyOnNewUserAccount = onDocumentCreated('users/{userId}', async (event) => {
  const user = event.data.data();
  try {
    const totalSnap = await db.collection("users").get();
    const totalUsers = totalSnap.size;

    const snapshot = await db.collection('adminTokens').get();
    const tokens = snapshot.docs
      .map(doc => doc.data())
      .filter(data => data.categories?.reviews !== false && data.token)
      .map(data => data.token);

    if (!tokens.length) return null;

    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const city = user.address?.city || user.city || "";

    await Promise.all(tokens.map(token => messaging.send({
      notification: {
        title: "New Account Created!",
        body: `${(firstName + " " + lastName).trim() || 'A customer'} just signed up${city ? ` from ${city}` : ""}. Total users: ${totalUsers}.`
      },
      data: {
        category: "accounts",
        timestamp: new Date().toISOString()
      },
      token
    })));
  } catch (error) {
    logger.error("❌ Error in notifyOnNewUserAccount:", error);
  }
  return null;
});

// 🧹 Cleanup user data when account is deleted
export const cleanupDeletedUsers = onUserDeleted(async (event) => {
  const uid = event.uid;
  logger.info(`🧹 Cleaning up data for deleted user: ${uid}`);

  try {
    await db.collection('users').doc(uid).delete();
    logger.info(`✅ Deleted user data from Firestore for UID: ${uid}`);
  } catch (error) {
    logger.error(`❌ Error deleting user data from Firestore for UID: ${uid}`, error);
  }

  return null;
});
