const { ok, bad } = require('../utils/respond');
const orderModel = require('../models/order.model');
const notificationModel = require('../models/notification.model');

async function checkout(req, res) {
  const { items, customer } = req.body || {};
  if (!items || !items.length) return bad(res, 'Your cart is empty.');
  const order = await orderModel.checkout(items, customer || {}, req.user);
  if (!order) return bad(res, 'Could not place that order.');
  await notificationModel.notify('admin', { type: 'order-new', title: 'New shop order', body: order.id + ' — ' + (order.customer.name || 'Account'), relatedId: order.id });
  ok(res, { order });
}

module.exports = { checkout };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
