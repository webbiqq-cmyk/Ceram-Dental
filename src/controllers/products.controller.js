const { ok, bad } = require('../utils/respond');
const productModel = require('../models/product.model');
const { logAction } = require('../utils/audit');

async function create(req, res) {
  const product = await productModel.addProduct(req.body || {});
  if (!product) return bad(res, 'A name and a valid price are required.');
  await logAction(req, 'product:create', product.name);
  ok(res, { product });
}

async function update(req, res) {
  const product = await productModel.updateProduct(req.params.id, req.body || {});
  if (!product) return bad(res, 'Unknown product.');
  await logAction(req, 'product:update', product.name);
  ok(res, { product });
}

async function remove(req, res) {
  const done = await productModel.deleteProduct(req.params.id);
  if (!done) return bad(res, 'Unknown product.');
  await logAction(req, 'product:delete', req.params.id);
  ok(res);
}

module.exports = { create, update, remove };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
