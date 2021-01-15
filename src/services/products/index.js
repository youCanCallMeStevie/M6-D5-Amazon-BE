const express = require("express");
const mongoose = require("mongoose");
const ProductModel = require("./schema");
const q2m = require("query-to-mongo");

const productsRouter = express.Router();

const multer = require("multer");
const cloudinary = require("../cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "Strive Products",
  },
});

const cloudinaryMulter = multer({ storage: storage });

productsRouter.post(
  "/",
  cloudinaryMulter.single("image"),
  async (req, res, next) => {
    try {
      const newProduct = new ProductModel(req.body);
      newProduct.imageUrl = req.file.path;
      const { _id } = await newProduct.save();
      res.status(201).send(_id);
    } catch (error) {
      next(error);
    }
  }
);

productsRouter.get("/", async (req, res, next) => {
  try {
    // const products = await ProductModel.find();
    // res.status(201).send(products);

    const query = q2m(req.query);
    const total = await ProductModel.countDocuments(query.criteria);
    const products = await ProductModel.find(query.criteria)
      .sort(query.options.sort)
      .skip(query.options.skip)
      .limit(query.options.limit);

    res.status(201).send({ links: query.links("/products", total), products });
  } catch (error) {
    next(error);
  }
});

productsRouter.get("/:productId", async (req, res, next) => {
  try {
    const product = await ProductModel.findById(req.params.productId);
    if (product) {
      res.status(201).send(product);
    } else {
      let error = new Error("PRODUCT NOT FOUND");
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    const err = new Error();
    if (error.name == "CastError") {
      err.message = "Product Not Found";
      err.httpStatusCode = 404;
      next(err);
    } else {
      next(error);
    }
  }
});

productsRouter.put("/:productId", async (req, res, next) => {
  try {
    let product = await ProductModel.findById(req.params.productId);
    console.log(product);
    if (product) {
      let modifiedProduct = await ProductModel.findByIdAndUpdate(
        req.params.productId,
        req.body,
        {
          runValidators: true,
          new: true,
          useFindAndModify: false,
        }
      );
      if (modifiedProduct) {
        res.status(200).send(modifiedProduct);
      } else {
        next();
      }
    } else {
      let error = new Error("PRODUCT NOT FOUND");
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    const err = new Error();
    if (error.name == "CastError") {
      err.message = "Product Not Found";
      err.httpStatusCode = 404;
      next(err);
    } else {
      next(error);
    }
  }
});

productsRouter.delete("/:productId", async (req, res, next) => {
  try {
    const product = await ProductModel.findById(req.params.productId);
    if (product) {
      const { _id } = await ProductModel.findByIdAndDelete(
        req.params.productId
      );
      if (_id) {
        res.status(200).send(`${_id} deleted`);
      } else {
        next();
      }
    } else {
      let error = new Error("PRODUCT NOT FOUND");
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    next(error);
  }
});

productsRouter.get("/:productId/reviews", async (req, res, next) => {
  try {
    const id = req.params.productId;
    const { reviews } = await ProductModel.findById(id, {
      reviews: 1,
      _id: 0,
    });
    res.status(201).send(reviews);
  } catch (error) {
    console.log("Error with getting all reviews route: ", error);
    res.status(500).json({ success: false, errors: "Internal Server Error" });
    next(error);
  }
});

productsRouter.post("/:productId/reviews", async (req, res, next) => {
  try {
    const newReview = { ...req.body, createdAt: new Date() };
    console.log(newReview);
    const productId = req.params.productId;
    console.log(req.body);
    const { _id } = await ProductModel.findByIdAndUpdate(
      productId,
      {
        $push: {
          reviews: newReview,
        },
      },
      { runValidators: true, new: true }
    );
    res.status(201).json({ success: true, reviewAdded: _id });
  } catch (error) {
    console.log("Error with posting review route: ", error);
    res.status(500).json({ success: false, errors: "Internal Server Error" });
    next(error);
  }
});

productsRouter.get("/:productId/reviews/:reviewId", async (req, res, next) => {
  try {
    const { productId, reviewId } = req.params;
    const { reviews } = await ProductModel.findOne(
      {
        _id: mongoose.Types.ObjectId(productId),
      },
      {
        _id: 0,
        reviews: {
          $elemMatch: { _id: mongoose.Types.ObjectId(reviewId) },
        },
      }
    );
    if (reviews && reviews.length > 0) {
      res.status(201).send(reviews[0]);
    } else {
      const error = new Error(
        `Review with id ${mongoose.Types.ObjectId(reviewId)} not found`
      );
      res.status(404).json({ success: false, errors: error });
      next(error);
    }
  } catch (error) {
    console.log("Error with getting specific review route: ", error);
    res.status(500).json({ success: false, errors: "Internal Server Error" });
    next(error);
  }
});

productsRouter.put("/:productId/reviews/:reviewId", async (req, res, next) => {
  try {
    const { productId, reviewId } = req.params;

    const { reviews } = await ProductModel.findOne(
      {
        _id: mongoose.Types.ObjectId(productId),
      },
      {
        _id: 0,
        reviews: {
          $elemMatch: { _id: mongoose.Types.ObjectId(reviewId) },
        },
      }
    );
    if (reviews && reviews.length > 0) {
      const oldReview = reviews[0].toObject();
      const modifiedReview = { ...oldReview, ...req.body };
      await ProductModel.findOneAndUpdate(
        {
          _id: mongoose.Types.ObjectId(productId),
          "reviews._id": mongoose.Types.ObjectId(reviewId),
        },
        { $set: { "reviews.$": modifiedReview } },
        {
          runValidators: true,
          new: true,
        }
      );
      res.status(201).json({ success: true, data: modifiedReview });
    } else {
      const error = new Error(`Review with id ${reviewId} not found`);
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    console.log("Error with editing review route: ", error);
    res.status(500).json({ success: false, errors: "Internal Server Error" });
    next(error);
  }
});

productsRouter.delete(
  "/:productId/reviews/:reviewId",
  async (req, res, next) => {
    try {
      const { productId, reviewId } = req.params;

      const modifiedProduct = await ProductModel.findByIdAndUpdate(
        productId,
        {
          $pull: {
            reviews: { _id: mongoose.Types.ObjectId(reviewId) },
          },
        },
        {
          runValidators: true,
          new: true,
        }
      );
      if (modifiedProduct) {
        res.status(201).json({ success: true, data: "Review deleted" });
      } else {
        const error = new Error(`Review with id ${reviewId} not found`);
        res.status(404).json({ success: false, errors: error });
        next(error);
      }
    } catch (error) {
      console.log("Error with deleting review route: ", error);
      res.status(500).json({ success: false, errors: "Internal Server Error" });
      next(error);
    }
  }
);

module.exports = productsRouter;
