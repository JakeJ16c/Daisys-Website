const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require('stripe')(functions.config().stripe.secret);

admin.initializeApp();

exports.notifyOnNewOrder = functions.firestore
  .document("Orders/{orderId}")
  .onCreate(async (snap, context) => {
    const order = snap.data();
    console.log("📦 New order received:", JSON.stringify(order));

    try {
      // 🔄 Get ALL admin tokens
      const snapshot = await admin.firestore().collection('adminTokens').get();
      
      if (snapshot.empty) {
        console.log("❌ No admin tokens found in collection.");
        return null;
      }

      console.log(`✅ Found ${snapshot.docs.length} admin token documents`);
      
      // Extract tokens and filter out any that have orders category disabled
      const tokens = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`📝 Processing token document: ${doc.id}`, data);
        
        // Only include tokens where orders category is not explicitly false
        if (data.categories?.orders !== false) {
          if (data.token) {
            tokens.push(data.token);
            console.log(`✅ Added token to notification list: ${data.token.substring(0, 10)}...`);
          } else {
            console.log(`❌ Document ${doc.id} has no token field`);
          }
        } else {
          console.log(`❌ Token has orders notifications disabled`);
        }
      });

      if (tokens.length === 0) {
        console.log("❌ No eligible admin tokens found after filtering.");
        return null;
      }

      console.log(`✅ Sending notification to ${tokens.length} devices`);

      // Send to each token individually instead of using multicast
      for (const token of tokens) {
        try {

          // Format item summary string
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
          
          const response = await admin.messaging().send(message);
          console.log(`✅ Notification sent successfully to token: ${token.substring(0, 10)}...`, response);
        } catch (error) {
          console.error(`❌ Error sending to token ${token.substring(0, 10)}...`, error.message || error);
          // Continue with other tokens even if one fails
        }
      }
    } catch (error) {
      console.error("❌ Error in notification process:", error.message || error);
    }

    return null;
  });

exports.notifyOnBasketUpdate = functions.firestore
  .document("BasketUpdates/{updateId}")
  .onCreate(async (snap, context) => {
    const update = snap.data();
    console.log("🛒 New basket activity:", JSON.stringify(update));

    try {
      // 🔄 Get ALL admin tokens
      const snapshot = await admin.firestore().collection('adminTokens').get();
      
      if (snapshot.empty) {
        console.log("❌ No admin tokens found in collection.");
        return null;
      }

      console.log(`✅ Found ${snapshot.docs.length} admin token documents`);
      
      // Extract tokens and filter out any that have basket category disabled
      const tokens = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`📝 Processing token document: ${doc.id}`, data);
        
        // Only include tokens where basket category is not explicitly false
        if (data.categories?.basket !== false) {
          if (data.token) {
            tokens.push(data.token);
            console.log(`✅ Added token to notification list: ${data.token.substring(0, 10)}...`);
          } else {
            console.log(`❌ Document ${doc.id} has no token field`);
          }
        } else {
          console.log(`❌ Token has basket notifications disabled`);
        }
      });

      if (tokens.length === 0) {
        console.log("❌ No eligible admin tokens found after filtering.");
        return null;
      }

      console.log(`✅ Sending notification to ${tokens.length} devices`);

      // Send to each token individually instead of using multicast
      for (const token of tokens) {
        try {
          const sizeInfo = update.size ? ` (Size: ${update.size})` : "";
          const message = {
            notification: {
              title: "You\'re So Golden",
              body: `Someone added ${update.qty || 1} ${update.name || 'a product'} ${sizeInfo} to their basket.`,
            },
            data: {
              category: "basket",
              productId: update.productId || "",
              productName: update.name || "",
              timestamp: new Date().toISOString()
            },
            token: token // Send to one token at a time
          };
          
          const response = await admin.messaging().send(message);
          console.log(`✅ Notification sent successfully to token: ${token.substring(0, 10)}...`, response);
        } catch (error) {
          console.error(`❌ Error sending to token ${token.substring(0, 10)}...`, error.message || error);
          // Continue with other tokens even if one fails
        }
      }
    } catch (error) {
      console.error("❌ Error in notification process:", error.message || error);
    }

    return null;
  });

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

exports.notifyOnNewUserAccount = functions.firestore
  .document("AdminNotifications/{notifId}")
  .onCreate(async (snap, context) => {
    const notif = snap.data();

    if (notif.type !== 'new_account') {
      console.log("ℹ️ Skipping notification: type is not 'new_account'");
      return null;
    }

    console.log("👤 New user registered:", notif);

    try {
      const snapshot = await admin.firestore().collection('adminTokens').get();

      if (snapshot.empty) {
        console.log("❌ No admin tokens found.");
        return null;
      }

      const tokens = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();

        if (data.categories?.reviews !== false && data.token) {
          tokens.push(data.token);
          console.log(`✅ Token added: ${data.token.substring(0, 10)}...`);
        } else {
          console.log(`⛔ Skipped token ${doc.id}`);
        }
      });

      if (tokens.length === 0) {
        console.log("❌ No eligible tokens after filtering.");
        return null;
      }

      for (const token of tokens) {
      // Extract values from the notification document
      const firstName = notif.firstName || "";
      const lastName = notif.lastName || "";
      const city = notif.city || ""; // ✅ Extract city safely (optional fallback)
    
      // Construct the notification message
      const message = {
        notification: {
          title: "New Account Created!",
          body: `${(firstName + " " + lastName).trim() || 'A customer'} just signed up${city ? ` from ${city}` : ""}. Total users: ${notif.userCount || '?'}.`,
        },
        data: {
          category: "reviews", // ✅ This lets frontend toggle based on category
          timestamp: new Date().toISOString()
        },
        token: token
      };
    
      try {
        // Send the message to the individual device token
        const response = await admin.messaging().send(message);
        console.log(`✅ Notification sent to token: ${token.substring(0, 10)}...`, response);
      } catch (error) {
        console.error(`❌ Error sending to token ${token.substring(0, 10)}...`, error.message || error);
        // Continue loop to try other tokens even if one fails
      }
    }
      
    return null;
  });
