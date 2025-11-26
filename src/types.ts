export type TTokenResponse = {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
};

export interface TUserResponse {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
  public_flags: number;
  flags: number;
  banner: null;
  accent_color: number;
  global_name: string;
  avatar_decoration_data: null;
  collectibles: null;
  display_name_styles: null;
  banner_color: string;
  clan: null;
  primary_guild: null;
  mfa_enabled: boolean;
  locale: string;
  premium_type: number;
  email: string;
  verified: boolean;
}
