import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const hashPassword = (plainPassword: string): Promise<string> => {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export const verifyPassword = (
    plainPassword: string,
    hashedPassword: string
): Promise<boolean> => {
    return bcrypt.compare(plainPassword, hashedPassword);
}