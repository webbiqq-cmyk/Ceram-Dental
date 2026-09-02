const { ok, bad } = require('../utils/respond');
const orderModel = require('../models/order.model');

function checkout(req, res) {
  const { items, customer } = req.body || {};
  if (!items || !items.length) return bad(res, 'Your cart is empty.');
  const order = orderModel.checkout(items, customer || {});
  if (!order) return bad(res, 'Could not place that order.');
  ok(res, { order });
}

module.exports = { checkout };
