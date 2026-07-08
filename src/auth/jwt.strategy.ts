import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

export interface JwtPayload {
  sub: string;
  username: string;
  rol: string;
  terminal_id: string | null;
  conductor_id: string | null;
  token_version: number;
}

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

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) return null;

    // Verificar token_version para permitir revocación de tokens
    if (user.token_version !== payload.token_version) return null;

    return {
      id: user.id,
      username: user.username,
      rol: user.rol,
      nombre_completo: user.nombre_completo,
      terminal_id: user.terminal_id,
      conductor_id: user.conductor_id,
    };
  }
}
