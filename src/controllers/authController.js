const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const logger = require('../utils/logger');

// @desc    Register a new user (with optional referral code binding)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { fullName, email, mobile, password, referralCode } = req.body;

    if (!fullName || !email || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: fullName, email, mobile, password',
      });
    }

    // Check if user with email or mobile already exists
    const userExists = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { mobile }],
    });

    if (userExists) {
      const field = userExists.email === email.toLowerCase() ? 'Email' : 'Mobile number';
      return res.status(400).json({
        success: false,
        message: `${field} is already registered.`,
      });
    }

    let referredBy = null;
    if (referralCode && referralCode.trim() !== '') {
      const cleanRefCode = referralCode.trim().toUpperCase();
      const parentUser = await User.findOne({ referralCode: cleanRefCode });

      if (!parentUser) {
        return res.status(400).json({
          success: false,
          message: `Invalid referral code: '${cleanRefCode}'. Please verify or leave blank.`,
        });
      }

      referredBy = parentUser._id;
      logger.info(`Binding new user (${email}) under parent (${parentUser.email})`);
    }

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      mobile,
      password,
      referredBy,
      role: 'user',
    });

    const token = generateToken(user._id, user.role);

    logger.info(`New user registered successfully: ${user.email} (RefCode: ${user.referralCode})`);

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        walletBalance: user.walletBalance,
        totalRoiEarned: user.totalRoiEarned,
        totalLevelIncomeEarned: user.totalLevelIncomeEarned,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    // Explicitly select password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    // STRICT ROLE ISOLATION: Admin accounts cannot log in via normal investor portal
    if (user.role === 'admin') {
      logger.warn(`Admin login attempted on standard investor route by: ${user.email}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied: Administrator accounts must log in via the dedicated Admin Portal (/admin/login).',
      });
    }

    if (user.accountStatus !== 'Active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.accountStatus}. Please contact support.`,
      });
    }

    const token = generateToken(user._id, user.role);
    logger.info(`User logged in: ${user.email} [${user.role}]`);

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        referralCode: user.referralCode,
        walletBalance: user.walletBalance,
        totalRoiEarned: user.totalRoiEarned,
        totalLevelIncomeEarned: user.totalLevelIncomeEarned,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dedicated Admin Login (Validates admin role strictly)
// @route   POST /api/auth/admin-login
// @access  Public
const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide admin email and password.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    if (user.role !== 'admin') {
      logger.warn(`Unauthorized admin login attempt by standard user: ${user.email}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not possess administrator privileges.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const token = generateToken(user._id, user.role);
    logger.info(`Admin successfully authenticated: ${user.email}`);

    res.json({
      success: true,
      message: 'Admin authentication successful!',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        referralCode: user.referralCode,
        walletBalance: user.walletBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user profile with live wallet balance
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('referredBy', 'fullName email referralCode');

    res.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        walletBalance: user.walletBalance,
        totalRoiEarned: user.totalRoiEarned,
        totalLevelIncomeEarned: user.totalLevelIncomeEarned,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  adminLogin,
  getMe,
};
