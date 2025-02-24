import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsStrongPassword,
  Matches,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({
    description: 'The name of the user',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty({ message: 'Name should not be empty' })
  @Matches(/^[A-Za-z\s]+$/, {
    message: 'Name can only contain letters and spaces',
  })
  name: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'johndoe@example.com',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({
    description:
      'The password for the user account, must meet strong password criteria',
    example: 'StrongP@ssw0rd!',
  })
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minSymbols: 1,
    },
    {
      message:
        'Invalid password format.Password mustbe 8 character long and must contain minimum one uppercase,lowercase and special symbol',
    },
  )
  password: string;
}

export class LoginDto {
  @ApiProperty({
    description: 'The email address of the user',
    example: 'johndoe@example.com',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({
    description: 'The password of the user',
    example: 'StrongP@ssw0rd!',
  })
  @IsString()
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minSymbols: 1,
    },
    {
      message: 'Invalid password format.',
    },
  )
  password: string;
}

export class GithubTokenDTO {
  @ApiProperty({
    description: 'Github access token',
    example: 'Some valid access token',
  })
  @IsString()
  @IsNotEmpty({ message: 'Github token should not be empty' })
  accessToken: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    description: 'The email verification token',
    example: 'abc123xyz',
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Token should not be empty' })
  token: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'user@example.com',
    type: String,
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email should not be empty' })
  email: string;
}
export class EmailDTO {
  @ApiProperty({
    description: 'The email address of the user',
    example: 'user@example.com',
    type: String,
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email should not be empty' })
  email: string;
}
