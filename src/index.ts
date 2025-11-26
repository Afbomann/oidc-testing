import { createHash, randomBytes } from "crypto";
import type { TTokenResponse, TUserResponse } from "./types";
import { sign, verify } from "jsonwebtoken";

const server = Bun.serve({
  port: Bun.env.PORT ?? 3001,
  routes: {
    "/auth/login/discord": (req) => {
      const state = randomBytes(32).toString("base64url");

      req.cookies.set("oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 120,
      });

      const codeVerifier = randomBytes(32).toString("base64url");
      const codeChallenge = createHash("sha256")
        .update(codeVerifier)
        .digest("base64url");

      req.cookies.set("oauth_code_verifier", codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 120,
      });

      const params = new URLSearchParams({
        client_id: Bun.env.DISCORD_CLIENT_ID!,
        scope: "email identify",
        response_type: "code",
        redirect_uri: Bun.env.DISCORD_CALLBACK_URL!,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      }).toString();

      return Response.redirect(
        `https://discord.com/oauth2/authorize?${params}`,
        307
      );
    },
    "/auth/callback/discord": async (req) => {
      const searchParams = new URL(req.url).searchParams;
      const error = searchParams.get("error");

      if (error) {
        return Response.json(
          { error, error_description: searchParams.get("error_description") },
          { status: 400 }
        );
      }

      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const codeVerifier = req.cookies.get("oauth_code_verifier");

      if (
        !code ||
        !state ||
        !codeVerifier ||
        state !== req.cookies.get("oauth_state")
      ) {
        return Response.json({ error: "invalid_request" }, { status: 400 });
      }

      try {
        const params = new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: Bun.env.DISCORD_CALLBACK_URL!,
          client_id: Bun.env.DISCORD_CLIENT_ID!,
          client_secret: Bun.env.DISCORD_CLIENT_SECRET!,
          code_verifier: codeVerifier,
        }).toString();

        const tokenResponse = await fetch(
          "https://discord.com/api/oauth2/token",
          {
            method: "POST",
            body: params,
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );

        if (!tokenResponse.ok) {
          return Response.json(
            { error: "token_request_failed" },
            { status: 400 }
          );
        }

        req.cookies.delete("oauth_state");
        req.cookies.delete("oauth_code_verifier");

        const tokenData = (await tokenResponse.json()) as TTokenResponse;

        try {
          const userResponse = await fetch(
            "https://discord.com/api/users/@me",
            {
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
              },
            }
          );

          if (!userResponse.ok) {
            return Response.json(
              { error: "user_info_request_failed" },
              { status: 400 }
            );
          }

          const userData = (await userResponse.json()) as TUserResponse;
          const jwt = sign(
            {
              username: userData.username,
              email: userData.email,
            },
            Bun.env.JWT_SECRET!,
            {
              expiresIn: "3m",
              algorithm: "HS256",
              audience: "oidc-testing-client",
              issuer: Bun.env.ORIGIN_URL,
              subject: userData.id,
              notBefore: "0s",
            }
          );

          req.cookies.set("session", jwt, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 180,
          });

          return Response.redirect("/me", 307);
        } catch {
          return Response.json(
            { error: "user_info_request_failed" },
            { status: 400 }
          );
        }
      } catch {
        return Response.json(
          { error: "token_exchange_failed" },
          { status: 400 }
        );
      }
    },
    "/me": (req) => {
      const session = req.cookies.get("session");

      if (!session) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }

      try {
        const decoded = verify(session, Bun.env.JWT_SECRET!, {
          algorithms: ["HS256"],
          audience: "oidc-testing-client",
          issuer: Bun.env.ORIGIN_URL,
        });

        return Response.json(decoded, { status: 200 });
      } catch {
        return Response.json({ error: "invalid_token" }, { status: 401 });
      }
    },
  },
});

console.log(`Server running on port ${server.port}`);
