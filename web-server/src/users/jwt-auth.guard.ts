import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { UsersService } from './users.service';
import { IS_PUBLIC_KEY } from 'src/common/decorator/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const http = context.switchToHttp();
    const { url, headers } = http.getRequest<Request>();

    const authorization = headers['authorization'];
    if (!authorization || authorization === 'Bearer undefined') {
      if (isPublic) {
        return true;
      } else {
        throw new UnauthorizedException('Invalid token');
      }
    }
    if (!authorization.includes('Bearer')) {
      if (isPublic) {
        return true;
      } else {
        throw new UnauthorizedException('Bearer token is required');
      }
    }

    const token = /Bearer\s(.+)/.exec(authorization)[1];
    if (!token) {
      if (isPublic) {
        return true;
      } else {
        throw new UnauthorizedException('JWT token is required');
      }
    }

    const decoded = this.jwtService.decode(token);
    if (
      !decoded ||
      (url !== '/users/refresh' && decoded['tokenType'] === 'refresh')
    ) {
      const error = new UnauthorizedException('accessToken is required');
      console.log(error.message, error.stack);
      if (isPublic) {
        return true;
      } else {
        throw error;
      }
    }

    return super.canActivate(context);
  }
}
