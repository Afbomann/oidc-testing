# oidc-testing (oauth actually)

Was gonna test OIDC and chose discord as the provider. Originally it was gonna be OIDC but discord doesn't have a openid scope.

Technically it's just OAuth since there is no openid scope and verification of a id token. (only authorization)

(thats why i don't use "nonce" parameter since there is no id token)^

With google for example you could use a openid scope and it would be true OIDC (OpenID Connect)

I've specifically focused on implementing this securely with "state" and "code challenge" (pkce)

## Env variables:

`NODE_ENV` - set to "production" in production so cookies are only available over HTTPS

`PORT` - port to run server

`ORIGIN_URL` - your origin url

`DISCORD_CLIENT_ID` - client id from discord

`DISCORD_CLIENT_SECRET` - secret from discord

`DISCORD_CALLBACK_URL` - url to your callback endpoint

`JWT_SECRET` - must be 32 bytes (256 bits)

Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Hex is not required. Can be Base64 for example too

## Readiness for production

The OAuth flow itself is usable in production but my internal session/auth system with a jwt is only to simulate when you are logged in. For production, make a auth/session system with access/refresh-tokens, csrf protection, rotation, etc.
