const functions = require("firebase-functions");
const admin = require("firebase-admin");

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
          const message = {
            notification: {
              title: "New Order Received!",
              body: `From ${order.name || 'a customer'}`,
            },
            data: {
              category: "orders",
              orderId: context.params.orderId,
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
          const message = {
            notification: {
              title: "You\'re So Golden",
              body: `Someone added ${update.qty || 1} ${update.name || 'a product'} to their basket.`,
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
