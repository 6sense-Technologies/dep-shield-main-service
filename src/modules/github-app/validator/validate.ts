import { BadRequestException } from '@nestjs/common';

// Validate authCode
export function validateAuthCode(authCode: any): void {
  if (typeof authCode !== 'string' || authCode.trim() === '') {
    throw new BadRequestException('authCode must be a non-empty string');
  }
}

// Validate installationId
export function validateInstallationId(installationId: any): void {
  if (typeof installationId !== 'string' || !/^\d+$/.test(installationId)) {
    throw new BadRequestException('installationId must be a numeric string');
  }
}
