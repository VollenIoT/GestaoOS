import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, isBcryptHash } from '../routes/auth';

describe('Server Auth & Password Hashing', () => {
  it('gera hash bcrypt válido', async () => {
    const plain = 'admin123';
    const hash = await hashPassword(plain);
    expect(isBcryptHash(hash)).toBe(true);
  });

  it('verifica senha correta com hash bcrypt', async () => {
    const plain = 'senhaSegura123';
    const hash = await hashPassword(plain);
    const isValid = await verifyPassword(plain, hash);
    expect(isValid).toBe(true);
  });

  it('rejeita senha incorreta com hash bcrypt', async () => {
    const plain = 'senhaSegura123';
    const hash = await hashPassword(plain);
    const isValid = await verifyPassword('senhaErrada', hash);
    expect(isValid).toBe(false);
  });

  it('suporta verificação com hash SHA-256 legado', async () => {
    // SHA-256 de '1234' = 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
    const legacySha256 = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
    const isValid = await verifyPassword('1234', legacySha256);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('wrong', legacySha256);
    expect(isInvalid).toBe(false);
  });
});
