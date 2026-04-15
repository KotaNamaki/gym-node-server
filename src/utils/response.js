export const success = (res, data, message, status = 200) => {
    return res.status(status).json({success: true, data, message})
};

export const error = (res, message, status = 400) => {
    return res.status(status).json({ success: false, message })
}