const { where } = require('sequelize');
const db = require('../models');

exports.getAllPosts = async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;

  try {
    const offset = (page - 1) * pageSize;
    let posts;
    if (req.user.role === 'admin') {
      posts = await db.Post.findAndCountAll({
        limit: parseInt(pageSize),
        offset: parseInt(offset),
        include: ['categories', 'user'],
      });
    }
    else {
      posts = await db.Post.findAndCountAll({
        limit: parseInt(pageSize),
        offset: parseInt(offset),
        include: ['categories', 'user'],
        where: {
          status: 'active'
        }
      });
    }


    res.status(200).json({
      posts: posts.rows,
      totalPosts: posts.count,
      totalPages: Math.ceil(posts.count / pageSize),
      currentPage: parseInt(page),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve posts' });
  }
};

exports.getPost = async (req, res) => {
  try {
    const post = await db.Post.findByPk(req.params.post_id, {
      include: ['categories', 'user', 'comments'],
    });

    if (!post) return res.status(404).json({ error: 'Post not found' });

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve post' });
  }
};

exports.getRandomPost = async (req, res) => {
  try {
    const count = await db.Post.count();

    const randomIndex = Math.floor(Math.random() * count);

    const randomPost = await db.Post.findOne({ offset: randomIndex });

    if (!randomPost) {
      return res.status(404).json({ message: 'No post found' });
    }

    res.status(200).json(randomPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPostComments = async (req, res) => {
  try {
    let comments;
    if (req.user.role === 'admin') {
      comments = await db.Comment.findAll({
        where: { postId: req.params.post_id },
        include: ['user'],
      });
    }
    else {
      comments = await db.Comment.findAll({
        where: { postId: req.params.post_id, status: 'active' },
        include: ['user'],
      });
    }
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve comments' });
  }
};

exports.createComment = async (req, res) => {
  try {
    const { content } = req.body;
    const newComment = await db.Comment.create({
      content,
      userId: req.user.id,
      postId: req.params.post_id,
    });

    res.status(201).json(newComment);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create comment' });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const post = await db.Post.findByPk(req.params.post_id, {
      include: ['categories'],
    });

    if (!post) return res.status(404).json({ error: 'Post not found' });

    res.status(200).json(post.categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve categories' });
  }
};

exports.getAllLikes = async (req, res) => {
  try {
    const likes = await db.Like.findAll({
      where: { postId: req.params.post_id },
    });

    res.status(200).json(likes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve likes' });
  }
};
exports.createPost = async (req, res) => {
  try {
    const { title, content, categories } = req.body;
    const newPost = await db.Post.create({
      title,
      content,
      userId: req.user.id,
    });

    if (categories && categories.length) {
      const categoriesToAdd = await db.Category.findAll({
        where: { id: categories },
      });
      await newPost.setCategories(categoriesToAdd);
    }

    res.status(201).json(newPost);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create post' });
  }
};

exports.createLike = async (req, res) => {
  try {
    const like = await db.Like.create({
      postId: req.params.post_id,
      userId: req.user.id,
      type: 'like',
    });

    res.status(201).json(like);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add like' });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { title, content, categories, status } = req.body;
    const post = await db.Post.findByPk(req.params.post_id);

    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to update this post' });
    }

    post.title = title || post.title;
    post.content = content || post.content;
    post.status = status || post.status;

    await post.save();

    if (categories) {
      const updatedCategories = await db.Category.findAll({
        where: { id: categories },
      });
      await post.setCategories(updatedCategories);
    }

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update post' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await db.Post.findByPk(req.params.post_id);

    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }

    await post.destroy();
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
};
exports.deleteLike = async (req, res) => {
  try {
    const like = await db.Like.findOne({
      where: {
        postId: req.params.post_id,
        userId: req.user.id,
      },
    });

    if (!like) return res.status(404).json({ error: 'Like not found' });

    res.status(200).json({ message: 'Like removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove like' });
  }
};