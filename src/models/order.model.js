const records = require('../db/records');
const { nextId } = require('../utils/ids');
records.register('orders');
async function checkout(items, customer, user) {
  return records.transaction(async () => {
    if (!Array.isArray(items) || !items.length || items.length > 50) return null;
    const quantities = new Map();
    for (const it of items) {
      if (!it || typeof it.id !== 'string' || !Number.isInteger(it.qty) || it.qty < 1 || it.qty > 100) return null;
      quantities.set(it.id, (quantities.get(it.id) || 0) + it.qty);
    }
    const lines = [], products = [];
    let total = 0;
    // Stable lock ordering avoids deadlocks for overlapping shopping carts.
    for (const [id, qty] of [...quantities].sort(([a],[b])=>a.localeCompare(b))) {
      const p = await records.get('products', id, true);
      if (!p || p.active === false || qty > 100 || (p.stock != null && p.stock < qty)) return null;
      products.push({p,qty});
      total += Math.round(p.price * 1000) * qty;
      lines.push({id:p.id,name:p.name,price:p.price,qty});
    }
    for (const {p,qty} of products) if (p.stock != null) { p.stock -= qty; await records.put('products',p); }
    const orderCustomer = { name: customer.name || user?.name || '', address: customer.address || '' };
    return records.insert('orders', {id:nextId('order','ORD-'),items:lines,total:total/1000,customer:orderCustomer,userId:user?.sub||null,ownerId:user?.sub||undefined,placedBy:user?.username||null,status:'confirmed',createdAt:new Date()});
  });
}
async function list(options) { return records.list('orders',options); }
module.exports = {checkout,list};
