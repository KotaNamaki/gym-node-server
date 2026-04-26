import NodeCache from 'node-cache';

// stdTTL is the default time-to-live in seconds (e.g., 600 seconds = 10 minutes)
// checkperiod is the interval in seconds to check for expired keys
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

export default cache;
