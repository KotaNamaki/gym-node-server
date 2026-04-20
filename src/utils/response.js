// src/utils/response.js
export const success = (res, data, message, status = 200) => {
    console.log('[Util] success response sent:', message);
    // Convert BigInt values to numbers recursively
    const sanitizedData = JSON.parse(
        JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? Number(value) : value
        )
    );

    return res.status(status).json({success: true, data: sanitizedData, message})
};

export const error = (res, message, status = 400) => {
    console.log('[Util] error response sent:', message, status);
    return res.status(status).json({ success: false, message })
}