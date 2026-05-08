import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      displayName: string;
      emails?: { value: string }[];
    },
    done: VerifyCallback,
  ): Promise<void> {
    try {
      console.log('GoogleStrategy.validate - Processing Google profile:', {
        googleId: profile.id,
        displayName: profile.displayName,
        hasEmail: !!profile.emails?.length,
      });

      const user = await this.authService.findOrCreateGoogleUser({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value ?? null,
      });

      console.log(
        'GoogleStrategy.validate - Successfully created/found user with tokens',
      );
      done(null, user);
    } catch (err) {
      console.error('GoogleStrategy.validate - Error:', err);
      done(err as Error);
    }
  }
}
