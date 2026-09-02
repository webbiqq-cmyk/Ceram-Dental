const { nextId } = require('../utils/ids');
const productModel = require('./product.model');

const orders = [];

function checkout(items, customer) {
  let total = 0;
  const lines = [];
  for (const it of items) {
    const p = productModel.products.find(x => x.id === it.id);
    if (!p) continue;
    const qty = Math.max(1, Number(it.qty) || 1);
    total += p.price * qty;
    lines.push({ id: p.id, name: p.name, price: p.price, qty });
  }
  if (!lines.length) return null;
  const order = {
    id: nextId('order', 'ORD-'), items: lines, total: Math.round(total * 100) / 100,
    customer, status: 'confirmed', createdAt: new Date()
  };
  orders.unshift(order);
  return order;
}

module.exports = { orders, checkout };
