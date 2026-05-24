import crypto from 'node:crypto';

const randomHex = crypto.randomBytes(32).toString('hex');
// Outputs a 32-character string (each byte becomes 2 hex chars)
console.log(randomHex);