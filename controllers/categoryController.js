const db = require('../models');

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await db.Category.findAll();
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve categories' });
    }
};

exports.getCategory = async (req, res) => {
    try {
        const category = await db.Category.findByPk(req.params.category_id);
        if (!category) return res.status(404).json({ error: 'Category not found' });

        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve category' });
    }
};

exports.getCategoryPosts = async (req, res) => {
    try {
        const category = await db.Category.findByPk(req.params.category_id, {
            include: [{
                model: db.Post,
                as: 'posts',
                through: {attributes: []}
            }],
        });
        if (!category) return res.status(404).json({ error: 'Category not found' });

        res.status(200).json(category.posts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve posts for category' });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });

        const newCategory = await db.Category.create({ title, description });
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create category' });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { title, description } = req.body;
        const category = await db.Category.findByPk(req.params.category_id);

        if (!category) return res.status(404).json({ error: 'Category not found' });

        category.title = title || category.title;
        category.description = description || category.description;
        await category.save();

        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update category' });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const category = await db.Category.findByPk(req.params.category_id);
        if (!category) return res.status(404).json({ error: 'Category not found' });

        await category.destroy();
        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
};