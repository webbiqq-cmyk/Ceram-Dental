const { ok, bad } = require('../utils/respond');
const productModel = require('../models/product.model');

function create(req, res) {
  const product = productModel.addProduct(req.body || {});
  if (!product) return bad(res, 'A name and a valid price are required.');
  ok(res, { product });
}

function update(req, res) {
  const product = productModel.updateProduct(req.params.id, req.body || {});
  if (!product) return bad(res, 'Unknown product.');
  ok(res, { product });
}

function remove(req, res) {
  const done = productModel.deleteProduct(req.params.id);
  if (!done) return bad(res, 'Unknown product.');
  ok(res);
}

module.exports = { create, update, remove };
