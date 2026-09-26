const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();

exports.notifyAdminOnOrder = onDocumentCreated('orders/{orderId}', async (event) => {
  const order = event.data?.data();
  if (!order) return;

  const snap = await db.collection('adminDevices').get();
  const tokens = snap.docs.map(d => d.data().token).filter(Boolean);
  if (!tokens.length) return;

  const name = order.customer?.name || 'Customer';
  const amount = Number(order.amount || 0).toLocaleString('en-IN');
  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: {
      title: 'Harshiyaan Collections — ORDER RECEIVED!',
      body: `${order.id || event.params.orderId} • ${name} • ₹${amount}`
    },
    data: { orderId: order.id || event.params.orderId, type: 'NEW_ORDER' },
    webpush: {
      notification: {
        title: '🔔 ORDER RECEIVED!',
        body: `${name} placed an order • ₹${amount}`,
        tag: 'harshiyaan-order',
        requireInteraction: true
      }
    }
  });

  // Remove invalid/expired tokens so future notifications stay clean.
  const removals = [];
  response.responses.forEach((r, i) => {
    if (!r.success && ['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(r.error?.code)) {
      removals.push(snap.docs.find(d => d.data().token === tokens[i])?.ref);
    }
  });
  await Promise.all(removals.filter(Boolean).map(ref => ref.delete()));
});
