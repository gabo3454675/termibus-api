import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { AuthUser, JwtPayload, buildAuthContext } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser | null> {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) return null;
    if (user.token_version !== payload.tokenVersion) return null;

    const membership = await this.authService.getMembership(
      user.id,
      payload.orgId,
    );
    if (!membership) return null;

    const assignment = await this.authService.getTerminalAssignment(
      membership.id,
    );

    return buildAuthContext(user, membership, assignment);
  }
}
