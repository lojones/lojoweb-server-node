function getJwtPayload(subject: string, expiryMinutes: number): Record<string, unknown> {
    const now = new Date()
    const expiry = new Date(now.getTime() + expiryMinutes * 60000)
    return {
        sub: subject,
        iat: now.getTime() / 1000,
        exp: expiry.getTime() / 1000,
    }
}

module.exports = {getJwtPayload}