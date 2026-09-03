const crypto = require('crypto');
function hashPassword(pw) {
    const salt = ':AcY_2026';
    const hash = crypto.createHash('sha256').update(pw + salt).digest('hex');
    return 'sha256$' + hash;
}
console.log(hashPassword('123456'));
