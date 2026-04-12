import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: {
    email: string;
    password: string;
    fullName: string;
    businessName: string;
    phone?: string;
  }) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.usersService.createOwner(dto);
    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      access_token: token,
      user: this.usersService.toPublicProfile(user),
    };
  }

  async registerCustomer(dto: { email: string; password: string; fullName: string }) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.usersService.createCustomer(dto);
    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      access_token: token,
      user: this.usersService.toPublicProfile(user),
    };
  }

  async login(email: string, password: string) {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.disabledAt) {
      throw new UnauthorizedException('Account is disabled');
    }
    const ok = await this.usersService.validatePassword(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      access_token: token,
      user: this.usersService.toPublicProfile(user),
    };
  }
}
