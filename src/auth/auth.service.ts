import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Usuario } from '../entities/usuario.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.usuarioRepo.findOne({
      where: { username: username.toLowerCase(), activo: true },
    });
    if (!user) throw new UnauthorizedException('Usuario o contraseña incorrectos');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Usuario o contraseña incorrectos');

    const payload = {
      sub: user.id,
      username: user.username,
      rol: user.rol,
      terminal_id: user.terminal_id,
      conductor_id: user.conductor_id,
      token_version: user.token_version,
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: user.id,
        username: user.username,
        rol: user.rol,
        nombre_completo: user.nombre_completo,
        terminal_id: user.terminal_id,
        conductor_id: user.conductor_id,
      },
    };
  }

  async validateUser(userId: string) {
    return this.usuarioRepo.findOne({ where: { id: userId, activo: true } });
  }
}
