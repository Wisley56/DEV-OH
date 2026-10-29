import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@devoh/protocol';
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Clock, IdGenerator } from '../application/ports.js';

@Injectable()
export class CryptoIdGenerator implements IdGenerator {
  roomCode() {
    return Array.from(randomBytes(ROOM_CODE_LENGTH), (b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join('');
  }
  token() {
    return randomBytes(18).toString('base64url');
  }
}

@Injectable()
export class SystemClock implements Clock {
  now() {
    return Date.now();
  }
}
