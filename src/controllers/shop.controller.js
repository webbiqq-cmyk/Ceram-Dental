const { ok, bad } = require('../utils/respond');
const orderModel = require('../models/order.model');
const notificationModel = require('../models/notification.model');

function checkout(req, res) {
  const { items, customer } = req.body || {};
  if (!items || !items.length) return bad(res, 'Your cart is empty.');
  const order = orderModel.checkout(items, customer || {});
  if (!order) return bad(res, 'Could not place that order.');
  notificationModel.notify('admin', { type: 'order-new', title: 'New shop order', body: order.id + ' — ' + (order.customer.name || 'Guest'), relatedId: order.id });
  ok(res, { order });
}

module.exports = { checkout };
