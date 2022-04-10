const { Router } = require("express");
const productsRouter = require("./productRoutes");
const blogsRouter = require("./blogsRoutes");
const usersRouter = require("./userRoutes");


const router = Router();

router.use('/users',usersRouter);
router.use('/products',productsRouter);
router.use('/blogs',blogsRouter);

module.exports = router;