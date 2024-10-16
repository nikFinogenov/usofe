const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const db = require('../models');
const { sendConfirmationEmail, sendResetEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || '1h';
const FRONTEND_URL = `${process.env.HOST}:${process.env.PORT}` || 'http://localhost:3306'

exports.register = async (req, res) => {
    try {
        const { login, email, fullName, password } = req.body;

        const existingUser = await db.User.findOne({
            where: { [Op.or]: [{ login }, { email }] },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Login or email already exists' });
        }

        const newUser = await db.User.create({
            login,
            email,
            password,
            fullName,
            role: 'user',
        });

        const confirmationToken = jwt.sign({ email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
        newUser.confirmationToken = confirmationToken;
        await newUser.save();

        const confirmationLink = `${FRONTEND_URL}/api/auth/confirm/${confirmationToken}`;
        await sendConfirmationEmail(newUser.email, confirmationLink);

        res.status(201).json({ message: 'User registered successfully, please confirm your email.' });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Registration failed' });
    }
};

exports.login = async (req, res) => {
    try {
        const { login, email, password } = req.body;

        const user = await db.User.findOne({
            where: { [Op.or]: [{ login }, { email }] },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.emailConfirmed) {
            return res.status(403).json({ error: 'Please confirm your email before logging in' });
        }

        const validPassword = user.checkPassword(password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid login credentials' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
            expiresIn: TOKEN_EXPIRATION,
        });

        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
};

exports.logout = (req, res) => {
    res.status(200).json({ message: 'Logout successful' });
};

exports.requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await db.User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'User with this email does not exist' });
        }

        const resetToken = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
        user.confirmationToken = resetToken;
        await user.save();

        const resetLink = `${FRONTEND_URL}/api/auth/password-reset/${resetToken}`;
        await sendResetEmail(user.email, resetLink);

        res.status(200).json({ message: 'Password reset link sent to email' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send reset link' });
    }
};

exports.confirmPasswordReset = async (req, res) => {
    try {
        const { confirmToken } = req.params;
        const { newPassword } = req.body;

        const decoded = jwt.verify(confirmToken, JWT_SECRET);

        const user = await db.User.findOne({ where: { email: decoded.email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.password = newPassword;
        user.confirmationToken = null;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(400).json({ error: 'Invalid or expired token' });
    }
};

exports.confirmEmail = async (req, res) => {
    try {
        const { token } = req.params;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await db.User.findOne({ where: { email: decoded.email } });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.emailConfirmed = true;
        user.confirmationToken = null;
        await user.save();

        res.status(200).json({ message: 'Email confirmed successfully' });
    } catch (error) {
        res.status(400).json({ error: 'Invalid or expired token' });
    }
};
