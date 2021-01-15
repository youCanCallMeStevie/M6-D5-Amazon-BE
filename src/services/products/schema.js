const { Schema, model } = require("mongoose");
const ProductSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: { type: String, required: true },
    brand: { type: String, required: true },
    imageUrl: { type: String, required: true  },
    price: { type: Number, required: true },
    category: { type: String },
    reviews: [
      {
        comment: { type: String, required: true },
        rate: { type: Number, required: true, min: 1, max: 5 },
        createdAt: { type: Date },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const ProductModel = model("Product", ProductSchema);
module.exports = ProductModel;
