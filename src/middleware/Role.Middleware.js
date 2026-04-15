import {error} from '../utils/response.js';

export const adminReq = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};
export const trainerReq = (req, res, next) => {
    if (req.user.role !== 'trainer' && req.user.role !== 'admin') {
        return error(res, 'You are not authorized to perform this action', 403);
    }
    next();
}
export const customerReq = (req, res, next) => {
    if (req.user.role !== 'customer') {
        return error(res, 'You are not authorized to perform this action', 403);
    }
    next();
}