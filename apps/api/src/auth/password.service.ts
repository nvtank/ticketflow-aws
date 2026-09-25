import { BadRequestException, Injectable } from '@nestjs/common';
import { compare, hash, hashSync } from 'bcryptjs';

@Injectable()
export class PasswordService {
  private readonly dummyHash = hashSync('never-a-user-password', 12);

  validate(password: string): void {
    if (Array.from(password).length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new BadRequestException('Mật khẩu cần ít nhất 12 ký tự và tối đa 72 byte UTF-8.');
    }
  }

  async hash(password: string): Promise<string> {
    this.validate(password);
    return hash(password, 12);
  }

  async verify(password: string, passwordHash?: string): Promise<boolean> {
    // bcrypt silently truncates beyond 72 bytes; never allow such aliases.
    if (Buffer.byteLength(password, 'utf8') > 72) return false;
    return compare(password, passwordHash ?? this.dummyHash);
  }
}
