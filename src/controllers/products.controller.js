const { ok, bad } = require('../utils/respond');
const productModel = require('../models/product.model');
const { logAction } = require('../utils/audit');

function create(req, res) {
  const product = productModel.addProduct(req.body || {});
  if (!product) return bad(res, 'A name and a valid price are required.');
  logAction(req, 'product:create', product.name);
  ok(res, { product });
}

function update(req, res) {
  const product = productModel.updateProduct(req.params.id, req.body || {});
  if (!product) return bad(res, 'Unknown product.');
  logAction(req, 'product:update', product.name);
  ok(res, { product });
}

function remove(req, res) {
  const done = productModel.deleteProduct(req.params.id);
  if (!done) return bad(res, 'Unknown product.');
  logAction(req, 'product:delete', req.params.id);
  ok(res);
}

module.exports = { create, update, remove };
