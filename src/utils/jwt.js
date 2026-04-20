import jwt from 'jsonwebtoken';

export const generateToken = (payload) => {
    console.log('[Util] generateToken called for:', payload.email);
    return jwt.sign(payload, process.env.JWT_SECRET,{
        expiresIn: '7d'
        })
}

export const verifyToken = (token) => {
    console.log('[Util] verifyToken called');
    return jwt.verify(token, process.env.JWT_SECRET);
}
